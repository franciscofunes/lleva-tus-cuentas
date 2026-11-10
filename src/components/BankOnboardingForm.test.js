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

test('permission denials focus a local, understandable error and preserve entered bank values', async () => {
  const save = jest.fn().mockRejectedValue({
    code: 'permission-denied', message: 'Missing or insufficient permissions.',
  });
  render(<BankOnboardingForm onSave={save} onCancel={jest.fn()} existingBanks={[]} />);
  fireEvent.change(screen.getByLabelText('Nombre del banco'), { target: { value: 'Banco Ejemplo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar banco' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/problema de permisos/));
  expect(screen.getByRole('alert')).toHaveTextContent(/Tus datos siguen acá/);
  expect(screen.getByRole('alert')).not.toHaveTextContent(/Firebase|Firestore/);
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveFocus());
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
  expect(document.getElementById('bank-markdown-importer')).toHaveAttribute('hidden');
  expect(name).toHaveClass('text-base','dark:bg-slate-900','focus-visible:ring-2');
  expect(name.closest('label')).toHaveClass('text-sm','dark:text-slate-200');
  expect(screen.queryByLabelText('Markdown de bancos')).not.toBeInTheDocument();

  const actions = screen.getByTestId('bank-onboarding-actions');
  expect(actions).toHaveClass('sticky', 'bottom-0', 'bg-white', 'dark:bg-slate-900');
  expect(screen.getByRole('button', { name: 'Guardar banco' })).toHaveClass('min-h-[44px]', 'focus-visible:ring-2');
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveClass('min-h-[44px]', 'dark:text-slate-200');
  fireEvent.click(importButton);
  expect(screen.getByRole('button', { name: 'Ocultar importador' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByLabelText('Markdown de bancos')).toBeInTheDocument();
  expect(document.getElementById('bank-markdown-importer')).not.toHaveAttribute('hidden');
  expect(screen.getByLabelText('Markdown de bancos')).toHaveClass('text-base','!font-mono');
});

test('new bank account/card controls share 16px inputs and 44px disclosure/actions',()=>{
  render(<BankOnboardingForm onSave={jest.fn()} onCancel={jest.fn()} />);
  fireEvent.click(screen.getByRole('button',{name:'Agregar cuenta'}));
  fireEvent.click(screen.getByRole('button',{name:'Agregar tarjeta'}));
  for(const label of ['Nombre de la cuenta','Saldo manual','Tipo','Moneda','Nombre de la tarjeta','Marca','Día habitual de vencimiento']){
    const control=screen.getByLabelText(label);
    expect(control).toHaveClass('text-base','min-h-[44px]','dark:bg-slate-900','focus-visible:ring-2');
  }
  const disclosure=screen.getByText(/Datos del último resumen y período actual/).closest('summary');
  expect(disclosure).toHaveClass('min-h-[44px]','text-violet-700','dark:text-violet-200');
  const actions=screen.getByTestId('bank-onboarding-actions');
  expect(actions.querySelectorAll('button')[0]).toHaveTextContent('Cancelar');
  expect(actions.querySelectorAll('button')[1]).toHaveTextContent('Guardar banco');
  expect(actions.querySelectorAll('button')[1]).toHaveClass('bg-violet-600','focus-visible:ring-2');
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
  expect(screen.getByRole('alert')).toHaveTextContent('No pudimos guardar el banco');
  expect(screen.getByRole('alert')).not.toHaveTextContent('Falló el guardado');
  expect(screen.getByLabelText('Nombre del banco')).toHaveValue('Banco de prueba');
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveFocus());
  fireEvent.click(saveButton);
  expect(save).toHaveBeenCalledTimes(2);
});

test('duplicate-name error is focused, clears on edit and does not write a bank',async()=>{
  const save=jest.fn();
  render(<BankOnboardingForm onSave={save} onCancel={jest.fn()} existingBanks={[{name:'Banco Ciudad'}]} />);
  const name=screen.getByLabelText('Nombre del banco');
  fireEvent.change(name,{target:{value:'Banco Ciudad'}});
  fireEvent.click(screen.getByRole('button',{name:'Guardar banco'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveFocus());
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(name,{target:{value:'Banco Nación'}});
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
