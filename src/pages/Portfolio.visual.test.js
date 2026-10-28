import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Portfolio from './Portfolio';

const mockUid = 'qa-synthetic-investor';
jest.mock('react-redux', () => {
  const stableAuthState={auth:{user:{uid:'qa-synthetic-investor'},isFetching:false}};
  return {useSelector: (selector) => selector(stableAuthState)};
});
jest.mock('framer-motion', () => ({
  Reorder:{
    Group: ({children,className}) => <div className={className}>{children}</div>,
    Item: ({children,className}) => <article className={className}>{children}</article>,
  },
  useDragControls: () => ({start:jest.fn()}),
}));
jest.mock('../components/PortfolioCharts', () => () => <div data-testid='portfolio-charts-stub'/>);
jest.mock('../components/FinancialOverviewPanel', () => ({
  __esModule: true,
  default: ({id,title}) => <section id={id} aria-label={title}><h2>{title}</h2></section>,
}));
jest.mock('../components/LitaAssitantPanel', () => () => null);
jest.mock('../components/FloatingMenu', () => () => null);
jest.mock('../components/InfoTooltip', () => () => null);
jest.mock('../components/GenericModal', () => ({show,component}) => show ? <div role='dialog'>{component}</div> : null);
jest.mock('../components/PortfolioExportReady', () => () => null);
// The export implementation initializes TextEncoder at import time, unrelated to UI tests.
jest.mock('../utils/portfolioExport', () => ({
  preparePortfolioExport:jest.fn(),buildPortfolioLlmMarkdown:jest.fn(),
}));
jest.mock('../services/portfolioService', () => ({
  subscribePortfolioPositions:jest.fn(),
  subscribePortfolioSnapshots:jest.fn(),
  reorderPortfolioPositions:jest.fn(),
  createPortfolioPosition:jest.fn(),
  updatePortfolioPosition:jest.fn(),
  verifyPortfolioPosition:jest.fn(),
  deletePortfolioPosition:jest.fn(),
}));
const service = require('../services/portfolioService');
const fixtures=[
  {id:'remunerada-1', institution:'Banco sintético',name:'Cuenta remunerada USD',
    category:'Cuenta remunerada',currency:'USD',balance:1000,annualRate:2.5,rateType:'TNA',
    liquidity:'Inmediata',trackingMode:'DAILY_RATE',realizedEarnings:0},
  {id:'fci-1',institution:'Gestora sintética',name:'Fondo de prueba',
    category:'FCI',currency:'ARS',balance:20000,annualRate:0,rateType:'Variable',
    liquidity:'Rescate 24 h',trackingMode:'NAV',nav:20,shares:1000,ticker:'TEST-FCI',
    monthlyReturns:{jan:1},performance1Y:4,realizedEarnings:0},
];

beforeEach(() => {
  jest.clearAllMocks();
  try { localStorage.clear(); } catch { /* jsdom may restrict storage */ }
  service.subscribePortfolioPositions.mockImplementation((uid,onData) => {onData(fixtures);return jest.fn();});
  service.subscribePortfolioSnapshots.mockImplementation((uid,onData) => {onData([]);return jest.fn();});
});

const mount = () => render(<MemoryRouter initialEntries={['/portfolio']}><Portfolio /></MemoryRouter>);
const getWorkspace = async () => {
  await screen.findByRole('heading',{name:'Posiciones'});
  const workspace=document.getElementById('portfolio-workspace');
  expect(workspace).toBeInTheDocument();
  return workspace;
};

test('Portfolio reuses the identical Transactions/Banks header and always shows a primary mobile label', async () => {
  mount();
  await getWorkspace();
  const hero=screen.getByRole('heading',{name:'Cuentas e inversiones'}).closest('section');
  const add=within(hero).getByRole('button',{name:'Agregar posición'});
  expect(add).toHaveTextContent('Agregar posición');
  expect(add).toHaveClass('min-h-[44px]','bg-violet-600');
  expect(within(hero).getByRole('button',{name:'Ocultar importes de la pantalla'})).toHaveClass('h-11','w-11');
  fireEvent.click(within(hero).getByText('Más'));
  expect(within(hero).getByRole('link',{name:'Bancos'})).toHaveAttribute('href','/bancos');
  expect(within(hero).getByRole('link',{name:'Transacciones'})).toHaveAttribute('href','/transacciones');
  fireEvent.click(add);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).getByText('Nueva posición')).toBeInTheDocument();
});

