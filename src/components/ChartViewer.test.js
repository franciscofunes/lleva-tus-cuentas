import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import ChartViewer from './ChartViewer';

const charts = {
  expenses: ({ chartData }) => <div>Gastos: {chartData.length} registros</div>,
  income: () => <div>Ingresos en pesos</div>,
  divisas: () => <div>Ingresos USD</div>,
  incomesVsExpenses: () => <div>Comparativa</div>,
  ingresoDivisas: () => <div>Evolución USD</div>,
};

function ChartFixture({ hideValues = false }) {
  const [selected, setSelected] = React.useState('expenses');
  return <div data-testid='clipped-parent' style={{ overflow: 'hidden' }}>
    <ChartViewer chartComponents={charts} selectedChart={selected} onSelect={setSelected}
      chartData={[{ id: 1 }, { id: 2 }]} categories={[]} hideValues={hideValues} />
  </div>;
}

describe('responsive chart viewer', () => {
  it('shows five accessible bullets, previous/next arrows and NO mobile combobox', () => {
    render(<ChartFixture />);
    const controls = screen.getByRole('group', { name: 'Seleccionar gráfico' });
    expect(within(controls).getAllByRole('button')).toHaveLength(7);
    expect(within(controls).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(controls).getByRole('button', { name: 'Ir a Gastos ARS' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(controls).getByRole('button', { name: 'Ir a Ingresos USD' }));
    expect(within(controls).getByRole('button', { name: 'Ir a Ingresos USD' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('Ingresos USD').length).toBeGreaterThan(1);
  });

  it('moves through chart bullets with arrows and wraps at either end', () => {
    render(<ChartFixture />);
    const controls = screen.getByRole('group', { name: 'Seleccionar gráfico' });
    const previous = within(controls).getByRole('button', { name: 'Gráfico anterior' });
    const next = within(controls).getByRole('button', { name: 'Gráfico siguiente' });
    fireEvent.click(next);
    expect(within(controls).getByRole('button', { name: 'Ir a Ingresos ARS' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(previous);
    expect(within(controls).getByRole('button', { name: 'Ir a Gastos ARS' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(previous);
    expect(within(controls).getByRole('button', { name: 'Ir a Evolución USD' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(next);
    expect(within(controls).getByRole('button', { name: 'Ir a Gastos ARS' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps bullet navigation inside the chart viewport below the chart', () => {
    render(<ChartFixture />);
    const viewport = screen.getByTestId('clipped-parent').querySelector('.ltc-chart-viewport');
    const controls = screen.getByRole('group', { name: 'Seleccionar gráfico' });
    const chart = screen.getByText('Gastos: 2 registros');
    expect(viewport).toHaveClass('w-full', 'min-w-0', 'max-w-full', 'overflow-hidden');
    expect(viewport.contains(controls)).toBe(true);
    expect(chart.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(controls).toHaveClass('w-full', 'min-w-0', 'max-w-full');
  });

  it('opens a genuine full-height 100dvh mobile modal outside clipping and restores focus', async () => {
    render(<ChartFixture />);
    const trigger = screen.getByRole('button', { name: 'Ampliar gráfico: Gastos ARS' });
    trigger.focus();
    fireEvent.click(trigger);
    const modal = screen.getByRole('dialog', { name: 'Gastos ARS' });
    expect(screen.getByTestId('clipped-parent')).not.toContainElement(modal);
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveClass('h-[100dvh]', 'w-full', 'max-w-full', 'rounded-none', 'sm:h-auto', 'sm:max-h-[90dvh]');
    expect(modal.parentElement).toHaveClass('h-[100dvh]', 'w-screen');
    expect(within(modal).getByText('Gastos: 2 registros')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(within(modal).getByRole('button', { name: 'Cerrar gráfico ampliado' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(trigger).toHaveFocus();
  });

  it('allows changing charts from fixed modal footer bullets, then closes by X', () => {
    render(<ChartFixture />);
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar gráfico: Gastos ARS' }));
    const dialog = screen.getByRole('dialog');
    const controls = within(dialog).getByRole('group', { name: 'Seleccionar gráfico' });
    fireEvent.click(within(controls).getByRole('button', { name: 'Gráfico siguiente' }));
    expect(within(dialog).getByText('Ingresos en pesos')).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Ingresos ARS' })).toBeInTheDocument();
    fireEvent.click(within(controls).getByRole('button', { name: 'Ir a Comparativa ARS' }));
    expect(within(dialog).getByRole('heading', { name: 'Comparativa ARS' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar gráfico ampliado' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('prevents chart data leaking through expanded mode when balances are hidden', () => {
    render(<ChartFixture hideValues />);
    expect(screen.queryByText(/Gastos: 2 registros/)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Los gráficos están ocultos');
    fireEvent.click(screen.getByRole('button', { name: /Ampliar gráfico/i }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByRole('status')).toHaveTextContent('Los gráficos están ocultos');
    expect(within(modal).queryByText('Gastos: 2 registros')).not.toBeInTheDocument();
    const controls = within(modal).getByRole('group', { name: 'Seleccionar gráfico' });
    fireEvent.click(within(controls).getByRole('button', { name: 'Gráfico siguiente' }));
    expect(within(modal).getByRole('status')).toHaveTextContent('Los gráficos están ocultos');
  });
});
