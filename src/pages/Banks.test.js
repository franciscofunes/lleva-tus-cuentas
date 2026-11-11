import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Banks from './Banks';

// Stable reference prevents repeated banking snapshot subscriptions in React.
const mockBankDispatch = (action) => typeof action === 'function' ? action : undefined;
jest.mock('react-redux', () => ({
  useDispatch: () => mockBankDispatch,
  useSelector: (selector) => selector({
    auth: { user: { uid: 'test-private-user' } },
    database: { categories: [] },
  }),
}));
jest.mock('../actionCreators/databaseActions', () => ({
  getCategoriesDataAction: jest.fn(() => jest.fn()),
  storeDataAction: jest.fn(),
}));
jest.mock('../components/CardStatementDetails', () => () => null);
jest.mock('../components/CardStatementPdfReview', () => () => null);
jest.mock('../components/LitaAssitantPanel', () => ({
  __esModule: true,
  default: ({section, context}) => require('react').createElement('div',
    {'data-testid':'lita-panel','data-scope':context.scope}, section),
}));
jest.mock('../services/cardStatementService', () => ({
  getImportedStatement: jest.fn(), saveReviewedStatement: jest.fn(), verifyStatementDraft: jest.fn(),
}));
// Owner-specific budgets use Firestore; keep this UI test isolated from SDK initialization.
jest.mock('../services/bankBudgetService',()=>({
  subscribeBankBudgets:jest.fn((uid,onData)=>{onData([]);return jest.fn();}),
  saveBankBudget:jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../services/bankingService', () => ({
  subscribeBanks: jest.fn(),
  subscribeBankAccounts: jest.fn(),
  subscribeBankCards: jest.fn(),
  subscribeBankCharges: jest.fn(),
  subscribeBankStatementLinks: jest.fn(),
  subscribeImportedStatements: jest.fn(),
  createBankBundle: jest.fn(),
  renameUserBank: jest.fn(),
  saveBankAccount: jest.fn(),
  saveBankCard: jest.fn(),
  saveManualCardCharge: jest.fn(),
  deleteManualCardCharge: jest.fn(),
  saveStatementBankLink: jest.fn(),
  reassignStatementBankLink: jest.fn(),
  unlinkStatementBank: jest.fn(),
}));
const banking = require('../services/bankingService');

const snapshots = {
  subscribeBanks: [],
  subscribeBankAccounts: [],
  subscribeBankCards: [],
  subscribeBankCharges: [],
  subscribeBankStatementLinks: [],
  subscribeImportedStatements: [],
};

function arrange(data = {}) {
  Object.entries(snapshots).forEach(([name, defaults]) => {
    banking[name].mockImplementation((uid, onData) => {
      onData(data[name] || defaults);
      return jest.fn();
    });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  try { localStorage.clear(); } catch { /* harmless in test runners */ }
  arrange();
});

const mount = () => render(<MemoryRouter initialEntries={['/bancos']}><Banks /></MemoryRouter>);

test('Bancos reuses the financial header, grouped metrics and collapsible management without seeding banks', async () => {
  mount();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Mis bancos' })).toBeInTheDocument());
  expect(screen.getByRole('heading', { name: 'Bancos y tarjetas' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Saldos bancarios' })).toBeInTheDocument();
  expect(screen.getByText(/0 bancos · 0 cuentas · 0 tarjetas/)).toBeInTheDocument();
  expect(screen.getByText(/Usá «Agregar banco»/)).toBeInTheDocument();
  expect(screen.queryByText('Banco Santander')).not.toBeInTheDocument();
  expect(screen.queryByText('Banco Ciudad')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Nombre del banco')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Agregar banco' }));
  expect(screen.getByRole('dialog', { name: 'Crear banco y completar datos' })).toBeInTheDocument();
  expect(screen.getByLabelText('Nombre del banco')).toHaveAttribute('maxLength', '70');
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByRole('button', { name: /Saldos bancarios/ })).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(screen.getByRole('button', { name: /Saldos bancarios/ }));
  expect(screen.getByRole('button', { name: /Saldos bancarios/ })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: /Saldos bancarios/ }));
  expect(screen.getByText('Saldos registrados · ARS')).toBeInTheDocument();
  expect(screen.getByText('Saldos registrados · USD')).toBeInTheDocument();
});

