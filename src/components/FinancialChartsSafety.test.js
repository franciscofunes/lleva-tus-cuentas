import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import BarChartWrapper from './BarChartWrapper';
import IncomeChartWrapper from './IncomeChartWrapper';
import DivisasChartWrapper from './DivisasChartWrapper';
import IncomeExpenseLineChart from './IncomeExpenseLineChart';
import IngresoDivisasLineChart from './IngresoDivisasLineChart';

jest.mock('@tremor/react', () => ({
  AreaChart: ({ data }) => <div data-testid='line-chart'>Puntos: {data.length}</div>,
}));

const movements = [
  { category: null, amount: 100, selectedDate: '2026-10-01' },
  { amount: 50, selectedDate: '2026-10-02' },
  { category: 42, amount: 20, selectedDate: '2026-10-03' },
  { category: 'Comida', amount: '1250', selectedDate: '2026-10-04' },
  { category: 'Trabajo', amount: '2000', selectedDate: '2026-10-04' },
  { category: 'Ingreso divisas', amount: 0, currencyQuantity: 4, selectedDate: '2026-10-04' },
];

test.each([
  ['gastos', BarChartWrapper],
  ['ingresos', IncomeChartWrapper],
  ['divisas', DivisasChartWrapper],
  ['línea ARS', IncomeExpenseLineChart],
  ['línea USD', IngresoDivisasLineChart],
])('%s ignores malformed category records without throwing', (_name, Component) => {
  expect(() => render(<Component chartData={movements} categories={null} />)).not.toThrow();
});

test('expense chart still uses the category catalog for classification', () => {
  render(<BarChartWrapper chartData={movements} categories={[{ name: 'Comida', isExpense: true }]} />);
  expect(screen.getByText('Comida')).toBeInTheDocument();
  expect(screen.queryByText('Trabajo')).not.toBeInTheDocument();
});

test('income chart preserves classification of valid categories', () => {
  render(<IncomeChartWrapper chartData={movements} categories={[
    { name: 'Comida', isExpense: true }, { name: 'Trabajo', isExpense: false },
  ]} />);
  expect(screen.getByText('Trabajo')).toBeInTheDocument();
  expect(screen.queryByText('Comida')).not.toBeInTheDocument();
});

test('no categories or movements never crash a chart', () => {
  expect(() => render(<BarChartWrapper chartData={null} categories={null} />)).not.toThrow();
  expect(screen.getByText(/No hay movimientos registrados/)).toBeInTheDocument();
});
