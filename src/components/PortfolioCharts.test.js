import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import PortfolioCharts from './PortfolioCharts';

jest.mock('@tremor/react', () => ({
  AreaChart: ({ valueFormatter, index }) =>
    <div role='img' aria-label={`Gráfico ${index}`} data-value={valueFormatter(10500.53)} />,
}));

const positions = [
  { id:'usd-1', institution:'Banco', name:'Cuenta USD', currency:'USD',
    balance:10500.53, annualRate:1.8, rateType:'TNA', realizedEarnings:0, lastEarning:0.53 },
  { id:'ars-1', institution:'Banco', name:'Cuenta ARS', currency:'ARS',
    balance:200000, annualRate:20, rateType:'TNA', realizedEarnings:0 },
];
const snapshots = [
  { positionId:'usd-1', capturedAt:'2026-10-05T12:00:00Z', balance:10500 },
  { positionId:'usd-1', capturedAt:'2026-10-09T12:00:00Z', balance:10500.53 },
];

test('Portfolio nested charts use shared visual language with independent collapsibles', () => {
  const { container } = render(<PortfolioCharts positions={positions} snapshots={snapshots} />);
  const allocation = screen.getByRole('button', {name:/Distribución por posición/});
  const performance = screen.getByRole('button', {name:/Rendimiento por activo/});
  expect(allocation).toHaveAttribute('aria-expanded','true');
  expect(performance).toHaveAttribute('aria-expanded','true');
  expect(container.querySelector('#portfolio-chart-allocation')).toHaveClass('dark:bg-slate-900/60');
  expect(container.querySelector('#portfolio-chart-performance')).toHaveClass('dark:bg-slate-900/60');
  expect(screen.getByRole('heading', { level:3, name:'Distribución por posición' })).toBeInTheDocument();
  expect(screen.getByText('Cuenta USD')).toBeInTheDocument();
  fireEvent.click(allocation);
  expect(allocation).toHaveAttribute('aria-expanded','false');
  expect(screen.getByText('Saldo', {selector:'p'})).toBeInTheDocument();
  expect(screen.getByRole('combobox', {name:'Seleccionar activo para rendimiento'})).toBeInTheDocument();
  fireEvent.click(performance);
  expect(performance).toHaveAttribute('aria-expanded','false');
  expect(screen.queryByRole('combobox', {name:'Seleccionar activo para rendimiento'})).not.toBeInTheDocument();
});

test('currency switches preserve accurate currency denomination; privacy hides portfolio values', () => {
  const {rerender} = render(<PortfolioCharts positions={positions} snapshots={snapshots} />);
  const ars = screen.getByRole('button', {name:'ARS'});
  fireEvent.click(ars);
  expect(ars).toHaveAttribute('aria-pressed','true');
  expect(screen.getByText('Cuenta ARS')).toBeInTheDocument();
  expect(screen.queryByText('Cuenta USD')).not.toBeInTheDocument();
  rerender(<PortfolioCharts positions={positions} snapshots={snapshots} hideValues />);
  expect(screen.getAllByText('••••••').length).toBeGreaterThan(0);
  expect(screen.queryByText(/200\.000/)).not.toBeInTheDocument();
});

test('empty positions do not render a blank visual panel', () => {
  const {container}=render(<PortfolioCharts positions={[]} snapshots={[]} />);
  expect(container.firstChild).toBeNull();
});
