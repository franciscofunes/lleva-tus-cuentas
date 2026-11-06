import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BankOnboardingForm from './BankOnboardingForm';

test('bank creation only saves after confirmation, Markdown preview never writes', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  render(<BankOnboardingForm onSave={save} onCancel={jest.fn()} existingBanks={[]} />);
  expect(screen.getByLabelText('Nombre del banco')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', {name:'Pegar Markdown'}));
  fireEvent.change(screen.getByLabelText('Markdown de bancos'), {target:{value:`
- type: bank
  name: Banco Ejemplo
- type: account
  name: Caja ARS
  typeAccount: caja_ahorro
  currency: ARS
  balance: 538,17
- type: card
  nickname: Visa crédito
  brand: Visa
  lastFour: 4555
  closingDay: 29
  dueDay: 13
  currentConsumptionARS: 59.245,69`}});
  fireEvent.click(screen.getByRole('button', {name:'Comparar Markdown'}));
  expect(screen.getByText('1 cuentas y 1 tarjetas detectadas.')).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name:'Aplicar al formulario'}));
  expect(screen.getByLabelText('Nombre del banco')).toHaveValue('Banco Ejemplo');
  expect(screen.getByLabelText('Saldo manual')).toHaveValue('538.17');
  fireEvent.click(screen.getByRole('button', {name:'Guardar banco'}));
  await waitFor(()=>expect(save).toHaveBeenCalledTimes(1));
  const payload=save.mock.calls[0][0];
  expect(payload.name).toBe('Banco Ejemplo');
  expect(payload.accounts[0].currency).toBe('ARS');
  expect(payload.cards[0].lastFour).toBe('4555');
  expect(payload.cards[0].currentConsumptionARS).toBe('59245.69');
});
test('invalid imported Markdown does not offer Apply and bank name duplicates are refused', async () => {
  const save=jest.fn();
  render(<BankOnboardingForm onSave={save} onCancel={jest.fn()} existingBanks={[{name:'Banco Ejemplo'}]} />);
  fireEvent.click(screen.getByRole('button',{name:'Pegar Markdown'}));
  fireEvent.change(screen.getByLabelText('Markdown de bancos'),{target:{value:'- type: bank\n  name: Banco Ejemplo\n  password: secret'}});
  fireEvent.click(screen.getByRole('button',{name:'Comparar Markdown'}));
  expect(screen.getByText(/campo desconocido password/)).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Aplicar al formulario'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Nombre del banco'),{target:{value:'Banco Ejemplo'}});
  fireEvent.click(screen.getByRole('button',{name:'Guardar banco'}));
  expect(screen.getByRole('alert')).toHaveTextContent(/Ya agregaste un banco/);
  expect(save).not.toHaveBeenCalled();
});

test('Firebase permission denials show actionable guidance and preserve entered bank values', async () => {
  const save = jest.fn().mockRejectedValue({
    code: 'permission-denied', message: 'Missing or insufficient permissions.',
  });
  render(<BankOnboardingForm onSave={save} onCancel={jest.fn()} existingBanks={[]} />);
  fireEvent.change(screen.getByLabelText('Nombre del banco'), { target: { value: 'Banco Ejemplo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar banco' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Firebase rechazó el guardado/));
  expect(screen.getByRole('alert')).toHaveTextContent(/Firestore Database/);
  expect(screen.getByLabelText('Nombre del banco')).toHaveValue('Banco Ejemplo');
  expect(save).toHaveBeenCalledTimes(1);
});

test('mobile bank onboarding leads with the required name and keeps shared-theme actions visible', () => {
  render(<BankOnboardingForm onSave={jest.fn()} onCancel={jest.fn()} existingBanks={[]} />);
  const name = screen.getByLabelText('Nombre del banco');
  const importButton = screen.getByRole('button', { name: 'Pegar Markdown' });
  expect(name.compareDocumentPosition(importButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(importButton).toHaveAttribute('aria-expanded', 'false');
  expect(importButton).toHaveAttribute('aria-controls', 'bank-markdown-importer');
  expect(screen.queryByLabelText('Markdown de bancos')).not.toBeInTheDocument();

  const actions = screen.getByTestId('bank-onboarding-actions');
  expect(actions).toHaveClass('sticky', 'bottom-0', 'bg-white', 'dark:bg-slate-900');
  expect(screen.getByRole('button', { name: 'Guardar banco' })).toHaveClass('min-h-[44px]', 'focus-visible:ring-2');
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveClass('min-h-[44px]', 'dark:text-slate-200');
  fireEvent.click(importButton);
  expect(screen.getByRole('button', { name: 'Ocultar importador' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByLabelText('Markdown de bancos')).toBeInTheDocument();
});

test('double tapping Guardar banco while a request is pending creates only one bank', async () => {
  let rejectRequest;
  const save = jest.fn().mockImplementation(() => new Promise((resolve, reject) => { rejectRequest = reject; }));
  render(<BankOnboardingForm onSave={save} onCancel={jest.fn()} existingBanks={[]} />);
  fireEvent.change(screen.getByLabelText('Nombre del banco'), { target: { value: 'Banco de prueba' } });
  const saveButton = screen.getByRole('button', { name: 'Guardar banco' });
  fireEvent.click(saveButton);
  fireEvent.click(saveButton);
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => rejectRequest(new Error('Falló el guardado')));
  expect(screen.getByRole('alert')).toHaveTextContent('Falló el guardado');
  expect(screen.getByLabelText('Nombre del banco')).toHaveValue('Banco de prueba');
  fireEvent.click(saveButton);
  expect(save).toHaveBeenCalledTimes(2);
});
