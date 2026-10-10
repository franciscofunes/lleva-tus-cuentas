import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Card from './Card';

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
}));
jest.mock('./CardStatementDetails', () => () => null);
jest.mock('./InfoTooltip', () => () => null);

const basicProps = {
  id: 'test-movement',
  name: 'Movimiento importado',
  amount: '1250',
  selectedDate: '2026-10-10',
};

test('missing category and categories while loading never crash a transaction card', () => {
  render(<Card {...basicProps} />);
  expect(screen.getByText('Sin categoría')).toBeInTheDocument();
  expect(screen.getByText(/1,?250/)).toBeInTheDocument();
});

test('legacy non-string category does not crash rendering', () => {
  render(<Card {...basicProps} category={{ oldValue: true }} categories={[]} />);
  expect(screen.getByText('Sin categoría')).toBeInTheDocument();
});

test('normal card still renders its expense sign when the category exists', () => {
  render(<Card {...basicProps} category='Salud' categories={[{ name: 'Salud', isExpense: true }]} />);
  expect(screen.getByText(/-1,?250/)).toBeInTheDocument();
});