test('Bancos exposes the multi-card payment planner with privacy-first disclosure', async () => {
  mount();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Planificar pago de tarjetas' })).toBeInTheDocument());
  const trigger = screen.getByRole('button', { name: /Planificar pago de tarjetas/ });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(screen.queryByLabelText('Cotización de venta (ARS por 1 USD)')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar importes' }));
  expect(screen.getByLabelText('Cotización de venta (ARS por 1 USD)')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Agregar manualmente' })).toBeInTheDocument();
});


test('primary bank action is visibly labeled on narrow mobile; secondary shortcuts have 44px hit targets', async () => {
  mount();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Bancos y tarjetas' })).toBeInTheDocument());
  const add = screen.getByRole('button', { name: 'Agregar banco' });
  expect(add).toHaveTextContent('Agregar banco');
  expect(add).toHaveClass('min-h-[44px]', 'bg-violet-600');
  const header = add.closest('section');
  expect(header).toHaveClass('dark:bg-slate-800');
  const more = within(header).getByText('Más');
  fireEvent.click(more);
  expect(within(header).getByRole('link', { name: 'Transacciones' })).toHaveAttribute('href', '/transacciones');
  expect(within(header).getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '/portfolio');
});

test('CBU reveal is an accessible 44px disclosure and never opens an editor', async () => {
  arrange({
    subscribeBanks: [{ id:'bank-1', code:'bank-1', name:'Banco de prueba', active:true }],
    subscribeBankAccounts: [{
      id:'account-1', bankId:'bank-1', name:'Caja en pesos', type:'caja_ahorro',
      currency:'ARS', balance:2500, cbu:'1234567890123456789012',
    }],
  });
  mount();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Mis bancos' })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name:/Banco de prueba/ }));
  const account = screen.getByRole('article',{ name:'Cuenta: Caja en pesos' });
  const disclosure = within(account).getByRole('button', { name:'Ver detalles de Caja en pesos' });
  expect(account).not.toHaveTextContent('1234567890123456789012');
  fireEvent.click(disclosure);
  const reveal=screen.getByRole('button', { name:'Ver CBU de Caja en pesos' });
  expect(reveal).toHaveClass('min-h-[44px]');
  expect(reveal).toHaveAttribute('aria-pressed', 'false');
  expect(screen.queryByText('1234567890123456789012')).not.toBeInTheDocument();
  fireEvent.click(reveal);
  const hide=screen.getByRole('button', { name:'Ocultar CBU de Caja en pesos' });
  expect(hide).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText(/1234567890123456789012/)).toBeInTheDocument();
  fireEvent.click(hide);
  expect(screen.queryByText('1234567890123456789012')).not.toBeInTheDocument();
});

const manuallyRecordedBankCard = {
  subscribeBanks: [{ id:'bank-1', code:'bank-1', name:'Banco de prueba', active:true }],
  subscribeBankCards: [{
    id:'card-1', bankId:'bank-1', nickname:'Visa Prueba', brand:'Visa',
    lastFour:'1234', closingDay:25, dueDay:10,
  }],
  subscribeBankCharges: [{
    id:'charge-1', bankId:'bank-1', cardId:'card-1',
    merchant:'Supermercado de prueba', amount:12345.67, currency:'ARS',
    purchaseDate:'2026-10-21', installments:1,
  }],
};

const openManualCardCharges = async () => {
  await waitFor(() => expect(screen.getByRole('heading', { name:'Mis bancos' })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name:/Banco de prueba/ }));
  fireEvent.click(screen.getByRole('button', { name:/Visa Prueba/ }));
  expect(screen.getByText('Supermercado de prueba')).toBeInTheDocument();
};

test('OCR import is discoverable in Mis bancos before opening a bank or card', async () => {
  arrange(manuallyRecordedBankCard);
  mount();
  const shortcut = await screen.findByRole('region', { name: 'Importar captura de consumos' });
  const action = within(shortcut).getByRole('button', { name: 'Importar captura' });
  expect(action).toHaveClass('min-h-[44px]');
  expect(action).toBeEnabled();
  expect(screen.queryByText('Supermercado de prueba')).not.toBeInTheDocument();
  fireEvent.click(action);
  const dialog = screen.getByRole('dialog', { name: 'Importar consumos desde capturas o Markdown' });
  expect(within(dialog).getByText(/Mostrá los importes de Bancos/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Mostrar importes y continuar' }));
  expect(within(dialog).getByLabelText('Elegir captura para lectura local')).toBeInTheDocument();
  expect(banking.saveManualCardCharge).not.toHaveBeenCalled();
});

test('tapping a manual charge delete only opens a modal, cancellation makes no write', async () => {
  arrange(manuallyRecordedBankCard);
  mount();
  await openManualCardCharges();
  const removal=screen.getByRole('button', { name:'Eliminar consumo de Supermercado de prueba' });
  expect(removal).toHaveClass('min-h-[44px]');
  const row=screen.getByRole('article', { name:'Consumo: Supermercado de prueba' });
  expect(row).toHaveClass('dark:bg-slate-800');
  fireEvent.click(removal);
  const dialog=screen.getByRole('dialog', { name:'Eliminar consumo manual' });
  expect(dialog).toHaveTextContent('Supermercado de prueba');
  expect(dialog).toHaveTextContent('No se borrará ningún resumen PDF');
  expect(banking.deleteManualCardCharge).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name:'Cancelar' }));
  expect(banking.deleteManualCardCharge).not.toHaveBeenCalled();
});

