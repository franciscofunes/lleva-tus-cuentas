import React from 'react';
import '@testing-library/jest-dom';
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import Banks from './Banks';
import {auth,firestore} from '../shared/config/firebase/firebase.config';
import {analyzeStatementPdf,getImportedStatement,saveReviewedStatement,verifyStatementDraft} from '../services/cardStatementService';
import {storeDataAction} from '../actionCreators/databaseActions';
import * as banking from '../services/bankingService';

// This runs the REAL Banks, PDF review, linked card and consumption reader
// with a synthetic, in-memory Firestore adapter. No external services or writes.
const mockCategories=[{name:'Resumen tarjeta 💳',isExpense:true},{name:'Compras',isExpense:true}];
const mockDispatch=action=>action;
jest.mock('react-redux',()=>({
  useDispatch:()=>mockDispatch,
  useSelector:selector=>selector({auth:{user:{uid:'ltc-qa-user'}},database:{categories:mockCategories}}),
}));
jest.mock('../shared/config/firebase/firebase.config',()=>({
  auth:{currentUser:{uid:'ltc-qa-user'}},
  firestore:{collection:jest.fn()},
}));
jest.mock('../actionCreators/databaseActions',()=>({
  getCategoriesDataAction:jest.fn(),
  storeDataAction:jest.fn(),
}));
jest.mock('../services/cardStatementService',()=>({
  analyzeStatementPdf:jest.fn(), getImportedStatement:jest.fn(),
  saveReviewedStatement:jest.fn(), verifyStatementDraft:jest.fn(),
}));
jest.mock('../services/bankBudgetService',()=>({
  subscribeBankBudgets:jest.fn((uid,callback)=>{callback([]);return jest.fn();}),
  saveBankBudget:jest.fn(),
}));
jest.mock('../services/bankingService',()=>({
  subscribeBanks:jest.fn(),subscribeBankAccounts:jest.fn(),
  subscribeBankCards:jest.fn(),subscribeBankCharges:jest.fn(),
  subscribeBankStatementLinks:jest.fn(),subscribeImportedStatements:jest.fn(),
  createBankBundle:jest.fn(),renameUserBank:jest.fn(),
  saveBankAccount:jest.fn(),saveBankCard:jest.fn(),saveManualCardCharge:jest.fn(),
  deleteManualCardCharge:jest.fn(),saveStatementBankLink:jest.fn(),
  reassignStatementBankLink:jest.fn(),unlinkStatementBank:jest.fn(),
  importReviewedCardConsumptionMarkdown:jest.fn(),
}));
jest.mock('../components/LitaAssitantPanel',()=>()=>null);

const originalDraft={
  schema:'ltc.card-statement.v1',fileSha256:'a'.repeat(64),
  statement:{
    institution:'LTC QA Banco',cardBrand:'Visa',period:'2026-10',
    closingDate:'2026-10-02',dueDate:'2026-10-15',
    reconciliation:{ARS:true,USD:true},
    totals:{ARS:'100.00',USD:'20.00'},
    purchases:{ARS:'100.00',USD:'20.00'},
    taxesArs:'0.00',feesArs:'0.00',previousCreditArs:'0.00',
  },
  items:[
    {merchant:'LTC QA Compra ARS',category:'Compras',date:'2026-09-05',currency:'ARS',amount:'100.00',receipt:'1',sourcePage:1},
    {merchant:'LTC QA Compra USD',category:'Compras',date:'2026-09-06',currency:'USD',amount:'20.00',receipt:'2',sourcePage:2},
  ],
};
let mockDb;
let mockListeners;
const emit=(method,field)=>mockListeners[method]?.(mockDb[field]);
const bind=(method,field)=>{
  banking[method].mockImplementation((uid,onData)=>{
    mockListeners[method]=onData;
    onData(mockDb[field]);
    return jest.fn();
  });
};
beforeEach(()=>{
  jest.clearAllMocks();
  localStorage.clear();
  mockDb={
    banks:[{id:'qa-bank',code:'qa-bank',name:'LTC QA Banco',active:true}],
    cards:[{id:'qa-card',bankId:'qa-bank',nickname:'LTC QA Visa',brand:'Visa',lastFour:'4321',closingDay:2,dueDay:15}],
    accounts:[],charges:[],links:[],statements:[],items:[],
  };
  mockListeners={};
  for(const [method,field] of Object.entries({
    subscribeBanks:'banks',subscribeBankAccounts:'accounts',subscribeBankCards:'cards',
    subscribeBankCharges:'charges',subscribeBankStatementLinks:'links',
    subscribeImportedStatements:'statements',
  })) bind(method,field);
  analyzeStatementPdf.mockResolvedValue(originalDraft);
  verifyStatementDraft.mockReturnValue(true);
  getImportedStatement.mockResolvedValue(null);
  storeDataAction.mockResolvedValue('ltc-qa-expense');
  saveReviewedStatement.mockImplementation(async ({uid,expenseId,draft})=>{
    expect(uid).toBe('ltc-qa-user');
    mockDb.items=draft.items.map(item=>({...item,category:item.suggestedCategory}));
    mockDb.statements=[{
      id:draft.fileSha256,expenseId,period:draft.statement.period,
      institution:draft.statement.institution,cardBrand:draft.statement.cardBrand,
      closingDate:draft.statement.closingDate,dueDate:draft.statement.dueDate,
      totals:draft.statement.totals,itemCount:draft.items.length,
    }];
    emit('subscribeImportedStatements','statements');
    return draft.fileSha256;
  });
  banking.saveStatementBankLink.mockImplementation(async (uid,expenseId,bankId,cardId)=>{
    mockDb.links=[{id:expenseId,expenseId,bankId,cardId}];
    emit('subscribeBankStatementLinks','links');
  });
  firestore.collection.mockImplementation(()=>({
    doc:()=>({collection:()=>({
      where:()=>({limit:()=>({get:async()=>({
        empty:!mockDb.statements.length,
        docs:mockDb.statements.map(s=>({
          data:()=>({...s,purchases:originalDraft.statement.purchases}),
          ref:{collection:()=>({orderBy:()=>({get:async()=>({
            docs:mockDb.items.map(item=>({data:()=>item})),
          })})})},
        })),
      })})}),
    })}),
  }));
});

