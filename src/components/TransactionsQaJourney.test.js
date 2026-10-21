import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SearchBar from './SearchBar';
import Card from './Card';
import { selectScopedTransactions, selectTransactionCards } from '../utils/transactionsPageView';
import { summarizeBimonetaryFlows } from '../utils/bimonetarySummary';
import { buildTransactionsExportSheets } from '../utils/transactionsExport';

// Synthetic financial data only. No Firebase client, user account or real PDF is initialized.
jest.mock('../utils/portfolioExport', () => ({
  exportWorkbookXlsx: jest.fn(), buildWorkbookXlsxBytes: jest.fn(),
}));
jest.mock('./CardStatementDetails', () => () => null);
jest.mock('./InfoTooltip', () => () => null);

const categories = [
  { name: 'Comida', isExpense: true },
  { name: 'Software USD', isExpense: true, currency: 'USD' },
  { name: 'Sueldo', isExpense: false },
  { name: 'Compra divisas', isExpense: true },
  { name: 'Resumen tarjeta', isExpense: true },
];
const docs = [
  { id: 'food', expenseName: 'Supermercado', category: 'Comida', amount: '2500.50', selectedDate: '2026-10-10' },
  { id: 'usd', expenseName: 'Software', category: 'Software USD', amount: '60.25', transactionCurrency: 'USD', selectedDate: '2026-10-12' },
  { id: 'salary', expenseName: 'Ingreso mensual', category: 'Sueldo', amount: '50000', selectedDate: '2026-10-11' },
  { id: 'exchange', expenseName: 'Dólares comprados', category: 'Compra divisas', amount: '28000', currencyQuantity: '20', currencyExchangeRate: '1400', selectedDate: '2026-10-13' },
  { id: 'summary', expenseName: 'Visa octubre', category: 'Resumen tarjeta', amount: '5000', selectedDate: '2026-10-09', selectedCloseDate: '2026-10-01', selectedExpirationDate: '2026-10-23' },
];

function TransactionsJourney({ onViewAll = () => {}, onRequestDelete = () => {} }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [direction, setDirection] = useState('desc');
  const [advancedCollapsed, setAdvancedCollapsed] = useState(true);
  const [visibleCount, setVisibleCount] = useState(2);
  const [privacy, setPrivacy] = useState(false);
  const filtered = selectScopedTransactions(docs, categories, { query, category, type });
  const cards = selectTransactionCards(filtered, { sortBy, sortDirection: direction, count: visibleCount });
  const flows = summarizeBimonetaryFlows(filtered, categories);
  const sheets = buildTransactionsExportSheets(filtered, categories, {
    period:'month', periodLabel:'octubre 2026', query, category, type,
  });

  return (
    <div>
      <SearchBar query={query} onQueryChange={setQuery}
        selectedCategory={category} onCategoryChange={setCategory}
        transactionType={type} onTypeChange={setType}
        categories={categories} resultCount={filtered.length} totalCount={docs.length}
        selectedFilter='month' periodDescription='octubre 2026'
        onClear={() => { setQuery(''); setCategory(''); setType('all'); }}
        onViewAll={onViewAll}
        sortBy={sortBy} onSortByChange={setSortBy}
        sortDirection={direction} onSortDirectionChange={setDirection}
        collapsed={advancedCollapsed} onToggle={() => setAdvancedCollapsed(value => !value)}
      />
      <button type='button' onClick={() => setPrivacy(value => !value)}>Alternar privacidad</button>
      <p data-testid='flow-ars'>{flows.spentArs}</p>
      <p data-testid='flow-usd'>{flows.spentUsd}</p>
      <p data-testid='purchased-usd'>{flows.purchasedUsd}</p>
      <p data-testid='spent-on-purchases'>{flows.spentOnUsdPurchasesArs}</p>
      <p data-testid='export-count'>{sheets.Movimientos.length - 1}</p>
      <p data-testid='listed-count'>{cards.length}</p>
      <p data-testid='export-currencies'>{sheets.Movimientos.slice(1).map(row => row[11]).join('|')}</p>
      <div aria-label='Tarjetas de resultados'>
        {cards.map((doc) => (
          <Card key={doc.id} id={doc.id} name={doc.expenseName} amount={doc.amount}
            transactionCurrency={doc.transactionCurrency}
            category={doc.category} categories={categories} selectedDate={doc.selectedDate}
            selectedCloseDate={doc.selectedCloseDate} selectedExpirationDate={doc.selectedExpirationDate}
            currencyQuantity={doc.currencyQuantity} currencyExchangeRate={doc.currencyExchangeRate}
            hideValues={privacy} onRequestDelete={onRequestDelete}
          />
        ))}
      </div>
      {cards.length < filtered.length && (
        <button type='button' onClick={() => setVisibleCount(n => n + 5)}>Cargar más movimientos</button>
      )}
    </div>
  );
}

