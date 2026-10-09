import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import CategoryBreakdownChart, { chartMoney } from './CategoryBreakdownChart';

const data = [
  { name: 'Resumen tarjeta 💳', value: 1811161.94 },
  { name: 'Educación', value: 105000 },
  { name: 'Hogar', value: 101000 },
  { name: 'Servicios', value: 35803 },
  { name: 'Salud', value: 20000 },
  { name: 'Comercio', value: 9800 },
];

describe('CategoryBreakdownChart', () => {
  it('shows five categories and expands/collapses the remainder', () => {
    render(<CategoryBreakdownChart title='Gastos en pesos' data={data} />);
    expect(screen.getByRole('heading', { name: 'Gastos en pesos' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.queryByText('Comercio')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /Ver todas las categorías \(6\)/i });
    fireEvent.click(toggle);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText('Comercio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar menos' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menos' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('preserves exact underlying sums and uses Argentine peso formatting', () => {
    render(<CategoryBreakdownChart title='Gastos en pesos' data={data} currency='ARS' tone='expense' />);
    expect(screen.getByText(chartMoney(1811161.94, 'ARS'))).toBeInTheDocument();
    expect(chartMoney(1811161.94, 'ARS')).toContain('1.811.161,94');
    expect(screen.getByText('Resumen tarjeta 💳')).toBeInTheDocument();
  });

  it('uses USD independently without conversion or rounding to ARS', () => {
    render(<CategoryBreakdownChart title='Ingresos en dólares' data={[{ name: 'Ingreso divisas', value: 151.25 }]} currency='USD' tone='usd' />);
    expect(screen.getByText(chartMoney(151.25, 'USD'))).toBeInTheDocument();
    expect(screen.getByText(/Distribución por categoría · USD/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver todas las categorías/i })).not.toBeInTheDocument();
  });

  it('stacks long category labels and full money values within narrow card width', () => {
    render(<CategoryBreakdownChart
      title='Gastos en pesos'
      data={[{ name: 'Categoría extremadamente extensa para móvil', value: 123456789012.12 }]}
      currency='ARS'
    />);
    const card = screen.getByRole('heading', { name: 'Gastos en pesos' }).parentElement;
    expect(card).toHaveClass('w-full', 'min-w-0', 'max-w-full', 'overflow-hidden');
    const label = screen.getByText('Categoría extremadamente extensa para móvil');
    const money = screen.getByText(chartMoney(123456789012.12, 'ARS'));
    expect(label.parentElement).toHaveClass('flex-col', 'sm:flex-row', 'min-w-0');
    expect(money).toHaveClass('w-full', 'min-w-0', 'max-w-full', 'break-words');
    expect(money).toHaveTextContent('123.456.789.012,12');
  });

  it('has a clear empty state rather than an empty white card', () => {
    render(<CategoryBreakdownChart title='Ingresos en pesos' data={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('No hay movimientos registrados');
  });
});
