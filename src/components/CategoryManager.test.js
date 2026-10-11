import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CategoryManager from './CategoryManager';
import { saveCustomCategory, setCustomCategoryActive } from '../services/customCategoriesService';

jest.mock('../services/customCategoriesService', () => ({
  saveCustomCategory: jest.fn().mockResolvedValue('id-mascotas'),
  setCustomCategoryActive: jest.fn().mockResolvedValue(undefined),
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

test('service template selects three supported fields and a service expense', async () => {
  render(<CategoryManager userId='userA' categories={categories} />);
  fireEvent.change(screen.getByLabelText('Nombre de la categoría'), { target: { value: 'Facturas del hogar' } });
  fireEvent.click(screen.getByLabelText('Ingreso'));
  fireEvent.click(screen.getByRole('button', { name: 'Usar plantilla Servicios' }));
  expect(screen.getByLabelText('Gasto')).toBeChecked();
  expect(screen.getByLabelText('Fecha de vencimiento')).toBeChecked();
  expect(screen.getByLabelText('Número de cliente / suministro')).toBeChecked();
  expect(screen.getByLabelText('Período facturado')).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));
  await waitFor(() => expect(saveCustomCategory).toHaveBeenCalledWith('userA', {
    name: 'Facturas del hogar', isExpense: true,
    extraFieldIds: ['dueDate', 'serviceAccount', 'billingPeriod'],
  }, categories));
});
