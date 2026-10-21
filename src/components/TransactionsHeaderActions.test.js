import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TransactionsHeaderActions from './TransactionsHeaderActions';

const renderActions = (overrides = {}) => {
  const onAdd = jest.fn();
  const onTogglePrivacy = jest.fn();
  render(
    <MemoryRouter>
      <TransactionsHeaderActions onAdd={onAdd} onTogglePrivacy={onTogglePrivacy}
        valuesVisible visibleIcon='/visible.svg' hiddenIcon='/hidden.svg' {...overrides} />
    </MemoryRouter>
  );
  return { onAdd, onTogglePrivacy };
};

test('primary action remains visible with a descriptive name on narrow screens', () => {
  const { onAdd } = renderActions();
  const add = screen.getByRole('button', { name: 'Agregar movimiento' });
  expect(add).toHaveClass('min-h-[44px]', 'bg-violet-600');
  expect(add).toHaveTextContent('Agregar movimiento');
  fireEvent.click(add);
  expect(onAdd).toHaveBeenCalledTimes(1);
});

test('privacy mode has a named and keyboard-accessible toggle', () => {
  const { onTogglePrivacy } = renderActions({ valuesVisible: false });
  const show = screen.getByRole('button', { name: 'Mostrar importes de la pantalla' });
  expect(show).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(show);
  expect(onTogglePrivacy).toHaveBeenCalledTimes(1);
});

test('Portfolio and Bancos links remain discoverable in a native disclosure', () => {
  renderActions();
  const more = screen.getByText('Más');
  expect(more.closest('details')).not.toHaveAttribute('open');
  fireEvent.click(more);
  expect(more.closest('details')).toHaveAttribute('open');
  expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '/portfolio');
  expect(screen.getByRole('link', { name: 'Bancos' })).toHaveAttribute('href', '/bancos');
});
