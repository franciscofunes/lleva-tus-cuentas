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
