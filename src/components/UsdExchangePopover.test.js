import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import UsdExchangePopover from './UsdExchangePopover';
import { fetchUsdQuotes } from '../services/usdQuotesService';

jest.mock('../services/usdQuotesService', () => ({ fetchUsdQuotes: jest.fn() }));

const quotes = [
  { key: 'bolsa', label: 'MEP', compra: 1500, venta: 1540, updatedAt: '2026-10-08T15:00:00.000Z' },
  { key: 'oficial', label: 'Oficial', compra: 1400, venta: 1430, updatedAt: '2026-10-08T15:00:00.000Z' },
  { key: 'blue', label: 'Blue', compra: 1510, venta: 1560, updatedAt: '2026-10-08T15:00:00.000Z' },
  { key: 'cripto', label: 'Cripto', compra: 1490, venta: 1530, updatedAt: '2026-10-08T15:00:00.000Z' },
];
beforeEach(() => {
  fetchUsdQuotes.mockReset();
  fetchUsdQuotes.mockResolvedValue(quotes);
});
afterEach(() => {
  expect(document.body.style.overflow).not.toBe('hidden');
});

const openDialog = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Ver cotizaciones del dólar/i }));
  return screen.findByRole('dialog', { name: '¿Cuántos pesos recibirías?' });
};

describe('FX quotes modal on mobile', () => {
  it('renders in a body portal, outside of any overflow-clipped Portfolio card', async () => {
    render(
      <div data-testid='clipped-card' style={{ overflow: 'hidden' }}>
        <UsdExchangePopover usdBalance={100} arsBalance={4000} />
      </div>
    );
    const dialog = await openDialog();
    expect(screen.getByTestId('clipped-card')).not.toContainElement(dialog);
    expect(dialog.parentElement).toBe(screen.getByTestId('fx-dialog-backdrop'));
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(within(dialog).getByText('MEP')).toBeInTheDocument());
    expect(document.body.style.overflow).toBe('hidden');
    expect(fetchUsdQuotes).toHaveBeenCalledWith();
  });

  it('uses the purchase quote when selling USD, and changes the estimate by market', async () => {
    render(<UsdExchangePopover usdBalance={100} arsBalance={4000} />);
    const dialog = await openDialog();
    await within(dialog).findByText('Tu Portfolio USD, estimado en ARS');
    expect(dialog).toHaveTextContent('150.000');
    expect(dialog).toHaveTextContent('1.540,00');
    expect(dialog).toHaveTextContent('154.000');

    fireEvent.click(within(dialog).getByRole('button', { name: /Oficial/i }));
    expect(within(dialog).getByRole('button', { name: /Oficial/i })).toHaveAttribute('aria-pressed', 'true');
    expect(dialog).toHaveTextContent('140.000');
    expect(dialog).toHaveTextContent('144.000');
    expect(within(dialog).getByRole('button', { name: /MEP/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('never exposes user balances or conversion estimates when values are hidden', async () => {
    render(<UsdExchangePopover usdBalance={112382.69} arsBalance={375000} showValues={false} />);
    const dialog = await openDialog();
    await within(dialog).findByText('Importes ocultos por tu configuración de privacidad.');
    expect(dialog).not.toHaveTextContent('112.382');
    expect(dialog).not.toHaveTextContent('375.000');
    expect(dialog).not.toHaveTextContent('168.574.035');
    // Public exchange prices remain visible, but private wallet totals do not.
    expect(within(dialog).getByText('MEP')).toBeInTheDocument();
  });

  it('closes with Escape, backdrop or button and restores focus / body scroll', async () => {
    render(<UsdExchangePopover usdBalance={100} />);
    const trigger = screen.getByRole('button', { name: /Ver cotizaciones del dólar/i });
    trigger.focus();
    await openDialog();
    expect(screen.getByRole('button', { name: 'Cerrar cotizaciones' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).not.toBe('hidden');

    await openDialog();
    fireEvent.mouseDown(screen.getByTestId('fx-dialog-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar cotizaciones' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a recoverable API error, not stale or fabricated conversions', async () => {
    fetchUsdQuotes.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(quotes);
    render(<UsdExchangePopover usdBalance={100} />);
    const dialog = await openDialog();
    await within(dialog).findByRole('alert');
    expect(dialog).not.toHaveTextContent('150.000');
    fireEvent.click(within(dialog).getByRole('button', { name: /Reintentar/i }));
    await within(dialog).findByText('Tu Portfolio USD, estimado en ARS');
    expect(fetchUsdQuotes).toHaveBeenNthCalledWith(2, true);
  });

  it('refreshes public prices without sending user data to DolarAPI', async () => {
    render(<UsdExchangePopover usdBalance={100} arsBalance={4000} />);
    const dialog = await openDialog();
    await within(dialog).findByText('Tu Portfolio USD, estimado en ARS');
    fireEvent.click(within(dialog).getByRole('button', { name: /Actualizar/i }));
    await waitFor(() => expect(fetchUsdQuotes).toHaveBeenCalledWith(true));
    expect(fetchUsdQuotes).toHaveBeenCalledTimes(2);
    expect(fetchUsdQuotes.mock.calls.every((args) => args.length <= 1)).toBe(true);
  });
});