test('confirmed manual charge deletion targets only the owner and selected charge, not its statement', async () => {
  arrange(manuallyRecordedBankCard);
  banking.deleteManualCardCharge.mockResolvedValue(undefined);
  mount();
  await openManualCardCharges();
  fireEvent.click(screen.getByRole('button', { name:'Eliminar consumo de Supermercado de prueba' }));
  const dialog=screen.getByRole('dialog', { name:'Eliminar consumo manual' });
  expect(within(dialog).getByLabelText('Importe del consumo')).toHaveTextContent('••••');
  fireEvent.click(within(dialog).getByRole('button', { name:'Eliminar consumo' }));
  await waitFor(() => expect(banking.deleteManualCardCharge).toHaveBeenCalledWith('test-private-user','charge-1'));
  expect(banking.deleteManualCardCharge).toHaveBeenCalledTimes(1);
  expect(require('../services/cardStatementService').saveReviewedStatement).not.toHaveBeenCalled();
  expect(banking.unlinkStatementBank).not.toHaveBeenCalled();
  expect(require('../actionCreators/databaseActions').storeDataAction).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole('dialog', { name:'Eliminar consumo manual' })).not.toBeInTheDocument());
});

test('existing bank accounts and cards keep their data behind the shared nested accordion', async () => {
  arrange({
    subscribeBanks: [{ id:'private-1',code:'private-1',name:'Mi Banco',active:true }],
    subscribeBankAccounts: [{ id:'account-1',bankId:'private-1',name:'Caja USD',type:'caja_ahorro',currency:'USD',balance:200,alias:'cuenta',cbu:'' }],
    subscribeBankCards: [{ id:'card-1',bankId:'private-1',nickname:'Visa Gold',brand:'Visa',lastFour:'3210',closingDay:25,dueDay:10 }],
  });
  mount();
  await waitFor(() => expect(screen.getByRole('heading', { name:'Mis bancos' })).toBeInTheDocument());
  const bankToggle = screen.getByRole('button', { name: /Mi Banco/ });
  expect(bankToggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(bankToggle);
  expect(screen.getByText('Caja USD')).toBeInTheDocument();
  const account = screen.getByRole('article',{ name:'Cuenta: Caja USD' });
  expect(account).not.toHaveTextContent('Alias: cuenta');
  fireEvent.click(within(account).getByRole('button',{name:'Ver detalles de Caja USD'}));
  expect(within(account).getByText((text, node) => node?.tagName === 'P' && node.textContent === 'Alias: cuenta')).toBeInTheDocument();
  const cardToggle = screen.getByRole('button', { name: /Visa Gold/ });
  expect(cardToggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(cardToggle);
  expect(screen.getByText('Consumos registrados')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Agregar consumo manual/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Importar resumen PDF/ })).toBeInTheDocument();
});