test('filter chips and search narrow cards, ARS/USD flows, and every export row together', () => {
  render(<TransactionsJourney />);
  expect(screen.getByTestId('export-count')).toHaveTextContent('5');
  fireEvent.change(screen.getByRole('searchbox', { name:'Buscar movimientos' }), { target:{ value:'Software' } });
  expect(screen.getByTestId('listed-count')).toHaveTextContent('1');
  expect(screen.getByTestId('export-count')).toHaveTextContent('1');
  expect(screen.getByTestId('flow-ars')).toHaveTextContent('0');
  expect(screen.getByTestId('flow-usd')).toHaveTextContent('60.25');
  expect(screen.getByTestId('export-currencies')).toHaveTextContent('USD');
  expect(screen.getByRole('article', { name:'Movimiento: Software' })).toHaveTextContent('$USD -60.25');
  fireEvent.click(screen.getByRole('button', { name:'Quitar filtro de búsqueda' }));
  expect(screen.getByTestId('export-count')).toHaveTextContent('5');
  expect(screen.getByText('octubre 2026')).toBeInTheDocument();
});

test('category/type controls intersect, and currency purchases stay conversions rather than ordinary expenses', () => {
  render(<TransactionsJourney />);
  fireEvent.click(screen.getByRole('button', { name:'Expandir filtros avanzados y orden' }));
  fireEvent.change(screen.getByLabelText('Categoría'), { target:{ value:'Compra divisas' } });
  fireEvent.change(screen.getByLabelText('Tipo de movimiento'), { target:{ value:'expense' } });
  expect(screen.getByTestId('listed-count')).toHaveTextContent('1');
  expect(screen.getByTestId('export-count')).toHaveTextContent('1');
  expect(screen.getByTestId('purchased-usd')).toHaveTextContent('20');
  expect(screen.getByTestId('spent-on-purchases')).toHaveTextContent('28000');
  expect(screen.getByTestId('flow-ars')).toHaveTextContent('0');
  fireEvent.click(screen.getByRole('button', { name:'Ver detalles de Dólares comprados' }));
  expect(screen.getByText('$USD 20')).toBeInTheDocument();
  expect(screen.getByText('$AR 1400')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name:'Quitar filtro de categoría' }));
  expect(screen.getByLabelText('Tipo de movimiento')).toHaveValue('expense');
  expect(screen.getByText('octubre 2026')).toBeInTheDocument();
});

test('sorting and page size affect cards only, never financial reports or source records', () => {
  render(<TransactionsJourney />);
  expect(screen.getByTestId('listed-count')).toHaveTextContent('2');
  expect(screen.getByTestId('export-count')).toHaveTextContent('5');
  fireEvent.click(screen.getByRole('button', { name:'Expandir filtros avanzados y orden' }));
  fireEvent.change(screen.getByLabelText('Ordenar por'), { target:{ value:'amount' } });
  expect(screen.getByTestId('export-count')).toHaveTextContent('5');
  expect(screen.getByTestId('flow-usd')).toHaveTextContent('60.25');
  fireEvent.click(screen.getByRole('button', { name:'Cargar más movimientos' }));
  expect(screen.getByTestId('listed-count')).toHaveTextContent('5');
  expect(screen.getByTestId('export-count')).toHaveTextContent('5');
  expect(docs.map(row => row.id)).toEqual(['food', 'usd', 'salary', 'exchange', 'summary']);
});

test('privacy masks on-screen money without rewriting export rows or native currencies', () => {
  render(<TransactionsJourney />);
  fireEvent.change(screen.getByRole('searchbox'), { target:{ value:'Software' } });
  fireEvent.click(screen.getByRole('button', { name:'Alternar privacidad' }));
  const card = screen.getByRole('article', { name:'Movimiento: Software' });
  expect(card).toHaveTextContent('••••••');
  expect(card).not.toHaveTextContent('60.25');
  expect(screen.getByTestId('export-count')).toHaveTextContent('1');
  expect(screen.getByTestId('export-currencies')).toHaveTextContent('USD');
});

test('delete requests carry the original ID and opening history needs an explicit click', () => {
  const onDelete = jest.fn(), onViewAll = jest.fn();
  render(<TransactionsJourney onRequestDelete={onDelete} onViewAll={onViewAll} />);
  expect(onViewAll).not.toHaveBeenCalled();
  const cards=screen.getByRole('group', { name:'Tarjetas de resultados' });
  fireEvent.click(within(cards).getByRole('button', { name:'Eliminar Dólares comprados' }));
  expect(onDelete).toHaveBeenCalledWith({ id:'exchange', name:'Dólares comprados', isCardSummary:false });
  expect(onViewAll).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name:'Ver todo el historial' }));
  expect(onViewAll).toHaveBeenCalledTimes(1);
});
