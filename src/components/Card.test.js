import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import Card from './Card';

// Card imports an action creator; unit tests must not initialize real Firebase.
jest.mock('../shared/config/firebase/firebase.config', () => ({
  auth: { currentUser: null },
  firestore: { collection: jest.fn() },
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));
jest.mock('../actionCreators/databaseActions', () => ({
  deleteCardAction: jest.fn(id => ({ type: 'DELETE_REQUEST', id })),
}));
const { deleteCardAction } = require('../actionCreators/databaseActions');

jest.mock('./CardStatementDetails', () => jest.fn(() => <span data-testid='statement-drilldown'>Consumos PDF</span>));
const CardStatementDetails = require('./CardStatementDetails');
jest.mock('./InfoTooltip', () => ({ content }) => <span data-testid='category-tooltip'>{content}</span>);

const openDetails = (name = 'Movimiento importado') => fireEvent.click(screen.getByRole('button', { name: 'Ver detalles de ' + name }));

const basicProps = {
  id: 'test-movement',
  name: 'Movimiento importado',
  amount: '1250',
  selectedDate: '2026-10-10',
};

test('missing category and categories while loading never crash a transaction card', () => {
  render(<Card {...basicProps} />);
  expect(screen.getByText('Sin categoría')).toBeInTheDocument();
  expect(screen.getByText(/1,?250/)).toBeInTheDocument();
});

test('legacy non-string category does not crash rendering', () => {
  render(<Card {...basicProps} category={{ oldValue: true }} categories={[]} />);
  expect(screen.getByText('Sin categoría')).toBeInTheDocument();
});

test('normal card still renders its expense sign when the category exists', () => {
  render(<Card {...basicProps} category='Salud' categories={[{ name: 'Salud', isExpense: true }]} />);
  expect(screen.getByText(/-1,?250/)).toBeInTheDocument();
});

test('each transaction has a readable, distinct card surface and accessible touch targets', () => {
  render(<Card {...basicProps} category='Salud' comment='Consulta médica' categories={[{ name: 'Salud', isExpense: true }]} />);
  const card = screen.getByRole('article', { name: 'Movimiento: Movimiento importado' });
  expect(card).toHaveClass('rounded-2xl', 'bg-white', 'dark:bg-slate-800', 'dark:border-slate-700', 'ltc-transaction-card');
  expect(screen.getByRole('heading', { name: 'Movimiento importado', level: 3 })).toHaveClass('text-slate-900', 'dark:text-slate-50');
  expect(screen.queryByText('Consulta médica')).not.toBeInTheDocument();
  openDetails();
  expect(screen.getByText('Consulta médica')).toHaveClass('text-sm');
  const edit = screen.getByRole('button', { name: 'Editar Movimiento importado' });
  const remove = screen.getByRole('button', { name: 'Eliminar Movimiento importado' });
  expect(edit).toHaveClass('h-11', 'w-11');
  expect(remove).toHaveClass('h-11', 'w-11');
});

test('credit-card summaries retain closing and expiration dates and summary details', () => {
  render(<Card {...basicProps} category='Resumen tarjeta 💳' selectedCloseDate='2026-10-31'
    selectedExpirationDate='2026-11-13' categories={[{ name: 'Resumen tarjeta 💳', isExpense: true }]} />);
  expect(screen.queryByText('Fecha de Cierre:')).not.toBeInTheDocument();
  openDetails();
  expect(screen.getByText('Fecha de Cierre:')).toBeInTheDocument();
  expect(screen.getByText('31/10/2026')).toBeInTheDocument();
  expect(screen.getByText('Fecha de vencimiento:')).toBeInTheDocument();
  expect(screen.getByText('13/11/2026')).toBeInTheDocument();
});

test('currency purchase keeps the original quantity, exchange rate and ARS amount', () => {
  render(<Card {...basicProps} amount='158064' category='Compra divisas' currencyQuantity='100'
    currencyExchangeRate='1580.64' categories={[{ name: 'Compra divisas', isExpense: true }]} />);
  openDetails();
  expect(screen.getByText('Cantidad:')).toBeInTheDocument();
  expect(screen.getByText('$USD 100')).toBeInTheDocument();
  expect(screen.getByText('Cotización:')).toBeInTheDocument();
  expect(screen.getByText('$AR 1580.64')).toBeInTheDocument();
  expect(screen.getByText(/-158,?064/)).toBeInTheDocument();
});

test('services with configured due dates preserve their due-date label and paid status', () => {
  render(<Card {...basicProps} category='Servicio de Internet' selectedDate='2026-10-13'
    categories={[{ name: 'Servicio de Internet', isExpense: true, dateBehavior: 'due-date' }]}
    paymentStatus='paid' paidDueDate='2026-10-13' paidAt='2026-10-12' />);
  expect(screen.getByText('Fecha de vencimiento:')).toBeInTheDocument();
  expect(screen.queryByText('Fecha transacción:')).not.toBeInTheDocument();
  expect(screen.getByText('Pagado')).toBeInTheDocument();
  openDetails();
  expect(screen.getAllByText('13/10/2026').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText('12/10/2026')).toBeInTheDocument();
});

test('custom category metadata remains visible and readable for long entries', () => {
  render(<Card {...basicProps} category='Mi categoría personalizada' comment='Una descripción larga sin truncamiento'
    customDetails={{ reference: 'REFERENCIA-CON-IDENTIFICADOR-LARGO-123456', paymentMethod: 'transferencia' }}
    categories={[{ name: 'Mi categoría personalizada', isExpense: true }]} />);
  const card = screen.getByRole('article');
  expect(card).toHaveClass('min-w-0');
  expect(screen.queryByLabelText('Datos adicionales de la transacción')).not.toBeInTheDocument();
  openDetails();
  expect(screen.getByLabelText('Datos adicionales de la transacción')).toBeInTheDocument();
  expect(screen.getByText('REFERENCIA-CON-IDENTIFICADOR-LARGO-123456')).toBeInTheDocument();
  expect(screen.getByText('Transferencia')).toBeInTheDocument();
});

test('edit action still opens the same form and restores the transaction data', () => {
  const setters = Object.fromEntries([
    'setName', 'setAmount', 'setComment', 'setCategory', 'setCustomDetails',
    'setHasSavedCustomDetails', 'setSelectedDate', 'setSelectedCloseDate',
    'setSelectedExpirationDate', 'setCurrencyQuantity', 'setCurrencyExchangeRate',
    'setIsCreditCardCategory', 'setIsBuyCurrenciesCategory', 'setIsCurrencyIncomeCategory',
    'setIsSellCurrenciesCategory', 'setExpenseId', 'setEdit', 'openModal'
  ].map((name) => [name, jest.fn()]));
  render(<Card {...basicProps} {...setters} category='Compra divisas' comment='Prueba de edición'
    customDetails={{ reference: 'ABC' }} currencyQuantity='100' currencyExchangeRate='1580.64' />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar Movimiento importado' }));
  expect(setters.openModal).toHaveBeenCalledTimes(1);
  expect(setters.setName).toHaveBeenCalledWith('Movimiento importado');
  expect(setters.setCustomDetails).toHaveBeenCalledWith({ reference: 'ABC' });
  expect(setters.setCurrencyQuantity).toHaveBeenCalledWith('100');
  expect(setters.setIsBuyCurrenciesCategory).toHaveBeenCalledWith(true);
  expect(setters.setEdit).toHaveBeenCalledWith(true);
});

test('dark transactions use opaque slate surfaces and readable semantic text in every row', () => {
  const { container } = render(<Card {...basicProps} category='Servicio de Internet'
    selectedCloseDate='2026-10-31' selectedExpirationDate='2026-11-13'
    comment='Descripción de un servicio' paymentStatus='paid'
    customDetails={{ reference: 'ABC123' }}
    categories={[{ name: 'Servicio de Internet', isExpense: true, dateBehavior: 'due-date' }]} />);
  const card = container.querySelector('.ltc-transaction-card');
  expect(card).toHaveClass('dark:bg-slate-800', 'dark:border-slate-700');
  expect(card).not.toHaveClass('bg-slate-50/80', 'dark:bg-slate-900/45');
  expect(screen.getByRole('heading', { name: 'Movimiento importado', level: 3 })).toHaveClass('dark:text-slate-50');
  openDetails();
  expect(screen.getByText('Descripción de un servicio')).toHaveClass('dark:text-slate-200');
  expect(screen.getByLabelText('Datos adicionales de la transacción'))
    .toHaveClass('dark:bg-slate-900/70', 'dark:text-slate-200');
  expect(Array.from(card.querySelectorAll('p')).filter((row) => row.className.includes('dark:text-slate-200')).length).toBeGreaterThanOrEqual(1);
  expect(card.querySelector('.dark\\:text-slate-200')).not.toBeNull();
});

test('real html.dark theme selector enforces the opaque card background at CSS level', () => {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
  const fallback = css.match(/html\.dark\s+\.ltc-transaction-card\s*\{[^}]+\}/)?.[0];
  expect(fallback).toBeTruthy();
  const style = document.createElement('style');
  style.textContent = fallback;
  document.head.appendChild(style);
  document.documentElement.classList.add('dark');
  try {
    render(<Card {...basicProps} />);
    const card = screen.getByRole('article');
    expect(getComputedStyle(card).backgroundColor).toBe('rgb(30, 41, 59)');
    expect(getComputedStyle(card).color).toBe('rgb(248, 250, 252)');
  } finally {
    style.remove();
    document.documentElement.classList.remove('dark');
  }
});

test('new due-date categories display transaction and optional expiration dates independently', () => {
  const category = { name: 'Alquiler comercial', isExpense: true, dateBehavior: 'separate-due-date' };
  render(<Card {...basicProps} category={category.name} categories={[category]}
    selectedDate='2026-10-10' selectedExpirationDate='2026-10-20' />);
  expect(screen.getByText(/Fecha transacción/)).toBeInTheDocument();
  expect(screen.getByText(/Fecha de vencimiento:/)).toBeInTheDocument();
  expect(screen.getByText('10/10/2026')).toBeInTheDocument();
  expect(screen.getByText('20/10/2026')).toBeInTheDocument();
});

test('new due-date category without an optional expiration has no placeholder or invalid date', () => {
  const category = { name: 'Alquiler comercial', isExpense: true, dateBehavior: 'separate-due-date' };
  render(<Card {...basicProps} category={category.name} categories={[category]}
    selectedDate='2026-10-10' selectedExpirationDate='' />);
  expect(screen.getByText(/Fecha transacción/)).toBeInTheDocument();
  expect(screen.queryByText(/Fecha de vencimiento:/)).not.toBeInTheDocument();
  expect(screen.queryByText('Invalid date')).not.toBeInTheDocument();
});

test('USD subscription is displayed in dollars and editor retains its native currency', () => {
  const setTransactionCurrency = jest.fn();
  render(<Card {...basicProps} category='Software USD' transactionCurrency='USD'
    categories={[{name:'Software USD',isExpense:true,currency:'USD'}]}
    setTransactionCurrency={setTransactionCurrency} openModal={jest.fn()} setName={jest.fn()}
    setAmount={jest.fn()} setCategory={jest.fn()} setComment={jest.fn()}
    setSelectedDate={jest.fn()} setSelectedCloseDate={jest.fn()} setSelectedExpirationDate={jest.fn()}
    setCurrencyQuantity={jest.fn()} setCurrencyExchangeRate={jest.fn()}
    setIsCreditCardCategory={jest.fn()} setIsBuyCurrenciesCategory={jest.fn()}
    setIsCurrencyIncomeCategory={jest.fn()} setIsSellCurrenciesCategory={jest.fn()}
    setExpenseId={jest.fn()} setEdit={jest.fn()} />);
  expect(screen.getByText(/\$USD -1,?250/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name:'Editar Movimiento importado' }));
  expect(setTransactionCurrency).toHaveBeenCalledWith('USD');
});