test('account editor opens next to the selected account and preserves optional identity data', async () => {
  arrange({
    subscribeBanks: [{ id:'bank-1',code:'bank-1',name:'Banco de prueba',active:true }],
    subscribeBankAccounts: [
      {id:'acc-1',bankId:'bank-1',name:'Caja ARS',type:'caja_ahorro',currency:'ARS',balance:1200,alias:'alias.prueba',cbu:'1234567890123456789012'},
      {id:'acc-2',bankId:'bank-1',name:'Caja USD',type:'caja_ahorro',currency:'USD',balance:25},
    ],
  });
  banking.saveBankAccount.mockResolvedValue(undefined);
  mount();
  await screen.findByRole('heading',{name:'Mis bancos'});
  fireEvent.click(screen.getByRole('button',{name:/Banco de prueba/}));
  const first = screen.getByRole('article',{name:'Cuenta: Caja ARS'});
  const second = screen.getByRole('article',{name:'Cuenta: Caja USD'});
  fireEvent.click(within(first).getByRole('button',{name:'Editar cuenta o saldo'}));
  const editor = screen.getByRole('form',{name:'Editar cuenta bancaria'});
  expect(first.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(editor.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(editor).toHaveClass('ltc-transaction-card','dark:bg-slate-800');
  const identity = within(editor).getByText(/Datos identificatorios \(opcional\)/).closest('details');
  expect(identity).toHaveAttribute('open');
  expect(identity).toHaveClass('dark:bg-slate-900/70');
  expect(within(editor).getByLabelText('Alias (opcional)')).toHaveValue('alias.prueba');
  fireEvent.change(within(editor).getByLabelText('Saldo actual (manual)'),{target:{value:'1300.50'}});
  fireEvent.click(within(editor).getByRole('button',{name:'Guardar cuenta'}));
  await waitFor(()=>expect(banking.saveBankAccount).toHaveBeenCalledWith('test-private-user',
    expect.objectContaining({name:'Caja ARS',currency:'ARS',balance:'1300.50',alias:'alias.prueba',cbu:'1234567890123456789012'}),'acc-1'));
});

test('new account is placed by Añadir cuenta, has compact optional details and keeps fields when collapsed', async () => {
  arrange({subscribeBanks:[{id:'bank-1',code:'bank-1',name:'Banco de prueba',active:true}]});
  banking.saveBankAccount.mockResolvedValue(undefined);
  mount();
  await screen.findByRole('heading',{name:'Mis bancos'});
  fireEvent.click(screen.getByRole('button',{name:/Banco de prueba/}));
  fireEvent.click(screen.getByRole('button',{name:'Añadir cuenta'}));
  const editor = screen.getByRole('form',{name:'Nueva cuenta bancaria'});
  const identity = within(editor).getByText(/Datos identificatorios \(opcional\)/).closest('details');
  expect(identity).not.toHaveAttribute('open');
  expect(within(editor).getByRole('button',{name:'Guardar cuenta'})).toHaveClass('min-h-[44px]');
  expect(within(editor).getByLabelText('Nombre o apodo')).toHaveClass('text-base','dark:bg-slate-900','focus-visible:ring-2');
  expect(within(editor).getByLabelText('Nombre o apodo').closest('label')).toHaveClass('text-sm','dark:text-slate-200');
  const editorActions=within(editor).getAllByRole('button').filter(button=>/^(Cancelar|Guardar cuenta)$/.test(button.textContent));
  expect(editorActions.map(button=>button.textContent)).toEqual(['Cancelar','Guardar cuenta']);
  expect(editorActions[1]).toHaveClass('bg-violet-600','focus-visible:ring-2');
  fireEvent.click(within(editor).getByText(/Datos identificatorios \(opcional\)/));
  fireEvent.change(within(editor).getByLabelText('Alias (opcional)'),{target:{value:'alias.caja'}});
  fireEvent.click(within(editor).getByText(/Datos identificatorios \(opcional\)/));
  fireEvent.change(within(editor).getByLabelText('Nombre o apodo'),{target:{value:'Nueva caja'}});
  fireEvent.click(within(editor).getByRole('button',{name:'Guardar cuenta'}));
  await waitFor(()=>expect(banking.saveBankAccount).toHaveBeenCalledWith('test-private-user',
    expect.objectContaining({name:'Nueva caja',alias:'alias.caja'}),null));
});

test('card editing remains inside the selected card, while actual PDF dates and snapshots are preserved', async () => {
  arrange({
    subscribeBanks:[{id:'bank-1',code:'bank-1',name:'Banco de prueba',active:true}],
    subscribeBankCards:[{
      id:'card-1',bankId:'bank-1',nickname:'Visa Prueba',brand:'Visa',lastFour:'4242',closingDay:25,dueDay:10,
      statementSnapshot:{closingDate:'2026-11-02',dueDate:'2026-11-15',lastStatementARS:1000},
    }],
  });
  banking.saveBankCard.mockResolvedValue(undefined);
  mount();
  await screen.findByRole('heading',{name:'Mis bancos'});
  fireEvent.click(screen.getByRole('button',{name:/Banco de prueba/}));
  fireEvent.click(screen.getByRole('button',{name:/Visa Prueba/}));
  const section = document.getElementById('bank-card-card-1');
  fireEvent.click(within(section).getByRole('button',{name:'Editar tarjeta'}));
  const editor = within(section).getByRole('form',{name:'Editar tarjeta bancaria'});
  expect(within(editor).getByLabelText('Día habitual de vencimiento')).toHaveClass('text-base','dark:bg-slate-900');
  const cardActions=within(editor).getAllByRole('button').filter(button=>/^(Cancelar|Guardar tarjeta)$/.test(button.textContent));
  expect(cardActions.map(button=>button.textContent)).toEqual(['Cancelar','Guardar tarjeta']);
  expect(editor).toHaveClass('dark:bg-slate-800');
  const summary = within(editor).getByText(/Referencia del home banking \(opcional\)/).closest('details');
  expect(summary).toHaveAttribute('open');
  expect(summary).toHaveClass('dark:bg-slate-900/70');
  expect(within(editor).getByLabelText('Cierre mostrado')).toHaveValue('2026-11-02');
  fireEvent.change(within(editor).getByLabelText('Día habitual de vencimiento'),{target:{value:'12'}});
  fireEvent.click(within(editor).getByRole('button',{name:'Guardar tarjeta'}));
  await waitFor(()=>expect(banking.saveBankCard).toHaveBeenCalledWith('test-private-user',
    expect.objectContaining({dueDay:'12',closingDate:'2026-11-02',dueDate:'2026-11-15',lastStatementARS:1000}),'card-1'));
});

test('failed account saves keep the edited amount, focus a local error, and allow retry without a duplicate write', async () => {
  arrange({
    subscribeBanks:[{id:'bank-1',code:'bank-1',name:'Banco de prueba',active:true}],
    subscribeBankAccounts:[{id:'acc-1',bankId:'bank-1',name:'Caja USD',type:'caja_ahorro',currency:'USD',balance:500}],
  });
  banking.saveBankAccount.mockRejectedValueOnce({code:'permission-denied'}).mockResolvedValueOnce(undefined);
  mount();
  await screen.findByRole('heading',{name:'Mis bancos'});
  fireEvent.click(screen.getByRole('button',{name:/Banco de prueba/}));
  const editTrigger = within(screen.getByRole('article',{name:'Cuenta: Caja USD'})).getByRole('button',{name:'Editar cuenta o saldo'});
  fireEvent.click(editTrigger);
  let editor = screen.getByRole('form',{name:'Editar cuenta bancaria'});
  fireEvent.change(within(editor).getByLabelText('Saldo actual (manual)'),{target:{value:'777.25'}});
  fireEvent.click(within(editor).getByRole('button',{name:'Guardar cuenta'}));
  const localError = await within(editor).findByRole('alert');
  expect(localError).toHaveTextContent('problema de permisos');
  expect(localError).toHaveTextContent('Tus cambios siguen acá');
  expect(localError).toHaveClass('dark:bg-rose-950/40','dark:text-rose-200');
  await waitFor(()=>expect(localError).toHaveFocus());
  expect(within(editor).getByLabelText('Saldo actual (manual)')).toHaveValue('777.25');
  expect(screen.getAllByRole('alert')).toHaveLength(1);
  expect(banking.saveBankAccount).toHaveBeenCalledTimes(1);

  fireEvent.click(within(editor).getByRole('button',{name:'Guardar cuenta'}));
  await waitFor(()=>expect(screen.queryByRole('form',{name:'Editar cuenta bancaria'})).not.toBeInTheDocument());
  expect(banking.saveBankAccount).toHaveBeenCalledTimes(2);
  expect(banking.saveBankAccount).toHaveBeenLastCalledWith('test-private-user',expect.objectContaining({balance:'777.25'}),'acc-1');
  expect(editTrigger).toHaveFocus();
});

test('failed card saves stay within the card and clear their inline error when the draft changes', async () => {
  arrange({
    subscribeBanks:[{id:'bank-1',code:'bank-1',name:'Banco de prueba',active:true}],
    subscribeBankCards:[{id:'card-1',bankId:'bank-1',nickname:'Visa Prueba',brand:'Visa',lastFour:'4242',closingDay:25,dueDay:10}],
  });
  banking.saveBankCard.mockRejectedValueOnce({code:'unavailable'}).mockResolvedValueOnce(undefined);
  mount();
  await screen.findByRole('heading',{name:'Mis bancos'});
  fireEvent.click(screen.getByRole('button',{name:/Banco de prueba/}));
  fireEvent.click(screen.getByRole('button',{name:/Visa Prueba/}));
  const section = document.getElementById('bank-card-card-1');
  const editTrigger = within(section).getByRole('button',{name:'Editar tarjeta'});
  fireEvent.click(editTrigger);
  const editor = within(section).getByRole('form',{name:'Editar tarjeta bancaria'});
  fireEvent.change(within(editor).getByLabelText('Día habitual de vencimiento'),{target:{value:'12'}});
  fireEvent.click(within(editor).getByRole('button',{name:'Guardar tarjeta'}));
  const error = await within(editor).findByRole('alert');
  expect(error).toHaveTextContent('problema de conexión');
  await waitFor(()=>expect(error).toHaveFocus());
  expect(within(editor).getByLabelText('Día habitual de vencimiento')).toHaveValue(12);
  expect(banking.saveBankCard).toHaveBeenCalledTimes(1);
  fireEvent.change(within(editor).getByLabelText('Día habitual de vencimiento'),{target:{value:'13'}});
  expect(within(editor).queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(within(editor).getByRole('button',{name:'Guardar tarjeta'}));
  await waitFor(()=>expect(within(section).queryByRole('form',{name:'Editar tarjeta bancaria'})).not.toBeInTheDocument());
  expect(banking.saveBankCard).toHaveBeenCalledTimes(2);
  expect(banking.saveBankCard).toHaveBeenLastCalledWith('test-private-user',expect.objectContaining({dueDay:'13'}),'card-1');
  expect(editTrigger).toHaveFocus();
});

test('canceling a new account and existing card editor returns keyboard focus to their opening action', async () => {
  arrange({
    subscribeBanks:[{id:'bank-1',code:'bank-1',name:'Banco de prueba',active:true}],
    subscribeBankCards:[{id:'card-1',bankId:'bank-1',nickname:'Visa Prueba',brand:'Visa',lastFour:'4242',closingDay:25,dueDay:10}],
  });
  mount();
  await screen.findByRole('heading',{name:'Mis bancos'});
  fireEvent.click(screen.getByRole('button',{name:/Banco de prueba/}));
  const addAccount = screen.getByRole('button',{name:'Añadir cuenta'});
  fireEvent.click(addAccount);
  fireEvent.click(within(screen.getByRole('form',{name:'Nueva cuenta bancaria'})).getByRole('button',{name:'Cancelar'}));
  expect(addAccount).toHaveFocus();
  expect(banking.saveBankAccount).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:/Visa Prueba/}));
  const editCard = screen.getByRole('button',{name:'Editar tarjeta'});
  fireEvent.click(editCard);
  fireEvent.click(within(screen.getByRole('form',{name:'Editar tarjeta bancaria'})).getByRole('button',{name:'Cancelar'}));
  expect(editCard).toHaveFocus();
  expect(banking.saveBankCard).not.toHaveBeenCalled();
});

