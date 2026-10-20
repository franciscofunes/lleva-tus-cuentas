import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DeleteTransactionDialog from './DeleteTransactionDialog';

const transaction = { id: 'expense-123', name: 'Alquiler de octubre' };

test('cancel closes styled dialog without deleting any data', () => {
  const onClose = jest.fn();
  const onDelete = jest.fn();
  render(<DeleteTransactionDialog transaction={transaction} onClose={onClose} onDelete={onDelete} />);
  const dialog = screen.getByRole('dialog', { name: 'Eliminar movimiento' });

  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByText(/no se puede deshacer/i)).toBeInTheDocument();
  expect(screen.getByText(/Alquiler de octubre/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveClass('bg-violet-600');
  expect(screen.getByRole('button', { name: 'Eliminar movimiento' })).toHaveClass('dark:text-rose-300');
  expect(onDelete).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onDelete).not.toHaveBeenCalled();
});

test('approval deletes exactly one selected record and prevents rapid duplicate taps', async () => {
  let resolveDeletion;
  const onDelete = jest.fn(() => new Promise((resolve) => { resolveDeletion = resolve; }));
  const onClose = jest.fn();
  render(<DeleteTransactionDialog transaction={transaction} onClose={onClose} onDelete={onDelete} />);

  const confirm = screen.getByRole('button', { name: 'Eliminar movimiento' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onDelete).toHaveBeenCalledWith('expense-123');
  expect(screen.getByRole('button', { name: 'Eliminando…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();

  await act(async () => { resolveDeletion(); });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('failed deletion keeps dialog open, explains failure and allows retry', async () => {
  const onDelete = jest.fn()
    .mockRejectedValueOnce(new Error('permission-denied'))
    .mockResolvedValueOnce(undefined);
  const onClose = jest.fn();
  render(<DeleteTransactionDialog transaction={transaction} onClose={onClose} onDelete={onDelete} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar movimiento' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo eliminar');
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar movimiento' }));
  });
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(onDelete).toHaveBeenCalledTimes(2);
});

test('keyboard focus remains in the dialog and Escape dismisses it safely', () => {
  const onClose = jest.fn();
  render(<DeleteTransactionDialog transaction={transaction} onClose={onClose} onDelete={jest.fn()} />);
  const dismiss = screen.getByRole('button', { name: 'Cerrar' });
  const confirm = screen.getByRole('button', { name: 'Eliminar movimiento' });

  expect(dismiss).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(confirm).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(dismiss).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});
