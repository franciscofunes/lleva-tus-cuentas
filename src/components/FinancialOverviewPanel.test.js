import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
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