test('legacy transactions remain displayed in ARS after their category defaults to USD', () => {
  render(<Card {...basicProps} category='Software USD'
    categories={[{name:'Software USD',isExpense:true,currency:'USD'}]} />);
  expect(screen.getByText(/\$AR -1,?250/)).toBeInTheDocument();
});

test('transaction card tooltip displays the private category description, not the transaction comment', () => {
  render(<Card {...basicProps} category='Servicios bancarios USD' comment='Comisión del mes'
    categories={[{ name: 'Servicios bancarios USD', isExpense: true,
      description: 'Cargos de cuenta en moneda extranjera.' }]} />);
  expect(screen.getByTestId('category-tooltip')).toHaveTextContent('Cargos de cuenta en moneda extranjera.');
  openDetails();
  expect(screen.getByText('Comisión del mes')).toBeInTheDocument();
});

test('legacy category without a description never creates an empty tooltip', () => {
  render(<Card {...basicProps} category='Antigua'
    categories={[{ name: 'Antigua', isExpense: true }]} />);
  expect(screen.queryByTestId('category-tooltip')).not.toBeInTheDocument();
});

describe('transaction safety after audit', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    deleteCardAction.mockClear();
  });

  test('privacy hides amount and FX fields, keeps edit action available', () => {
    render(<Card {...basicProps} hideValues category='Compra divisas' currencyQuantity='100'
      currencyExchangeRate='1580.64' categories={[{ name: 'Compra divisas', isExpense: true }]} />);
    openDetails();
    expect(screen.getAllByText('••••••').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText(/1,?250/)).not.toBeInTheDocument();
    expect(screen.queryByText('$USD 100')).not.toBeInTheDocument();
    expect(screen.queryByText('$AR 1580.64')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Movimiento importado' })).toBeInTheDocument();
  });

  test('privacy also masks USD income and hides custom details and PDF drilldown', () => {
    const { rerender } = render(<Card {...basicProps} hideValues category='Ingreso divisas'
      currencyQuantity='9753.22' customDetails={{ reference:'EXTRAS-IMPORTANTES' }}
      categories={[{name:'Ingreso divisas',isExpense:false}]} />);
    expect(screen.getByText('••••••')).toBeInTheDocument();
    expect(screen.queryByText('$USD 9753.22')).not.toBeInTheDocument();
    expect(screen.queryByText('EXTRAS-IMPORTANTES')).not.toBeInTheDocument();
    rerender(<Card {...basicProps} hideValues category='Resumen tarjeta 💳'
      categories={[{name:'Resumen tarjeta 💳',isExpense:true}]} />);
    expect(screen.queryByText('Ver consumos del resumen')).not.toBeInTheDocument();
  });

  test('delete is requested through the page and never calls Firestore on first tap', () => {
    const onRequestDelete = jest.fn();
    render(<Card {...basicProps} onRequestDelete={onRequestDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Movimiento importado' }));

    expect(onRequestDelete).toHaveBeenCalledWith({
      id: 'test-movement',
      name: 'Movimiento importado',
      isCardSummary: false,
    });
    expect(onRequestDelete).toHaveBeenCalledTimes(1);
    expect(deleteCardAction).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('missing comment is omitted rather than displaying an empty row', () => {
    render(<Card {...basicProps} comment='' />);
    expect(screen.queryByText('Descripción:')).not.toBeInTheDocument();
  });
});


test('first scan row shows full transaction identity and native currency amount without truncation', () => {
  const longName = 'Servicio de software recurrente con un nombre especialmente largo';
  render(<Card {...basicProps} name={longName} amount='9876543210.25' transactionCurrency='USD'
    category='Software USD' categories={[{ name: 'Software USD', isExpense: true }]} />);
  const title = screen.getByRole('heading', { name: longName, level: 3 });
  const value = screen.getByText(/\$USD -9,?876,?543,?210/);
  expect(title.parentElement).toContainElement(value);
  expect(title).toHaveClass('break-words');
  expect(value).toHaveClass('break-all', 'sm:max-w-[48%]', 'tabular-nums');
});

test('deleting a card summary carries the retained linked-PDF warning through to the modal', () => {
  const onRequestDelete = jest.fn();
  render(<Card {...basicProps} category='Resumen tarjeta 💳' onRequestDelete={onRequestDelete} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar Movimiento importado' }));
  expect(onRequestDelete).toHaveBeenCalledWith({
    id: 'test-movement', name: 'Movimiento importado', isCardSummary: true,
  });
});

describe('compact transaction details (issue #225)', () => {
  test('ordinary movement shows identity, exact native amount, category and date without expanded clutter', () => {
    render(<Card {...basicProps} name='Compra del supermercado' category='Comida'
      transactionCurrency='USD' comment='Pago realizado desde billetera'
      categories={[{ name:'Comida', isExpense:true }]} />);
    const card = screen.getByRole('article');
    const disclosure = screen.getByRole('button', { name: 'Ver detalles de Compra del supermercado' });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(card).toHaveTextContent('Comida');
    expect(card).toHaveTextContent('10/10/2026');
    expect(card).toHaveTextContent('$USD -1,250');
    expect(screen.queryByText('Pago realizado desde billetera')).not.toBeInTheDocument();
    fireEvent.click(disclosure);
    expect(screen.getByText('Pago realizado desde billetera')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar detalles de Compra del supermercado' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Detalles de Compra del supermercado' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar detalles de Compra del supermercado' }));
    expect(screen.queryByText('Pago realizado desde billetera')).not.toBeInTheDocument();
  });

  test('disclosures are independent with unique accessible relationship IDs', () => {
    render(<div>
      <Card {...basicProps} id='first' name='Servicio A' comment='Nota A' />
      <Card {...basicProps} id='second' name='Servicio B' comment='Nota B' />
    </div>);
    const first = screen.getByRole('button', { name: 'Ver detalles de Servicio A' });
    const second = screen.getByRole('button', { name: 'Ver detalles de Servicio B' });
    expect(first).toHaveAttribute('aria-controls');
    expect(second).toHaveAttribute('aria-controls');
    expect(first.getAttribute('aria-controls')).not.toBe(second.getAttribute('aria-controls'));
    fireEvent.click(first);
    expect(screen.getByText('Nota A')).toBeInTheDocument();
    expect(screen.queryByText('Nota B')).not.toBeInTheDocument();
    expect(second).toHaveAttribute('aria-expanded', 'false');
  });

  test('card statement does not load PDF-linked details until explicitly expanded', () => {
    CardStatementDetails.mockClear();
    render(<Card {...basicProps} category='Resumen tarjeta 💳' selectedCloseDate='2026-10-31'
      selectedExpirationDate='2026-11-13' categories={[{name:'Resumen tarjeta 💳',isExpense:true}]} />);
    expect(screen.getByText('13/11/2026')).toBeInTheDocument();
    expect(screen.queryByText('31/10/2026')).not.toBeInTheDocument();
    expect(CardStatementDetails).not.toHaveBeenCalled();
    openDetails();
    expect(CardStatementDetails).toHaveBeenCalled();
    expect(CardStatementDetails.mock.calls.some(([props]) => props.expenseId === 'test-movement')).toBe(true);
  });

  test('privacy never mounts extra private fields or statement drilldown, even after opening details', () => {
    CardStatementDetails.mockClear();
    render(<Card {...basicProps} hideValues category='Resumen tarjeta 💳'
      selectedCloseDate='2026-10-31' customDetails={{ reference: 'PRIVATE-1234' }}
      categories={[{name:'Resumen tarjeta 💳',isExpense:true}]} />);
    openDetails();
    expect(screen.queryByText('PRIVATE-1234')).not.toBeInTheDocument();
    expect(screen.queryByTestId('statement-drilldown')).not.toBeInTheDocument();
    expect(CardStatementDetails).not.toHaveBeenCalled();
    expect(screen.getByText('••••••')).toBeInTheDocument();
  });

  test('no disclosure appears when ordinary record has no secondary details', () => {
    render(<Card {...basicProps} category='Comida' categories={[{name:'Comida',isExpense:true}]} />);
    expect(screen.queryByRole('button', { name: /Ver detalles/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Movimiento importado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar Movimiento importado' })).toBeInTheDocument();
  });
});
