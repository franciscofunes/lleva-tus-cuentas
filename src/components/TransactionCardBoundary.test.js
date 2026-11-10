import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import TransactionCardBoundary from './TransactionCardBoundary';

function BrokenCard() {
  throw new TypeError('private financial data must not reach console');
}

test('a broken record does not hide its healthy transaction siblings', () => {
  const logger = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const { rerender } = render(
      <div>
        <TransactionCardBoundary><BrokenCard /></TransactionCardBoundary>
        <TransactionCardBoundary><p>Movimiento sano</p></TransactionCardBoundary>
      </div>
    );
    expect(screen.getByText('Movimiento sano')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos mostrar un movimiento');
    expect(screen.getByRole('alert')).toHaveClass('bg-white', 'dark:bg-slate-800');
    const appDiagnostics = logger.mock.calls.filter(([message]) => message === '[ltc-transaction-card] render failed');
    expect(appDiagnostics).toHaveLength(1);
    expect(JSON.stringify(appDiagnostics)).not.toContain('private financial data');

    rerender(<div>
      <TransactionCardBoundary><p>Movimiento recuperado</p></TransactionCardBoundary>
      <TransactionCardBoundary><p>Movimiento sano</p></TransactionCardBoundary>
    </div>);
    fireEvent.click(screen.getByRole('button', { name:'Reintentar movimiento' }));
    expect(screen.getByText('Movimiento recuperado')).toBeInTheDocument();
  } finally {
    logger.mockRestore();
  }
});
