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
jest.mock('../components/GenericModal', () => {
  const React = require('react');
  return ({show,component,dialogLabel}) => show ? (
    <div role='dialog' aria-label={dialogLabel}>
      {React.isValidElement(component) ? component : React.createElement(component)}
    </div>
  ) : null;
});
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
    publishedYtdReturn:-4.2,monthlyReturns:{jan:'',feb:null,mar:'-2',apr:0},
    performance1Y:-3,realizedEarnings:0},
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

test('position editor has one modal-owned scroll region and sticky actions for narrow phones', async () => {
  mount();
  await getWorkspace();
  fireEvent.click(screen.getByRole('button',{name:'Agregar posición'}));
  const dialog=screen.getByRole('dialog');
  const form=within(dialog).getByTestId('portfolio-position-form');
  const actions=within(dialog).getByTestId('portfolio-form-actions');
  expect(form).not.toHaveClass('overflow-y-auto');
  expect(form.className).not.toMatch(/max-h-\[/);
  expect(form).toHaveClass('text-slate-900','dark:text-slate-50');
  expect(actions).toHaveClass('sticky','bottom-0','dark:bg-slate-900/95');
  expect(within(actions).getByRole('button',{name:'Agregar al portfolio'})).toHaveClass('min-h-[44px]');
  const importButton=within(dialog).getByRole('button',{name:'Importar desde captura o Markdown'});
  expect(importButton).toHaveClass('bg-violet-50','dark:bg-slate-800');
  fireEvent.click(importButton);
  expect(form).toContainElement(within(dialog).getByLabelText('Elegir captura para lectura local'));
  expect(form).toContainElement(actions);
  expect(service.createPortfolioPosition).not.toHaveBeenCalled();
});

test('a visible Portfolio shortcut targets an existing position and opens OCR review without saving', async () => {
  mount();
  await getWorkspace();
  const shortcut = screen.getByRole('region', { name: 'Importar captura de inversión' });
  const action = within(shortcut).getByRole('button', { name: 'Importar captura' });
  expect(action).toHaveClass('min-h-[44px]');
  expect(action).toBeDisabled();
  fireEvent.change(within(shortcut).getByLabelText('Posición para importar captura'), { target: { value: 'fci-1' } });
  expect(action).toBeEnabled();
  fireEvent.click(action);
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('Editar posición')).toBeInTheDocument();
  expect(within(dialog).getByLabelText('Elegir captura para lectura local')).toBeInTheDocument();
  expect(within(dialog).getByLabelText('Texto para enriquecer posición')).toBeInTheDocument();
  expect(service.updatePortfolioPosition).not.toHaveBeenCalled();
});

test('fixed deposit screenshot enriches an existing position even when its rates and dates are unchanged', async () => {
  const fixedDeposit={id:'deposit-1',institution:'Banco de prueba',name:'Plazo fijo USD',
    category:'Plazo fijo',currency:'USD',balance:10000,principal:10000,annualRate:2.5,
    effectiveRate:2.55,startDate:'2026-05-28',maturityDate:'2026-11-25',
    rateType:'TNA',trackingMode:'MATURITY',realizedEarnings:0};
  service.subscribePortfolioPositions.mockImplementation((uid,onData)=>{onData([...fixtures,fixedDeposit]);return jest.fn();});
  mount();
  await getWorkspace();
  const shortcut=screen.getByRole('region',{name:'Importar captura de inversión'});
  fireEvent.change(within(shortcut).getByLabelText('Posición para importar captura'),{target:{value:'deposit-1'}});
  fireEvent.click(within(shortcut).getByRole('button',{name:'Importar captura'}));
  const dialog=screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Texto para enriquecer posición'),{target:{value:[
    'Moneda: USD','Vencimiento: 25/11/26','Fecha inicio: 28/05/26',
    'Tasa anual: 2,5','Tasa efectiva: 2,55',
    'Intereses devengados: 445,62','Intereses totales previstos: 501,02',
    'Número de contrato: 941955','Renovación automática: No',
  ].join('\n')}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Comparar datos detectados'}));
  expect(within(dialog).getByRole('button',{name:'Aplicar campos seleccionados'})).toBeInTheDocument();
  expect(within(dialog).getAllByText('Intereses devengados (sin acreditar)').length).toBeGreaterThan(0);
  expect(within(dialog).getByText(/no aumentan el saldo ni las ganancias realizadas/i)).toBeInTheDocument();
  expect(service.updatePortfolioPosition).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button',{name:'Aplicar campos seleccionados'}));
  expect(within(dialog).getByLabelText('Intereses devengados (sin acreditar)')).toHaveValue(445.62);
  expect(within(dialog).getByLabelText('Intereses totales previstos')).toHaveValue(501.02);
  expect(within(dialog).getByLabelText('Número de contrato')).toHaveValue('941955');
  expect(within(dialog).getByLabelText('Renovación automática')).toHaveValue('NO');
  expect(service.updatePortfolioPosition).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button',{name:'Guardar cambios'}));
  await waitFor(()=>expect(service.updatePortfolioPosition).toHaveBeenCalledWith(mockUid,'deposit-1',expect.objectContaining({
    balance:'10000',realizedEarnings:'0',depositAccruedInterest:'445.62',
    depositTotalInterest:'501.02',depositContractNumber:'941955',depositAutoRenewal:'NO',
  })));
});