test('privacy toggle masks both currencies and uses the existing shared KPI design', async () => {
  arrange({ subscribeBankAccounts: [{ id:'a',bankId:'b',currency:'ARS',balance:1234.5 }] });
  mount();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Saldos bancarios' })).toBeInTheDocument());
  expect(screen.getAllByText('••••').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name:'Mostrar importes de la pantalla' }));
  await waitFor(() => expect(screen.getByText(/1\.234/)).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name:'Ocultar importes de la pantalla' }));
  expect(screen.queryByText(/1\.234/)).not.toBeInTheDocument();
});

test('the bank privacy toggle also hides budget form values and progress percentages', async () => {
  require('../services/bankBudgetService').subscribeBankBudgets.mockImplementation((uid,onData)=>{
    onData([{currency:'ARS',limit:333333,warnPercent:80,enabled:true}]);
    return jest.fn();
  });
  mount();
  await screen.findByRole('heading',{name:'Topes y consumos de tarjetas'});
  expect(screen.queryByLabelText('Tope mensual ARS')).not.toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Mostrar importes de Bancos'}));
  expect(screen.getByLabelText('Tope mensual ARS')).toHaveValue(333333);
  fireEvent.click(screen.getByRole('button',{name:/Ocultar importes de la pantalla/}));
  expect(screen.queryByLabelText('Tope mensual ARS')).not.toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

test('floating plus offers the same Add bank modal as the header', async () => {
  mount();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Mis bancos' })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Abrir acciones rápidas' }));
  fireEvent.click(within(document.getElementById('ltc-floating-actions'))
    .getByRole('button', { name: /Agregar banco/ }));
  expect(screen.getByRole('dialog', { name: 'Crear banco y completar datos' })).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Abrir acciones rápidas' })).not.toBeInTheDocument());
});

