import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FinancialOverviewPanel from './FinancialOverviewPanel';
import { FaWallet } from 'react-icons/fa';

test('reusable financial panel shows both exports, KPI metrics, and working actions', () => {
  const excel = jest.fn(), copy = jest.fn();
  render(<FinancialOverviewPanel
    title='Portfolio de un vistazo'
    metrics={[
      { id: 'count', label: 'Posiciones', value: 8, icon: FaWallet },
      { id: 'currency', label: 'Monedas', value: 2, icon: FaWallet },
      { id: 'profit', label: 'Con ganancias', value: 5, icon: FaWallet },
    ]}
    actions={[
      { id: 'excel', type: 'excel', label: 'Exportar Excel', onClick: excel },
      { id: 'markdown', type: 'markdown', label: 'Copiar para Lita', onClick: copy },
    ]}
  />);
  expect(screen.getByRole('region', { name: 'Portfolio de un vistazo' })).toBeInTheDocument();
  expect(screen.getByText('8')).toBeInTheDocument();
  expect(screen.getByText('Monedas')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Copiar para Lita' }));
  expect(excel).toHaveBeenCalledTimes(1);
  expect(copy).toHaveBeenCalledTimes(1);
});

test('masked values and disabled exports remain safe and transparent', () => {
  const copy = jest.fn();
  render(<FinancialOverviewPanel title='Transacciones de un vistazo'
    privacyHidden
    metrics={[{ id: 'count', label: 'Movimientos', value: '••', icon: FaWallet }]}
    actions={[{ id: 'markdown', type: 'markdown', label: 'Copiar para Lita', onClick: copy, disabled: true }]}
  />);
  expect(screen.getByText('••')).toBeInTheDocument();
  expect(screen.getByText(/importes reales/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Copiar para Lita' }));
  expect(copy).not.toHaveBeenCalled();
});


function CollapsibleFixture({ initialCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  return (
    <FinancialOverviewPanel
      id='portfolio-overview'
      title='Portfolio de un vistazo'
      description='Exportá y analizá tus activos.'
      collapsed={collapsed}
      onToggle={() => setCollapsed((prev) => !prev)}
      metrics={[{ id: 'positions', label: 'Posiciones', value: 8, icon: FaWallet }]}
      actions={[{ id: 'excel', type: 'excel', label: 'Exportar Excel', onClick: jest.fn() }]}
    />
  );
}

test('collapses actions and KPIs while leaving the title and chevron toggle accessible', async () => {
  render(<CollapsibleFixture />);
  const toggle = screen.getByRole('button', { name: 'Portfolio de un vistazo: contraer' });
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(toggle).toHaveAttribute('aria-controls', 'portfolio-overview-content');
  expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeInTheDocument();

  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Portfolio de un vistazo: expandir' }))
    .toHaveAttribute('aria-expanded', 'false');
  await waitFor(() => {
    expect(screen.queryByRole('button', { name: 'Exportar Excel' })).not.toBeInTheDocument();
    expect(screen.queryByText('Posiciones')).not.toBeInTheDocument();
  });
  expect(screen.getByText('Portfolio de un vistazo')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Portfolio de un vistazo: expandir' }));
  expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeInTheDocument();
  expect(screen.getByText('Posiciones')).toBeInTheDocument();
});

test('starts collapsed when restored from user view preferences and expands via keyboard', () => {
  const { container } = render(<CollapsibleFixture initialCollapsed />);
  const toggle = screen.getByRole('button', { name: 'Portfolio de un vistazo: expandir' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const target = container.querySelector('#portfolio-overview-content');
  expect(toggle).toHaveAttribute('aria-controls', target.id);
  expect(target).toHaveAttribute('aria-hidden', 'true');
  expect(target).toBeEmptyDOMElement();
  expect(screen.queryByText('Posiciones')).not.toBeInTheDocument();
  toggle.focus();
  fireEvent.keyDown(toggle, { key: 'Enter' });
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Portfolio de un vistazo: contraer' }))
    .toHaveAttribute('aria-expanded', 'true');
  expect(target).toHaveAttribute('aria-hidden', 'false');
  expect(target.querySelector('[role="status"]')).not.toBeInTheDocument();
  expect(screen.getByText('Posiciones')).toBeInTheDocument();
});

test('uses KPI skeletons during requests, disables exports, and restores fresh values', async () => {
  const copy = jest.fn();
  const renderPanel = (isLoading, count) => (
    <FinancialOverviewPanel
      id='transactions-overview'
      title='Movimientos de un vistazo'
      isLoading={isLoading}
      metrics={[
        { id: 'count', label: 'Movimientos', value: count, icon: FaWallet },
        { id: 'category', label: 'Categorías', value: 10, icon: FaWallet },
        { id: 'due', label: 'Con vencimiento', value: 2, icon: FaWallet },
      ]}
      actions={[{ id: 'markdown', type: 'markdown', label: 'Copiar para Lita', onClick: copy }]}
    />
  );

  const { rerender } = render(renderPanel(true, 22));
  expect(screen.getByRole('region', { name: 'Movimientos de un vistazo' })).toHaveAttribute('aria-busy', 'true');
  expect(screen.getByRole('status', { name: 'Actualizando Movimientos' })).toBeInTheDocument();
  expect(screen.getByRole('status', { name: 'Actualizando Categorías' })).toBeInTheDocument();
  expect(screen.getByRole('status', { name: 'Actualizando Con vencimiento' })).toBeInTheDocument();
  expect(screen.queryByText('22')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Copiar para Lita' }));
  expect(copy).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Copiar para Lita' })).toBeDisabled();

  rerender(renderPanel(false, 2408));
  await waitFor(() => {
    expect(screen.getByText('2408')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Actualizando Movimientos' })).not.toBeInTheDocument();
  }, { timeout: 1200 });
  expect(screen.getByRole('region', { name: 'Movimientos de un vistazo' })).toHaveAttribute('aria-busy', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Copiar para Lita' }));
  expect(copy).toHaveBeenCalledTimes(1);
});

test('live KPI updates show a placeholder before revealing the latest count without stale values', async () => {
  const view = (count) => (
    <FinancialOverviewPanel
      title='Portfolio de un vistazo'
      metrics={[{ id: 'positions', label: 'Posiciones', value: count, icon: FaWallet }]}
    />
  );
  const { rerender } = render(view(8));
  expect(screen.getByText('8')).toBeInTheDocument();

  rerender(view(9));
  expect(screen.getByRole('status', { name: 'Actualizando Posiciones' })).toBeInTheDocument();
  expect(screen.queryByText('8')).not.toBeInTheDocument();

  rerender(view(10));
  expect(screen.getByRole('status', { name: 'Actualizando Posiciones' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument(), { timeout: 1200 });
  expect(screen.queryByText('9')).not.toBeInTheDocument();
});

test('privacy controls never show unmasked KPI values when loading ends or numbers update', () => {
  const panel = (value, loading) => (
    <FinancialOverviewPanel title='Movimientos de un vistazo' privacyHidden
      isLoading={loading}
      metrics={[{ id: 'count', label: 'Movimientos', value, icon: FaWallet }]} />
  );
  const { rerender } = render(panel('••', true));
  expect(screen.getByRole('status', { name: 'Actualizando Movimientos' })).toBeInTheDocument();
  rerender(panel('••', false));
  expect(screen.getByText('••')).toBeInTheDocument();
  expect(screen.queryByRole('status', { name: 'Actualizando Movimientos' })).not.toBeInTheDocument();
  expect(screen.queryByText('2408')).not.toBeInTheDocument();
});

test('collapsed overview keeps header accessible without rendering sensitive KPI placeholders', () => {
  const { container } = render(
    <FinancialOverviewPanel id='portfolio-overview' title='Portfolio de un vistazo'
      collapsed isLoading metrics={[{ id: 'count', label: 'Posiciones', value: 123, icon: FaWallet }]} />
  );
  const toggle = screen.getByRole('button', { name: 'Portfolio de un vistazo: expandir' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveAttribute('aria-controls', 'portfolio-overview-content');
  expect(container.querySelector('#portfolio-overview-content')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelector('#portfolio-overview-content')).toBeEmptyDOMElement();
  expect(screen.queryByRole('status', { name: 'Actualizando Posiciones' })).not.toBeInTheDocument();
});

test('tools share the compact Transactions header and leave inter-widget spacing to each page', () => {
  const { container, rerender } = render(
    <FinancialOverviewPanel id='portfolio-overview' title='Métricas y exportaciones'
      collapsed onToggle={jest.fn()} />
  );
  const panel = container.querySelector('#portfolio-overview');
  expect(panel).not.toHaveClass('mb-5', 'mt-5');
  expect(screen.getByText('Herramientas')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Métricas y exportaciones: expandir' }))
    .toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Exportá tus activos o prepará un análisis para Lita.')).not.toBeInTheDocument();

  rerender(<FinancialOverviewPanel id='transactions-overview' title='Métricas y exportaciones'
    collapsed className='mt-5' onToggle={jest.fn()} />);
  expect(container.querySelector('#transactions-overview')).toHaveClass('mt-5');
  expect(container.querySelector('#transactions-overview')).not.toHaveClass('mb-5');
});
