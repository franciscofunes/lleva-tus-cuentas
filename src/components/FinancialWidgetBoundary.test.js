import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import FinancialWidgetBoundary from './FinancialWidgetBoundary';

function BrokenWidget() {
  throw new TypeError('private user data');
}

test('one failing financial widget cannot crash healthy siblings and can retry', () => {
  const logger = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const { rerender } = render(<div>
      <FinancialWidgetBoundary area='transactions-summary' label='el resumen'><BrokenWidget /></FinancialWidgetBoundary>
      <p>Transacciones disponibles</p>
    </div>);
    expect(screen.getByText('Transacciones disponibles')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-amber-50', 'dark:bg-slate-900/70');
    const logs = logger.mock.calls.filter(([message]) => message === '[ltc-widget] render failed');
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs)).not.toContain('private user data');
    rerender(<div>
      <FinancialWidgetBoundary area='transactions-summary' label='el resumen'><p>Resumen recuperado</p></FinancialWidgetBoundary>
      <p>Transacciones disponibles</p>
    </div>);
    fireEvent.click(screen.getByRole('button', {name:'Reintentar panel'}));
    expect(screen.getByText('Resumen recuperado')).toBeInTheDocument();
  } finally {
    logger.mockRestore();
  }
});
