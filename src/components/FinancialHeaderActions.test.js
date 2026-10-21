import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FinancialHeaderActions from './FinancialHeaderActions';
import TransactionsHeaderActions from './TransactionsHeaderActions';

const sharedControls = ['min-h-[44px]', 'bg-violet-600'];
const renderShared = (props = {}) => {
  const onPrimaryAction=jest.fn(),onTogglePrivacy=jest.fn();
  render(<MemoryRouter><FinancialHeaderActions
    currentSection='banks'
    primaryLabel='Agregar banco'
    onPrimaryAction={onPrimaryAction}
    valuesVisible={false}
    onTogglePrivacy={onTogglePrivacy}
    visibleIcon='/visible.svg'
    hiddenIcon='/hidden.svg'
    {...props}
  /></MemoryRouter>);
  return {onPrimaryAction,onTogglePrivacy};
};

test('Bancos uses the exact Transactions header pattern with one primary action, privacy and Más', () => {
  const {onPrimaryAction,onTogglePrivacy} = renderShared();
  const add=screen.getByRole('button',{name:'Agregar banco'});
  sharedControls.forEach(style => expect(add).toHaveClass(style));
  expect(add).toHaveTextContent('Agregar banco');
  fireEvent.click(add);
  expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  const privacy=screen.getByRole('button',{name:'Mostrar importes de la pantalla'});
  expect(privacy).toHaveClass('h-11','w-11','dark:bg-slate-900');
  fireEvent.click(privacy);
  expect(onTogglePrivacy).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Más').closest('details')).not.toHaveAttribute('open');
  fireEvent.click(screen.getByText('Más'));
  expect(screen.getByRole('link',{name:'Transacciones'})).toHaveAttribute('href','/transacciones');
  expect(screen.getByRole('link',{name:'Portfolio'})).toHaveAttribute('href','/portfolio');
  expect(screen.queryByRole('link',{name:'Bancos'})).not.toBeInTheDocument();
});

test('header is shared with Transacciones rather than restyled in a separate component', () => {
  const onAdd=jest.fn(),onTogglePrivacy=jest.fn();
  render(<MemoryRouter><TransactionsHeaderActions onAdd={onAdd}
    valuesVisible onTogglePrivacy={onTogglePrivacy}
    visibleIcon='/visible.svg' hiddenIcon='/hidden.svg'
  /></MemoryRouter>);
  const add=screen.getByRole('button',{name:'Agregar movimiento'});
  sharedControls.forEach(style => expect(add).toHaveClass(style));
  expect(screen.getByRole('button',{name:'Ocultar importes de la pantalla'})).toHaveClass('h-11','w-11','dark:bg-slate-900');
  fireEvent.click(add);
  expect(onAdd).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('Más'));
  expect(screen.getByRole('link',{name:'Portfolio'})).toHaveAttribute('href','/portfolio');
  expect(screen.getByRole('link',{name:'Bancos'})).toHaveAttribute('href','/bancos');
  expect(screen.queryByRole('link',{name:'Transacciones'})).not.toBeInTheDocument();
});

test('disabled bank loading state does not open a modal', () => {
  const {onPrimaryAction}=renderShared({primaryDisabled:true});
  expect(screen.getByRole('button',{name:'Agregar banco'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Agregar banco'}));
  expect(onPrimaryAction).not.toHaveBeenCalled();
});

test('Portfolio can opt into exactly the same actions instead of creating another page-specific header', () => {
  renderShared({currentSection:'portfolio',primaryLabel:'Agregar posición'});
  fireEvent.click(screen.getByText('Más'));
  expect(screen.getByRole('link',{name:'Transacciones'})).toHaveAttribute('href','/transacciones');
  expect(screen.getByRole('link',{name:'Bancos'})).toHaveAttribute('href','/bancos');
  expect(screen.queryByRole('link',{name:'Portfolio'})).not.toBeInTheDocument();
});