test('floating LITA action sends an owner-scoped banking context', async () => {
  mount();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Mis bancos' })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Abrir acciones rápidas' }));
  fireEvent.click(within(document.getElementById('ltc-floating-actions'))
    .getByRole('button', { name: /Preguntar a LITA/ }));
  expect(screen.getByTestId('lita-panel')).toHaveTextContent('banks');
  expect(screen.getByTestId('lita-panel')).toHaveAttribute('data-scope', 'banks-current-state');
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Abrir acciones rápidas' })).not.toBeInTheDocument());
});

const linkedStatementData = {
  subscribeBanks: [
    {id:'ciudad',code:'ciudad',name:'Banco Ciudad',active:true},
    {id:'santander',code:'santander',name:'Banco Santander',active:true},
  ],
  subscribeBankCards: [
    {id:'city-visa',bankId:'ciudad',nickname:'Visa Ciudad',brand:'Visa',lastFour:'4555',closingDay:29,dueDay:13},
    {id:'santander-visa',bankId:'santander',nickname:'Visa Santander',brand:'Visa',lastFour:'4210',closingDay:25,dueDay:10},
  ],
  subscribeImportedStatements: [{
    id:'sha256-statement',expenseId:'expense-statement-1',period:'2026-10',
    institution:'Banco Ciudad',cardBrand:'Visa',closingDate:'2026-10-01',dueDate:'2026-10-13',
    itemCount:5,totals:{ARS:220356.4,USD:0},
  }],
  subscribeBankStatementLinks: [{
    id:'expense-statement-1',expenseId:'expense-statement-1',bankId:'ciudad',cardId:'city-visa',
  }],
};

