import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CategoryManager from './CategoryManager';
import { saveCustomCategory, setCustomCategoryActive, updateCustomCategoryLabel } from '../services/customCategoriesService';

jest.mock('../services/customCategoriesService', () => ({
  saveCustomCategory: jest.fn().mockResolvedValue('id-mascotas'),
  setCustomCategoryActive: jest.fn().mockResolvedValue(undefined),
  updateCustomCategoryLabel: jest.fn().mockResolvedValue('Telefonía móvil'),
}));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn() } }));

const categories = [
  { id: 'food', name: 'Alimentación 🍜', isExpense: true, origin: 'shared', active: true },
  { id: 'pets', name: 'Mascotas', isExpense: true, origin: 'custom', isCustom: true, active: true },
  { id: 'archived', name: 'Educación', isExpense: true, origin: 'custom', isCustom: true, active: false },
];

beforeEach(() => jest.clearAllMocks());

test('creates private income category and leaves global catalog read-only', async () => {
  render(<CategoryManager userId='userA' categories={categories} />);
  expect(screen.getByText(/generales son compartidas/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Nombre de la categoría'), { target: { value: 'Freelance' } });
  fireEvent.click(screen.getByLabelText('Ingreso'));
  fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));
  await waitFor(() => expect(saveCustomCategory).toHaveBeenCalledWith('userA',
    { name: 'Freelance', isExpense: false }, categories));
  expect(screen.getByText('Mascotas')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Archivar Alimentación 🍜' })).not.toBeInTheDocument();
});

test('archives and restores only custom category without deleting historical classification', async () => {
  render(<CategoryManager userId='userA' categories={categories} />);
  fireEvent.click(screen.getByRole('button', { name: 'Archivar Mascotas' }));
  await waitFor(() => expect(setCustomCategoryActive).toHaveBeenCalledWith('userA', 'pets', false));
  // Wait until the first async mutation unlocks the controls.
  await waitFor(() => expect(screen.getByRole('button', { name: 'Reactivar Educación' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Reactivar Educación' }));
  await waitFor(() => expect(setCustomCategoryActive).toHaveBeenCalledWith('userA', 'archived', true));
});

test('prevents duplicates and reserved financial categories', () => {
  render(<CategoryManager userId='userA' categories={categories} />);
  fireEvent.change(screen.getByLabelText('Nombre de la categoría'), { target: { value: 'MASCOTAS' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/existe/);
  fireEvent.change(screen.getByLabelText('Nombre de la categoría'), { target: { value: 'Resumen tarjeta adicional' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/reservado/);
  expect(saveCustomCategory).not.toHaveBeenCalled();
});

test('notifies an open transaction only after its private category is saved', async () => {
  const onCreated = jest.fn();
  render(<CategoryManager userId='userA' categories={categories} onCreated={onCreated} />);
  fireEvent.change(screen.getByLabelText('Nombre de la categoría'), { target: { value: '  Freelance   nuevo  ' } });
  expect(onCreated).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith('Freelance nuevo'));
  expect(saveCustomCategory).toHaveBeenCalledWith('userA',
    { name: '  Freelance   nuevo  ', isExpense: true }, categories);
});

test('does not leave the transaction form when saving a category fails', async () => {
  const onCreated = jest.fn();
  saveCustomCategory.mockRejectedValueOnce(new Error('No se pudo guardar.'));
  render(<CategoryManager userId='userA' categories={categories} onCreated={onCreated} />);
  fireEvent.change(screen.getByLabelText('Nombre de la categoría'), { target: { value: 'Nueva categoría' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar.'));
  expect(onCreated).not.toHaveBeenCalled();
});

test('new private category stores only controlled preset identifiers', async () => {
  render(<CategoryManager userId='userA' categories={categories} />);
  fireEvent.change(screen.getByLabelText('Nombre de la categoría'), { target: { value: 'Servicios freelance' } });
  fireEvent.click(screen.getByLabelText('Referencia / ID de operación'));
  fireEvent.click(screen.getByLabelText('Medio de pago'));
  fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));
  await waitFor(() => expect(saveCustomCategory).toHaveBeenCalledWith('userA',
    { name: 'Servicios freelance', isExpense: true, extraFieldIds: ['reference', 'paymentMethod'] }, categories));
});

test('allows at most three extra presets and never changes mandatory base fields', () => {
  render(<CategoryManager userId='userA' categories={categories} />);
  expect(screen.getByText(/nombre, categoría, monto, fecha y descripción/)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Referencia / ID de operación'));
  fireEvent.click(screen.getByLabelText('Medio de pago'));
  fireEvent.click(screen.getByLabelText('Número de comprobante'));
  expect(screen.getByLabelText('Fecha de operación adicional')).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Medio de pago'));
  expect(screen.getByLabelText('Fecha de operación adicional')).toBeEnabled();
});

test('opt-in due date is saved on a new personal category without consuming the three optional extra fields', async () => {
  render(<CategoryManager userId='userA' categories={categories} />);
  fireEvent.change(screen.getByLabelText('Nombre de la categoría'), { target: { value: 'Expensas edificio' } });
  expect(screen.getByLabelText('Fecha de vencimiento')).not.toBeChecked();
  fireEvent.click(screen.getByLabelText('Fecha de vencimiento'));
  fireEvent.click(screen.getByLabelText('Referencia / ID de operación'));
  fireEvent.click(screen.getByLabelText('Medio de pago'));
  fireEvent.click(screen.getByLabelText('Número de comprobante'));
  expect(screen.getByLabelText('Fecha de operación adicional')).toBeDisabled();
  expect(screen.getByLabelText('Fecha de vencimiento')).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));
  await waitFor(() => expect(saveCustomCategory).toHaveBeenCalledWith('userA', {
    name: 'Expensas edificio', isExpense: true,
    extraFieldIds: ['reference', 'paymentMethod', 'receiptNumber'], dateBehavior: 'separate-due-date',
  }, categories));
  await waitFor(() => expect(screen.getByLabelText('Fecha de vencimiento')).not.toBeChecked());
});

test('an unchecked due-date option preserves legacy normal category data', async () => {
  render(<CategoryManager userId='userA' categories={categories} />);
  fireEvent.change(screen.getByLabelText('Nombre de la categoría'), { target: { value: 'Papelería' } });
  fireEvent.click(screen.getByLabelText('Fecha de vencimiento'));
  fireEvent.click(screen.getByLabelText('Fecha de vencimiento'));
  fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));
  await waitFor(() => expect(saveCustomCategory).toHaveBeenCalledWith('userA', {
    name: 'Papelería', isExpense: true,
  }, categories));
});

test('the list shows which historical custom categories were configured with a due date', () => {
  render(<CategoryManager userId='userA' categories={[...categories,
    { id: 'rent', name: 'Alquiler', active: true, isCustom: true, origin: 'custom', isExpense: true, dateBehavior: 'due-date' },
  ]} />);
  expect(screen.getByText(/Con vencimiento/)).toBeInTheDocument();
});

test('explains that expiration is a second optional date, not a replacement for the transaction date', () => {
  render(<CategoryManager userId='userA' categories={categories} />);
  expect(screen.getByText(/Agrega una segunda fecha opcional/)).toBeInTheDocument();
  expect(screen.getByText(/además de la fecha de transacción/)).toBeInTheDocument();
  expect(screen.getByLabelText('Fecha de vencimiento')).not.toBeChecked();
});

test('edits the private category visible name, preserving the stable underlying name', async () => {
  render(<CategoryManager userId='userA' categories={categories} />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar Mascotas' }));
  const field = screen.getByLabelText('Nuevo nombre visible');
  expect(field).toHaveValue('Mascotas');
  fireEvent.change(field, { target: { value: 'Animales domésticos' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(updateCustomCategoryLabel).toHaveBeenCalledWith(
    'userA', categories[1], 'Animales domésticos', categories,
  ));
});

test('can edit archived private categories without changing their archived state', async () => {
  render(<CategoryManager userId='userA' categories={categories} />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar Educación' }));
  expect(screen.getByLabelText('Nuevo nombre visible')).toHaveValue('Educación');
  expect(screen.getByRole('button', { name: 'Reactivar Educación' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByLabelText('Nuevo nombre visible')).not.toBeInTheDocument();
  expect(updateCustomCategoryLabel).not.toHaveBeenCalled();
});

test('rejects duplicate or reserved display names without saving anything', () => {
  render(<CategoryManager userId='userA' categories={categories} />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar Mascotas' }));
  fireEvent.change(screen.getByLabelText('Nuevo nombre visible'), { target: { value: 'Alimentación 🍜' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/existe/);
  fireEvent.change(screen.getByLabelText('Nuevo nombre visible'), { target: { value: 'Venta divisas nuevas' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/reservado/);
  expect(updateCustomCategoryLabel).not.toHaveBeenCalled();
});

test('preserves the edited label in the private category list and never exposes shared edit actions', () => {
  const renamed = [{...categories[1], displayName:'Telefonía móvil'}, categories[0]];
  render(<CategoryManager userId='userA' categories={renamed} />);
  expect(screen.getByText('Telefonía móvil')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Editar Telefonía móvil' }));
  expect(screen.getByLabelText('Nuevo nombre visible')).toHaveValue('Telefonía móvil');
  expect(screen.queryByRole('button', { name: /Editar Alimentación/ })).not.toBeInTheDocument();
});
