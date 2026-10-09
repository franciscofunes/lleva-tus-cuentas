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

describe('modern chart viewer', () => {
  it('replaces unlabeled dots with five accessible buttons', () => {
    render(<ChartFixture />);
    const controls = screen.getByRole('group', { name: 'Seleccionar gráfico' });
    expect(within(controls).getAllByRole('button')).toHaveLength(5);
    expect(within(controls).getByRole('button', { name: 'Gastos ARS' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(controls).getByRole('button', { name: 'Ingresos USD' }));
    expect(screen.getAllByText('Ingresos USD').length).toBeGreaterThan(1);
    expect(within(controls).getByRole('button', { name: 'Ingresos USD' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens a fullscreen responsive modal outside clipped cards and closes via Escape', async () => {
    render(<ChartFixture />);
    const trigger = screen.getByRole('button', { name: 'Ampliar gráfico: Gastos ARS' });
    trigger.focus();
    fireEvent.click(trigger);
    const modal = screen.getByRole('dialog', { name: 'Gastos ARS' });
    expect(screen.getByTestId('clipped-parent')).not.toContainElement(modal);
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(within(modal).getByText('Gastos: 2 registros')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(trigger).toHaveFocus();
  });

  it('can switch charts within the expanded modal, then close via X', () => {
    render(<ChartFixture />);
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar gráfico: Gastos ARS' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Comparativa ARS' }));
    expect(within(dialog).getByText('Comparativa')).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Comparativa ARS' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar gráfico ampliado' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render sensitive chart data with hidden balances', () => {
    render(<ChartFixture hideValues />);
    expect(screen.queryByText(/Gastos: 2 registros/)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Los gráficos están ocultos');
    fireEvent.click(screen.getByRole('button', { name: /Ampliar gráfico/i }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByRole('status')).toHaveTextContent('Los gráficos están ocultos');
    expect(within(modal).queryByText('Gastos: 2 registros')).not.toBeInTheDocument();
  });
});