const openCityStatement = async () => {
  await waitFor(()=>expect(screen.getByRole('heading',{name:'Mis bancos'})).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button',{name:/Banco Ciudad/}));
  fireEvent.click(screen.getByRole('button',{name:/Visa Ciudad/}));
  expect(screen.getByText('Resumen 2026-10 · Visa')).toBeInTheDocument();
  const linked = screen.getByRole('article', {name:'Resumen vinculado 2026-10 Visa'});
  expect(linked).toHaveClass('ltc-transaction-card','dark:bg-slate-800');
  expect(within(linked).getByRole('button',{name:'Revisar resumen'})).toHaveAttribute('aria-expanded','false');
  expect(within(linked).queryByRole('button',{name:'Corregir vínculo del resumen 2026-10'})).not.toBeInTheDocument();
  fireEvent.click(within(linked).getByRole('button',{name:'Revisar resumen'}));
};

test('a linked statement exposes correction and updates only its link to a different bank', async () => {
  arrange(linkedStatementData);
  banking.reassignStatementBankLink.mockResolvedValue(undefined);
  mount();
  await openCityStatement();
  fireEvent.click(screen.getByRole('button',{name:'Corregir vínculo del resumen 2026-10'}));
  expect(screen.getByRole('dialog',{name:'Corregir vínculo del resumen 2026-10'})).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Nuevo banco del resumen'),{target:{value:'santander'}});
  fireEvent.change(screen.getByLabelText('Nueva tarjeta del resumen'),{target:{value:'santander-visa'}});
  fireEvent.click(screen.getByRole('button',{name:'Guardar nueva asociación'}));
  await waitFor(()=>expect(banking.reassignStatementBankLink).toHaveBeenCalledWith(
    'test-private-user','expense-statement-1','santander','santander-visa'));
  expect(banking.unlinkStatementBank).not.toHaveBeenCalled();
  expect(banking.saveStatementBankLink).not.toHaveBeenCalled();
});

test('unlinking a linked statement requires explicit confirmation and never reimports PDFs', async () => {
  arrange(linkedStatementData);
  banking.unlinkStatementBank.mockResolvedValue(undefined);
  mount();
  await openCityStatement();
  fireEvent.click(screen.getByRole('button',{name:'Corregir vínculo del resumen 2026-10'}));
  fireEvent.click(screen.getByRole('button',{name:'Desvincular resumen'}));
  expect(banking.unlinkStatementBank).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Sí, desvincular'}));
  await waitFor(()=>expect(banking.unlinkStatementBank).toHaveBeenCalledWith(
    'test-private-user','expense-statement-1'));
  expect(require('../services/cardStatementService').saveReviewedStatement).not.toHaveBeenCalled();
  expect(require('../actionCreators/databaseActions').storeDataAction).not.toHaveBeenCalled();
});

test('Bancos uses the same first-read hierarchy as Transacciones and shared header actions', async () => {
  mount();
  await waitFor(() => expect(screen.getByRole('heading', { name:'Mis bancos' })).toBeInTheDocument());
  const hero=screen.getByRole('heading',{name:'Bancos y tarjetas'}).closest('section');
  expect(within(hero).getByRole('button',{name:'Agregar banco'})).toBeInTheDocument();
  expect(within(hero).getByRole('button',{name:'Mostrar importes de la pantalla'})).toHaveAttribute('aria-pressed','true');
  expect(hero).toHaveClass('bg-white','dark:bg-slate-800');
  const workspace=document.getElementById('banks-workspace');
  expect(workspace).toHaveClass('grid','lg:grid-cols-3');
  const ids=['bank-balances','bank-management','bank-spending-alerts'];
  const elements=ids.map(id=>document.getElementById(id));
  elements.forEach(element=>expect(element).not.toBeNull());
  expect(elements[0].compareDocumentPosition(elements[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(elements[1].compareDocumentPosition(elements[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(elements[1]).toHaveClass('lg:col-span-2','lg:row-span-2');
  expect(elements[0]).toHaveClass('dark:bg-slate-800');
  expect(elements[1]).toHaveClass('dark:bg-slate-800');
  expect(elements[2]).toHaveClass('dark:bg-slate-800');
});

test('Bancos keeps PDF linking beneath the dashboard, not ahead of the bank activity', async () => {
  mount();
  await waitFor(() => expect(screen.getByRole('heading',{name:'Mis bancos'})).toBeInTheDocument());
  const workspace=document.getElementById('banks-workspace');
  const importSection=document.getElementById('bank-imported-statements');
  expect(importSection).not.toBeNull();
  expect(workspace.contains(importSection)).toBe(false);
  expect(workspace.compareDocumentPosition(importSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('pending PDF link is read-only until confirmation; saves only the selected bank/card association', async () => {
  arrange({...linkedStatementData,subscribeBankStatementLinks:[]});
  banking.saveStatementBankLink.mockResolvedValue(undefined);
  mount();
  await waitFor(()=>expect(screen.getByRole('heading',{name:'Vincular resúmenes a tarjetas'})).toBeInTheDocument());
  const pending=screen.getByRole('article',{name:'Resumen pendiente 2026-10'});
  expect(within(pending).getByRole('button',{name:'Revisar vínculo'})).toBeInTheDocument();
  expect(within(pending).getByLabelText('Totales de resumen por moneda')).toHaveTextContent('ARS •••• · USD ••••');
  expect(within(pending).queryByLabelText('Tarjeta para 2026-10')).not.toBeInTheDocument();
  fireEvent.click(within(pending).getByRole('button',{name:'Revisar vínculo'}));
  fireEvent.click(within(pending).getByRole('button',{name:'Usar sugerencia'}));
  expect(banking.saveStatementBankLink).not.toHaveBeenCalled();
  fireEvent.click(within(pending).getByRole('button',{name:'Revisar asociación'}));
  const dialog=screen.getByRole('dialog',{name:'Confirmar vínculo del resumen 2026-10'});
  expect(dialog).toHaveTextContent('Banco Ciudad · Visa Ciudad');
  expect(banking.saveStatementBankLink).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button',{name:'Confirmar vínculo'}));
  await waitFor(()=>expect(banking.saveStatementBankLink).toHaveBeenCalledWith(
    'test-private-user','expense-statement-1','ciudad','city-visa'));
  expect(banking.saveStatementBankLink).toHaveBeenCalledTimes(1);
  expect(require('../actionCreators/databaseActions').storeDataAction).not.toHaveBeenCalled();
  expect(require('../services/cardStatementService').saveReviewedStatement).not.toHaveBeenCalled();
  expect(banking.saveManualCardCharge).not.toHaveBeenCalled();
});

test('linked statements redact totals and exclude the PDF drilldown while banking privacy is hidden',async()=>{
  arrange(linkedStatementData);
  mount();
  await openCityStatement();
  const linked=screen.getByRole('article',{name:'Resumen vinculado 2026-10 Visa'});
  expect(within(linked).getByLabelText('Totales del resumen vinculado por moneda'))
    .toHaveTextContent('ARS •••• · USD ••••');
  expect(within(linked).getByText(/Mostrá los importes en Bancos/)).toBeInTheDocument();
  expect(within(linked).queryByRole('button',{name:'Ver consumos del resumen'})).not.toBeInTheDocument();
  expect(within(linked).getByRole('button',{name:'Corregir vínculo del resumen 2026-10'})).toBeInTheDocument();
  expect(banking.reassignStatementBankLink).not.toHaveBeenCalled();
  expect(banking.saveStatementBankLink).not.toHaveBeenCalled();
});
