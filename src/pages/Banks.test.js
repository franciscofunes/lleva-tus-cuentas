import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Banks from './Banks';

jest.mock('react-redux', () => ({
  useDispatch: () => (action) => typeof action === 'function' ? action : undefined,
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
  expect(screen.getByText(/Usá el botón \+ del encabezado/)).toBeInTheDocument();
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
  expect(screen.getByText('Alias: cuenta')).toBeInTheDocument();
  const cardToggle = screen.getByRole('button', { name: /Visa Gold/ });
  expect(cardToggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(cardToggle);
  expect(screen.getByText('Consumos registrados')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Agregar consumo manual/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Importar resumen PDF/ })).toBeInTheDocument();
});

test('privacy toggle masks both currencies and uses the existing shared KPI design', async () => {
  arrange({ subscribeBankAccounts: [{ id:'a',bankId:'b',currency:'ARS',balance:1234.5 }] });
  mount();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Saldos bancarios' })).toBeInTheDocument());
  expect(screen.getAllByText('••••').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name:/Mostrar importes/ }));
  await waitFor(() => expect(screen.getByText(/1\.234/)).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name:/Ocultar importes/ }));
  expect(screen.queryByText(/1\.234/)).not.toBeInTheDocument();
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
    .getByRole('button', { name: 'Preguntar a LITA' }));
  expect(screen.getByTestId('lita-panel')).toHaveTextContent('banks');
  expect(screen.getByTestId('lita-panel')).toHaveAttribute('data-scope', 'banks-current-state');
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Abrir acciones rápidas' })).not.toBeInTheDocument());
});