test('position form reuses local screenshot reader and the existing editable comparison',async()=>{
  mount();
  await getWorkspace();
  fireEvent.click(screen.getByRole('button',{name:'Agregar posición'}));
  const dialog=screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button',{name:'Importar desde captura o Markdown'}));
  expect(within(dialog).getByLabelText('Elegir captura para lectura local')).toBeInTheDocument();
  expect(within(dialog).getByLabelText('Texto para enriquecer posición')).toBeInTheDocument();
  expect(within(dialog).getByRole('button',{name:'Comparar datos detectados'})).toBeDisabled();
});

test('summary precedes positions, positions span two columns, tools and export follow activity', async () => {
  mount();
  const workspace=await getWorkspace();
  expect(workspace).toHaveClass('grid','lg:grid-cols-3');
  const ids=['portfolio-summary','portfolio-positions','portfolio-charts'];
  const sections=ids.map(id=>document.getElementById(id));
  sections.forEach(x=>expect(workspace.contains(x)).toBe(true));
  expect(sections[0].compareDocumentPosition(sections[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(sections[1].compareDocumentPosition(sections[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(sections[1]).toHaveClass('lg:col-span-2','lg:row-span-2');
  const overview=document.getElementById('portfolio-overview');
  expect(workspace.contains(overview)).toBe(false);
  expect(workspace.compareDocumentPosition(overview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByText('Resumen por moneda')).toBeInTheDocument();
  expect(screen.getByText('Cuenta remunerada USD')).toBeInTheDocument();
  expect(screen.getByText('Fondo de prueba')).toBeInTheDocument();
});

test('FCI and remunerated secondary metadata are independent, lazy disclosures with unchanged classification', async () => {
  mount();
  await getWorkspace();
  expect(screen.queryByText('Ticker: TEST-FCI')).not.toBeInTheDocument();
  const fci=screen.getByRole('button',{name:'Ver detalles de Fondo de prueba'});
  const remunerada=screen.getByRole('button',{name:'Ver detalles de Cuenta remunerada USD'});
  expect(fci).toHaveAttribute('aria-expanded','false');
  expect(remunerada).toHaveAttribute('aria-expanded','false');
  fireEvent.click(fci);
  expect(screen.getByText('Ticker: TEST-FCI')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Ocultar detalles de Fondo de prueba'})).toHaveAttribute('aria-expanded','true');
  expect(remunerada).toHaveAttribute('aria-expanded','false');
  fireEvent.click(screen.getByRole('button',{name:'Ocultar detalles de Fondo de prueba'}));
  expect(screen.queryByText('Ticker: TEST-FCI')).not.toBeInTheDocument();
  expect(service.verifyPortfolioPosition).not.toHaveBeenCalled();
  expect(service.updatePortfolioPosition).not.toHaveBeenCalled();
});

test('privacy toggles amounts without changing positions or converting ARS into USD', async () => {
  mount();
  await getWorkspace();
  const privacy=screen.getByRole('button',{name:'Ocultar importes de la pantalla'});
  fireEvent.click(privacy);
  expect(screen.getByRole('button',{name:'Mostrar importes de la pantalla'})).toHaveAttribute('aria-pressed','true');
  expect(screen.getAllByText('••••••').length).toBeGreaterThan(0);
  expect(screen.getByText('Cuenta remunerada USD')).toBeInTheDocument();
  expect(screen.getByText('Fondo de prueba')).toBeInTheDocument();
  expect(service.updatePortfolioPosition).not.toHaveBeenCalled();
});

test('each position retains explicit verify and edit controls and accessible 44px drag handles', async () => {
  mount();
  await getWorkspace();
  expect(screen.getByRole('button',{name:/Reordenar Fondo de prueba/})).toHaveClass('h-11','w-11');
  expect(screen.getByRole('button',{name:/Reordenar Cuenta remunerada USD/})).toHaveClass('h-11','w-11');
  expect(screen.getByRole('button',{name:'Actualizar cuotaparte'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Verificar saldo'})).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:'Eliminar posición'})).toHaveLength(2);
});