test('Portfolio shortcut can begin a new position with the screenshot reader already open', async () => {
  mount();
  await getWorkspace();
  const shortcut = screen.getByRole('region', { name: 'Importar captura de inversión' });
  fireEvent.change(within(shortcut).getByLabelText('Posición para importar captura'), { target: { value: '__new__' } });
  fireEvent.click(within(shortcut).getByRole('button', { name: 'Importar captura' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('Nueva posición')).toBeInTheDocument();
  expect(within(dialog).getByLabelText('Elegir captura para lectura local')).toBeInTheDocument();
  expect(service.createPortfolioPosition).not.toHaveBeenCalled();
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

test('FCI position card shows published negative YTD instead of a fabricated fixed monthly yield', async () => {
  mount();
  await getWorkspace();
  const fciCard = screen.getByRole('link', {name:'Abrir ficha de Fondo de prueba'}).closest('article');
  expect(within(fciCard).getByText('YTD publicado por el fondo')).toBeInTheDocument();
  expect(within(fciCard).getByText('-4.20%')).toHaveClass('text-rose-700', 'dark:text-rose-400');
  expect(within(fciCard).queryByText(/mes estimado|mes proyectado/i)).not.toBeInTheDocument();
  expect(within(fciCard).getByText(/no es ganancia realizada/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button',{name:'Ver detalles de Fondo de prueba'}));
  expect(within(fciCard).getByText(/Rend. 1A publicado: -3.00%/)).toHaveClass('text-rose-700', 'dark:text-rose-400');
  expect(within(fciCard).getByText(/Compuesto \(meses cargados\): -2.00%/)).toHaveClass('text-rose-700', 'dark:text-rose-400');

  fireEvent.click(screen.getByRole('button',{name:'Ocultar importes de la pantalla'}));
  expect(within(fciCard).queryByText('-4.20%')).not.toBeInTheDocument();
  expect(within(fciCard).getByText('••••')).toHaveClass('text-slate-900', 'dark:text-slate-50');
  expect(service.updatePortfolioPosition).not.toHaveBeenCalled();
});

test('FCI editor only compounds recorded months and treats an explicit zero as real data', async () => {
  mount();
  await getWorkspace();
  fireEvent.click(screen.getByRole('button',{name:'Agregar posición'}));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByRole('combobox',{name:'Tipo de activo'}), {target:{value:'FCI'}});
  expect(within(dialog).getByText('Sin rentabilidades mensuales cargadas.')).toBeInTheDocument();
  expect(within(dialog).getByText('Suma simple').nextSibling).toHaveTextContent('—');
  expect(within(dialog).getByText('Acumulado compuesto').nextSibling).toHaveTextContent('—');

  fireEvent.change(within(dialog).getByLabelText('Ene'), {target:{value:'0'}});
  expect(within(dialog).queryByText('Sin rentabilidades mensuales cargadas.')).not.toBeInTheDocument();
  expect(within(dialog).getByText('Suma simple').nextSibling).toHaveTextContent('0.00%');
  fireEvent.change(within(dialog).getByLabelText('Feb'), {target:{value:'-2'}});
  expect(within(dialog).getByText('Suma simple').nextSibling).toHaveTextContent('-2.00%');
  expect(within(dialog).getByText('Acumulado compuesto').nextSibling).toHaveTextContent('-2.00%');
  expect(within(dialog).getByText('Acumulado compuesto').nextSibling).toHaveClass('text-rose-700','dark:text-rose-300');
  fireEvent.change(within(dialog).getByLabelText('Feb'), {target:{value:''}});
  expect(within(dialog).getByText('Suma simple').nextSibling).toHaveTextContent('0.00%');
  expect(service.createPortfolioPosition).not.toHaveBeenCalled();
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

test('Portfolio quick-action dialogs have readable light/dark typography and accessible form controls', async () => {
  mount();
  await getWorkspace();

  fireEvent.click(screen.getByRole('button',{name:'Verificar saldo'}));
  let dialog=screen.getByRole('dialog',{name:'Confirmar saldo'});
  expect(within(dialog).getByRole('heading',{name:'Confirmar saldo'}).parentElement)
    .toHaveClass('font-sans','text-slate-900','dark:text-slate-50');
  expect(within(dialog).getByLabelText('Saldo actual')).toHaveClass('min-h-[44px]','text-base');
  expect(within(dialog).getByLabelText('Nota opcional')).toBeInTheDocument();
  expect(within(dialog).getByRole('button',{name:'Cancelar'})).toHaveClass('min-h-[44px]','focus-visible:ring-2');
  expect(within(dialog).getByRole('button',{name:'Confirmar saldo'})).toHaveClass('bg-emerald-700');
  fireEvent.click(within(dialog).getByRole('button',{name:'Cancelar'}));

  fireEvent.click(screen.getByRole('button',{name:'Actualizar tasa rápidamente'}));
  dialog=screen.getByRole('dialog',{name:'Actualizar tasa'});
  expect(within(dialog).getByLabelText('Tasa anual (%)')).toHaveClass('min-h-[44px]','text-base');
  expect(within(dialog).getByRole('button',{name:'Guardar tasa'})).toHaveClass('min-h-[44px]');
  fireEvent.click(within(dialog).getByRole('button',{name:'Cancelar'}));

  fireEvent.click(screen.getAllByRole('button',{name:'Eliminar posición'})[0]);
  dialog=screen.getByRole('dialog',{name:'Eliminar posición'});
  expect(within(dialog).getByText(/Esta acción no se puede deshacer/)).toHaveClass('text-slate-700','dark:text-slate-200');
  expect(within(dialog).getByRole('button',{name:'Cancelar'})).toHaveClass('bg-violet-600','min-h-[44px]');
  expect(within(dialog).getByRole('button',{name:'Eliminar'})).toHaveClass('border-rose-500','dark:text-rose-300');
  fireEvent.click(within(dialog).getByRole('button',{name:'Cancelar'}));

  expect(service.verifyPortfolioPosition).not.toHaveBeenCalled();
  expect(service.updatePortfolioPosition).not.toHaveBeenCalled();
  expect(service.deletePortfolioPosition).not.toHaveBeenCalled();
});

test('FCI valuation dialog uses native currency and readable surfaces in both themes', async () => {
  mount();
  await getWorkspace();
  fireEvent.click(screen.getByRole('button',{name:'Actualizar cuotaparte'}));
  const dialog=screen.getByRole('dialog',{name:'Actualizar cuotaparte'});
  expect(within(dialog).getByLabelText('Valor cuotaparte / NAV actual')).toHaveClass('text-base');
  expect(within(dialog).getByLabelText('Ganado informado acumulado')).toBeInTheDocument();
  const valuation=within(dialog).getByText('Valuación calculada · cuotapartes × NAV').parentElement;
  expect(valuation).toHaveClass('bg-slate-50','dark:bg-slate-900/70');
  expect(within(dialog).getByText(/se guarda por separado/)).toHaveClass('bg-blue-50','dark:bg-blue-500/10');
  expect(service.verifyPortfolioPosition).not.toHaveBeenCalled();
});

test('Cash with 0% stored is presented as liquid principal, not a monthly yield', async () => {
  service.subscribePortfolioPositions.mockImplementationOnce((uid, onData) => {
    onData([{ id:'cash-qa', institution:'Billetera QA', name:'Efectivo líquido',
      category:'Cash',currency:'USD',balance:25661.59,annualRate:0,rateType:'TNA',
      trackingMode:'MANUAL',liquidity:'Inmediata' }]);
    return jest.fn();
  });
  mount();
  await getWorkspace();
  const cash = screen.getByRole('link',{name:'Abrir ficha de Efectivo líquido'}).closest('article');
  expect(within(cash).getByText('Disponibilidad')).toBeInTheDocument();
  expect(within(cash).getByText('Efectivo sin rendimiento')).toHaveClass('text-slate-900','dark:text-slate-50');
  expect(within(cash).getByText('Inmediata')).toBeInTheDocument();
  expect(within(cash).queryByText('0.00%')).not.toBeInTheDocument();
  expect(within(cash).queryByText('TNA')).not.toBeInTheDocument();
  expect(within(cash).queryByText(/mes estimado|mes proyectado/)).not.toBeInTheDocument();
  expect(within(cash).getByRole('button',{name:'Verificar saldo'})).toBeInTheDocument();
  expect(within(cash).getByRole('button',{name:'Ver detalles de Efectivo líquido'})).toHaveClass('min-h-[44px]');
  expect(within(cash).getByRole('link',{name:'Abrir ficha de Efectivo líquido'})).toHaveAttribute('href','/portfolio/cash-qa');
});

test('Charts and tools have their own mobile gap and remain separate collapsible widgets', async () => {
  mount();
  await getWorkspace();
  const charts = document.getElementById('portfolio-charts');
  const tools = document.getElementById('portfolio-overview');
  const toolsSpacing = screen.getByTestId('portfolio-tools-spacing');
  expect(toolsSpacing).toHaveClass('mt-5');
  expect(toolsSpacing).toContainElement(tools);
  expect(tools).not.toHaveClass('mb-5');
  expect(charts.compareDocumentPosition(toolsSpacing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(charts).toHaveClass('rounded-2xl','dark:bg-slate-800');
  expect(tools).toHaveAttribute('aria-label','Métricas y exportaciones');
  expect(within(tools).getByRole('heading', { name: 'Métricas y exportaciones' })).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Gráficos/})).toHaveAttribute('aria-expanded');
});
