import {statementMonthlyHistory,statementMonthExtremes,cardMonthManualSpending,cardCycleDates,budgetStatus,historicalPeakStatus} from './cardSpendingInsights';
const cards=[{id:'a',bankId:'city',closingDay:25,dueDay:10},{id:'b',bankId:'santander',closingDay:28,dueDay:12}];
const statements=[
 {expenseId:'e1',approvedByUser:true,closingDate:'2026-08-25',period:'2026-08',purchases:{ARS:'100.00',USD:'10.00'},totals:{ARS:'145.00',USD:'10.00'}},
 {expenseId:'e2',approvedByUser:true,closingDate:'2026-08-28',period:'2026-08',purchases:{ARS:'250.00',USD:'0.00'}},
 {expenseId:'e3',approvedByUser:true,closingDate:'2026-09-25',period:'2026-09',purchases:{ARS:'80.00',USD:'15.00'}},
 {expenseId:'unlinked',approvedByUser:true,closingDate:'2026-09-25',period:'2026-09',purchases:{ARS:'50000.00',USD:'0.00'}}
];
const links=[{expenseId:'e1',cardId:'a'},{expenseId:'e2',cardId:'b'},{expenseId:'e3',cardId:'a'}];
test('canonical reviewed linked statements aggregate across banks by month, but not taxes, manual purchases or unlinked PDFs',()=>{
 const h=statementMonthlyHistory([...statements,statements[0]],links,cards);
 expect(h.find(x=>x.month==='2026-08'&&x.currency==='ARS').total).toBe(350);
 expect(h.find(x=>x.month==='2026-08'&&x.currency==='USD').total).toBe(10);
 expect(h.find(x=>x.month==='2026-09'&&x.currency==='ARS').total).toBe(80);
 expect(h).toHaveLength(4);
 const ars=statementMonthExtremes(h,'ARS');
 expect(ars.high.month).toBe('2026-08');
 expect(ars.low.month).toBe('2026-09');
 expect(ars.suggestedLimit).toBe(193.5);
});
test('missing history does not pretend month with no PDF means zero spending',()=>{
 expect(statementMonthExtremes([],'ARS').high).toBeNull();
 expect(statementMonthlyHistory([{...statements[0],approvedByUser:false}],links,cards)).toEqual([]);
});
test('manual spend excludes charges covered by linked imported closes and never mixes currencies',()=>{
 const charges=[
 {id:'x',cardId:'a',bankId:'city',source:'manual',currency:'ARS',purchaseDate:'2026-10-02',amount:200},
 {id:'y',cardId:'b',bankId:'santander',source:'manual',currency:'USD',purchaseDate:'2026-10-03',amount:40},
 {id:'dup',cardId:'a',bankId:'city',source:'manual',currency:'ARS',purchaseDate:'2026-08-15',amount:999},
 {id:'bad',cardId:'a',bankId:'other',source:'manual',currency:'ARS',purchaseDate:'2026-10-03',amount:100},
 ];
 const result=cardMonthManualSpending(charges,statements,links,cards,new Date('2026-10-18T12:00:00'));
 expect(result).toMatchObject({ARS:200,USD:40,count:2,month:'2026-10'});
});
test('cycle dates are advisory, clamp short months and use exact future dates when provided',()=>{
 expect(cardCycleDates({closingDay:31,dueDay:10},new Date('2027-02-25T12:00:00')).closingDate).toBe('2027-02-28');
 const manual={closingDay:25,dueDay:10,statementSnapshot:{closingDate:'2026-10-23',dueDate:'2026-11-08'}};
 expect(cardCycleDates(manual,new Date('2026-10-18T12:00:00'))).toEqual({closingDate:'2026-10-23',dueDate:'2026-11-08',estimated:false});
});
test('crossing warning and full threshold are distinguished and zero or disabled limits never notify',()=>{
 const b={enabled:true,currency:'ARS',limit:1000,warnPercent:80};
 expect(budgetStatus({ARS:799},b,'ARS','2026-10').level).toBe('ok');
 expect(budgetStatus({ARS:805},b,'ARS','2026-10').level).toBe('warning');
 expect(budgetStatus({ARS:1000},b,'ARS','2026-10').level).toBe('exceeded');
 expect(budgetStatus({ARS:500},b,'USD','2026-10')).toBeNull();
});

test('screenshot totals are the baseline, not extra purchases; only after-snapshot purchases add spending',()=>{
 const bankCards=[
  {id:'card-a',bankId:'ciudad',closingDay:25,dueDay:10,
   statementSnapshot:{asOf:'2026-10-15',currentConsumptionARS:450000,currentConsumptionUSD:20}},
  {id:'card-b',bankId:'santander',closingDay:22,dueDay:8,
   statementSnapshot:{asOf:'2026-10-14',currentConsumptionARS:125000}},
 ];
 const purchases=[
  {id:'included',bankId:'ciudad',cardId:'card-a',source:'manual',currency:'ARS',
   purchaseDate:'2026-10-12',amount:80000},
  {id:'after',bankId:'ciudad',cardId:'card-a',source:'manual',currency:'ARS',
   purchaseDate:'2026-10-16',amount:15000},
  {id:'same-day',bankId:'santander',cardId:'card-b',source:'manual',currency:'ARS',
   purchaseDate:'2026-10-14',amount:12000},
  {id:'after2',bankId:'santander',cardId:'card-b',source:'manual',currency:'ARS',
   purchaseDate:'2026-10-17',amount:10000},
 ];
 const result=cardMonthManualSpending(purchases,[],[],bankCards,new Date('2026-10-18T12:00:00'));
 expect(result.ARS).toBe(600000); // 450k + 125k + 15k + 10k
 expect(result.USD).toBe(20);
 expect(result.snapshotCardCount).toBe(3); // per currency, including USD.
 expect(result.count).toBe(2);
 expect(result.manualOnly).toBe(false);
});
test('stale screenshot is not used as a fresh-cycle balance',()=>{
 const result=cardMonthManualSpending([],[],[],[{
  id:'card-old',bankId:'ciudad',closingDay:25,dueDay:10,
  statementSnapshot:{asOf:'2026-08-02',currentConsumptionARS:9999999},
 }],new Date('2026-10-18T12:00:00'));
 expect(result.ARS).toBe(0);
 expect(result.snapshotCardCount).toBe(0);
});
test('historical peak monitoring warns at 80%, 95% and 100% independently of an editable budget',()=>{
 const history=[
  {month:'2026-07',currency:'ARS',total:500000,statementCount:2},
  {month:'2026-08',currency:'ARS',total:1200000,statementCount:3},
  {month:'2026-09',currency:'ARS',total:700000,statementCount:2},
 ];
 expect(historicalPeakStatus({month:'2026-10',ARS:959000},history,'ARS').level).toBe('ok');
 expect(historicalPeakStatus({month:'2026-10',ARS:960000},history,'ARS').level).toBe('warning');
 expect(historicalPeakStatus({month:'2026-10',ARS:1140000},history,'ARS').level).toBe('critical');
 expect(historicalPeakStatus({month:'2026-10',ARS:1200000},history,'ARS').level).toBe('exceeded');
 const peak=historicalPeakStatus({month:'2026-10',ARS:960000},history,'ARS');
 expect(peak.peakMonth).toBe('2026-08');
 expect(peak.lowMonth).toBe('2026-07');
 expect(historicalPeakStatus({month:'2026-10',ARS:10000},history,'USD')).toBeNull();
});
