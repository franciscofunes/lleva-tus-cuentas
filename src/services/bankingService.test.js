import {
  addUserBank, renameUserBank, saveBankAccount, saveBankCard, saveManualCardCharge, saveStatementBankLink,
  getStatementLink, subscribeBankStatementLinks,
} from './bankingService';
import { auth, firestore } from '../shared/config/firebase/firebase.config';

jest.mock('../shared/config/firebase/firebase.config', () => ({
  auth: { currentUser: { uid: 'alice' } },
  firestore: { collection: jest.fn() },
}));

let mockBank, mockCard, mockExpense, mockLink, mockAccount, mockCharge, mockUser;
beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = { uid: 'alice' };
  mockBank = { exists: true, data: () => ({ bankId:'santander' }) };
  mockCard = { exists: true, data: () => ({ bankId:'santander' }) };
  mockExpense = { exists: true, data: () => ({ category:'Resumen tarjeta 💳' }) };
  const bankRef = { id: 'bankGenerated20', set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined), get: jest.fn(async () => mockBank) };
  const cardRef = { get: jest.fn(async () => mockCard), update: jest.fn().mockResolvedValue(undefined) };
  const expenseRef = { get: jest.fn(async () => mockExpense) };
  mockLink = { get: jest.fn(async () => ({ exists:false })), set: jest.fn().mockResolvedValue(undefined) };
  mockAccount = { add: jest.fn(async () => ({ id:'account1' })) };
  mockCharge = { add: jest.fn(async () => ({ id:'charge1' })) };
  const refs = {
    banks: { doc: jest.fn(() => bankRef) },
    bankCards: { doc: jest.fn(() => cardRef), add: jest.fn(async () => ({ id:'card1' })) },
    expenses: { doc: jest.fn(() => expenseRef) },
    bankStatementLinks: { doc: jest.fn(() => mockLink), onSnapshot: jest.fn(() => jest.fn()) },
    bankAccounts: mockAccount, bankCardCharges: mockCharge,
  };
  mockUser = { collection: jest.fn((name) => refs[name]) };
  firestore.collection.mockReturnValue({ doc: jest.fn(() => mockUser) });
});

test('user names the bank; Firestore generates a private ID and no presets are seeded', async () => {
  await expect(addUserBank('alice',' Banco Galicia ')).resolves.toBe('bankGenerated20');
  expect(mockUser.collection).toHaveBeenCalledWith('banks');
  const bankRef = mockUser.collection('banks').doc();
  expect(bankRef.set).toHaveBeenCalledWith(expect.objectContaining({
    code:'bankGenerated20',name:'Banco Galicia',active:true,updatedAt:expect.any(Date),
  }));
  await renameUserBank('alice','bankGenerated20',' BBVA ');
  expect(bankRef.update).toHaveBeenCalledWith(expect.objectContaining({name:'BBVA'}));
  await expect(addUserBank('alice',' ')).rejects.toThrow(/2 a 70/);
});

test('owner-scoped bank account saves a numeric balance, not another transaction', async () => {
  const input = { bankId:'santander',name:'Mi caja',type:'caja_ahorro',
    currency:'ARS',balance:'100.50',alias:'alias',cbu:'' };
  await saveBankAccount('alice', input);
  expect(mockAccount.add).toHaveBeenCalledWith(expect.objectContaining({
    balance:100.5,currency:'ARS',bankId:'santander',
    createdAt:expect.any(Date),balanceUpdatedAt:expect.any(Date),
  }));
  expect(mockUser.collection).not.toHaveBeenCalledWith('expenses');
});

test('manual charges cannot be attached to a different bank card', async () => {
  const charge = {bankId:'santander',cardId:'card1',merchant:'Farmacia',purchaseDate:'2026-10-13',
    amount:'250.99',currency:'ARS',installments:'1',note:''};
  await saveManualCardCharge('alice', charge);
  expect(mockCharge.add).toHaveBeenCalledWith(expect.objectContaining({
    amount:250.99,countedInCashFlow:false,source:'manual',
  }));
  expect(mockUser.collection).not.toHaveBeenCalledWith('expenses');
  mockCard = { exists:true,data:()=>({bankId:'ciudad'}) };
  await expect(saveManualCardCharge('alice', charge)).rejects.toThrow(/ya no pertenece/);
});

test('link writes only when the owner bank, card and expense summary actually exist', async () => {
  await saveStatementBankLink('alice','expense1','santander','card1');
  expect(mockLink.set).toHaveBeenCalledWith(expect.objectContaining({
    expenseId:'expense1',bankId:'santander',cardId:'card1',updatedAt:expect.any(Date),
  }));
  mockLink.set.mockClear();
  mockExpense = { exists:true,data:()=>({category:'Venta divisas'}) };
  await expect(saveStatementBankLink('alice','expense1','santander','card1')).rejects.toThrow(/no válidos/);
  expect(mockLink.set).not.toHaveBeenCalled();
});

test('cross-user bank data cannot be read or written', async () => {
  expect(() => saveBankAccount('bob', { bankId:'santander',name:'Cuenta',type:'caja_ahorro',
    currency:'ARS',balance:'25',alias:'',cbu:'' })).toThrow(/Iniciá sesión/);
  await expect(getStatementLink('bob','expense1')).rejects.toThrow(/Iniciá sesión/);
  expect(() => subscribeBankStatementLinks('bob',jest.fn())).toThrow(/Iniciá sesión/);
});

test('a statement association is optional, and absent links resolve to null', async () => {
  await expect(getStatementLink('alice','expense1')).resolves.toBeNull();
  await expect(getStatementLink('alice','../unsafe')).resolves.toBeNull();
});