test('synthetic PDF: analyze → review ARS/USD → one expense → save metadata/items → link → search → remask',async()=>{
  render(<MemoryRouter><Banks/></MemoryRouter>);
  await screen.findByRole('heading',{name:'Mis bancos'});
  fireEvent.click(screen.getByRole('button',{name:/LTC QA Banco/}));
  fireEvent.click(screen.getByRole('button',{name:/LTC QA Visa/}));
  fireEvent.click(screen.getByRole('button',{name:'Importar resumen PDF de esta tarjeta'}));
  // The user must reveal amounts before approving a financial import.
  fireEvent.click(screen.getByRole('button',{name:'Mostrar importes de la pantalla'}));
  const upload=screen.getByLabelText('Elegir resumen bancario en PDF');
  fireEvent.change(upload,{target:{files:[new File(['%PDF-1.7 synthetic'], 'ltc-qa-statement.pdf',{type:'application/pdf'})]}});
  expect(await screen.findByText('Totales conciliados')).toBeInTheDocument();
  expect(analyzeStatementPdf).toHaveBeenCalledTimes(1);
  expect(storeDataAction).not.toHaveBeenCalled();
  expect(banking.saveStatementBankLink).not.toHaveBeenCalled();
  const importer=screen.getByRole('heading',{name:'Analizar resumen PDF'}).closest('section');
  expect(importer).toHaveTextContent('Total ARS');
  expect(importer).toHaveTextContent('Total USD — sin conversión');
  expect(importer).toHaveTextContent('2026-10-15');
  fireEvent.click(screen.getByRole('button',{name:'Guardar resumen revisado y vincular'}));
  await waitFor(()=>expect(storeDataAction).toHaveBeenCalledTimes(1));
  const expenseArg=storeDataAction.mock.calls[0][0];
  expect(expenseArg).toEqual(expect.objectContaining({
    userId:'ltc-qa-user',amount:100,transactionCurrency:'ARS',
    selectedExpirationDate:'2026-10-15',dueDate:'2026-10-15',
  }));
  expect(expenseArg.comment).toContain('USD 20.00');
  await waitFor(()=>expect(saveReviewedStatement).toHaveBeenCalledTimes(1));
  await waitFor(()=>expect(banking.saveStatementBankLink).toHaveBeenCalledWith(
    'ltc-qa-user','ltc-qa-expense','qa-bank','qa-card'));
  expect(banking.saveStatementBankLink).toHaveBeenCalledTimes(1);
  expect(mockDb.statements).toHaveLength(1);
  expect(mockDb.items).toHaveLength(2);
  expect(mockDb.items[0].currency).toBe('ARS');
  expect(mockDb.items[1].currency).toBe('USD');
  expect(banking.saveManualCardCharge).not.toHaveBeenCalled();
  const linked=await screen.findByRole('article',{name:'Resumen vinculado 2026-10 Visa'});
  expect(within(linked).getByLabelText('Totales del resumen vinculado por moneda'))
    .toHaveTextContent('ARS •••• · USD ••••');
  fireEvent.click(within(linked).getByRole('button',{name:'Revisar resumen'}));
  fireEvent.click(within(linked).getByRole('button',{name:'Ver consumos del resumen'}));
  expect(await within(linked).findByText('LTC QA Compra USD')).toBeInTheDocument();
  fireEvent.click(within(linked).getByRole('button',{name:'Filtrar consumos: USD'}));
  expect(within(linked).queryByText('LTC QA Compra ARS')).not.toBeInTheDocument();
  const search=within(linked).getByRole('searchbox',{name:'Buscar consumos del resumen'});
  fireEvent.change(search,{target:{value:'LTC QA Compra USD'}});
  expect(within(linked).getByText('LTC QA Compra USD')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Ocultar importes de la pantalla'}));
  expect(within(linked).queryByRole('searchbox',{name:'Buscar consumos del resumen'})).not.toBeInTheDocument();
  expect(within(linked).getByLabelText('Totales del resumen vinculado por moneda'))
    .toHaveTextContent('ARS •••• · USD ••••');
  expect(storeDataAction).toHaveBeenCalledTimes(1);
  expect(banking.saveStatementBankLink).toHaveBeenCalledTimes(1);
});
