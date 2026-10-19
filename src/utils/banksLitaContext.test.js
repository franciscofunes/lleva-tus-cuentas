import { buildBanksLitaContext } from './banksLitaContext';

test('LITA banks context includes only owner-financial summaries, never bank identities or credentials', () => {
  const context = buildBanksLitaContext({
    banks: [{id:'b1', code:'b1', name:'Banco Ciudad', active:true}],
    accounts: [{id:'account-secret', bankId:'b1',name:'Caja ARS',type:'caja_ahorro',
      currency:'ARS',balance:123.45, cbu:'0290038410000030306593',
      alias:'private-alias',holderTaxId:'20-35324183-5',accountNumber:'123456'}],
    cards: [{id:'card-secret',bankId:'b1',nickname:'Visa',brand:'Visa',lastFour:'4555',
      closingDay:29,dueDay:13,statementSnapshot:{
        lastStatementARS:220356.4,currentConsumptionARS:59245.69,asOf:'2026-10-15',
        cbu:'SHOULD-NOT-LEAK'}}],
    charges: [{cardId:'card-secret',merchant:'Comercio',purchaseDate:'2026-10-14',currency:'ARS',amount:200,installments:1}],
    statements:[{expenseId:'hidden-id'}],links:[],
  });
  expect(context.scope).toBe('banks-current-state');
  expect(context.totalsByCurrency).toEqual({ARS:123.45,USD:0});
  expect(context.accountCount).toBe(1);
  expect(context.cardCount).toBe(1);
  expect(context.unlinkedStatementCount).toBe(1);
  expect(context.cards[0].referenceSnapshot.lastStatementARS).toBe(220356.4);
  expect(context.recentManualCharges[0].countedInCashFlow).toBe(false);
  const json=JSON.stringify(context);
  ['account-secret','card-secret','0290038410000030306593','private-alias',
   '20-35324183-5','123456','4555','SHOULD-NOT-LEAK'].forEach((s)=>expect(json).not.toContain(s));
});
test('do not infer amounts or expose unrelated banks and invalid numbers',()=>{
  const context=buildBanksLitaContext({
    banks:[{code:'mine',name:'My bank',active:true},{code:'inactive',name:'Old bank',active:false}],
    accounts:[{bankId:'mine',currency:'USD',balance:'10.25',name:'Savings'},
      {bankId:'inactive',currency:'ARS',balance:9999,name:'Ignore'}],
    cards:[{bankId:'mine',nickname:'Mastercard',statementSnapshot:{lastStatementARS:'',lastStatementUSD:'NaN'}}]
  });
  expect(context.totalsByCurrency).toEqual({ARS:0,USD:10.25});
  expect(context.banks).toHaveLength(1);
  expect(context.cards[0].referenceSnapshot).toEqual({});
});

test('Lita banks context includes monthly high/low and proposed limits, never raw IDs',()=>{
  const context=buildBanksLitaContext({
    banks:[{code:'bank-secret',name:'Banco X',active:true}],
    cards:[{id:'card-private',bankId:'bank-secret',nickname:'Visa',brand:'Visa',closingDay:20,dueDay:8}],
    history:[{month:'2026-08',currency:'ARS',total:5000,statementCount:1},
      {month:'2026-09',currency:'ARS',total:3000,statementCount:2}],
    manualSpend:{ARS:2100,USD:0,month:'2026-10'},
    budgets:[{currency:'ARS',enabled:true,limit:2500,warnPercent:80}],
  });
  const ars=context.monthlyCardSpending.byCurrency.find(v=>v.currency==='ARS');
  expect(ars.highest).toEqual({month:'2026-08',amount:5000});
  expect(ars.lowest).toEqual({month:'2026-09',amount:3000});
  expect(ars.userBudget.status).toBe('warning');
  expect(JSON.stringify(context)).not.toContain('card-private');
  expect(JSON.stringify(context)).not.toContain('bank-secret');
});
