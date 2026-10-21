import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DeleteBankChargeDialog from './DeleteBankChargeDialog';

const charge = {
  id: 'manual-charge-1',
  cardId: 'visa-card-1',
  merchant: 'Comercio de prueba',
  purchaseDate: '2026-10-21',
  amount: 1250.42,
  currency: 'ARS',
};

test('opening and cancelling confirmation never deletes manual consumption', () => {
  const onClose = jest.fn(), onDelete = jest.fn();
  render(<DeleteBankChargeDialog charge={charge} onClose={onClose} onDelete={onDelete} />);
  const dialog = screen.getByRole('dialog', { name: 'Eliminar consumo manual' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toHaveTextContent('Comercio de prueba');
  expect(dialog).toHaveTextContent('no se puede deshacer');
  expect(dialog).toHaveTextContent('No se borrará ningún resumen PDF');
  expect(onDelete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onDelete).not.toHaveBeenCalled();
});

test('explicit confirmation deletes one original ID and blocks double taps and early Escape', async () => {
  let resolveDelete;
  const onDelete = jest.fn(() => new Promise(resolve => { resolveDelete = resolve; }));
  const onClose = jest.fn();
  render(<DeleteBankChargeDialog charge={charge} onDelete={onDelete} onClose={onClose} />);
  const confirm = screen.getByRole('button', { name: 'Eliminar consumo' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onDelete).toHaveBeenCalledWith('manual-charge-1');
  expect(screen.getByRole('button', { name: 'Eliminando…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => resolveDelete());
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

test('failed deletion shows in-context error and keeps the dialog open for retry', async () => {
  const onDelete = jest.fn().mockRejectedValueOnce(new Error('permission-denied')).mockResolvedValueOnce(undefined);
  const onClose = jest.fn();
  render(<DeleteBankChargeDialog charge={charge} onDelete={onDelete} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar consumo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo eliminar el consumo');
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar consumo' }));
  });
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(onDelete).toHaveBeenCalledTimes(2);
});

test('respects bank privacy mode even with the confirmation open', () => {
  const { rerender } = render(<DeleteBankChargeDialog charge={charge} privacyHidden
    onDelete={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByLabelText('Importe del consumo')).toHaveTextContent('••••');
  expect(screen.getByRole('dialog')).not.toHaveTextContent('1250');
  rerender(<DeleteBankChargeDialog charge={charge} privacyHidden={false}
    onDelete={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByLabelText('Importe del consumo')).toHaveTextContent('1.250');
});

test('focus starts inside dialog, traps keyboard Tab and Escape cancels', () => {
  const onClose = jest.fn();
  render(<DeleteBankChargeDialog charge={charge} onClose={onClose} onDelete={jest.fn()} />);
  const first = screen.getByRole('button', { name: 'Cerrar' });
  const last = screen.getByRole('button', { name: 'Eliminar consumo' });
  expect(first).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(last).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});
