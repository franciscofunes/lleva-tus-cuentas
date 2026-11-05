import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import ScreenshotImportShortcut from './ScreenshotImportShortcut';

test('shared screenshot shortcut has readable light/dark surfaces, a 44px action and a real click', () => {
  const onAction = jest.fn();
  render(<ScreenshotImportShortcut title='Importar captura' description='Revisá los datos antes de guardar'
    actionLabel='Leer captura' onAction={onAction}/>);
  const section = screen.getByRole('region', { name: 'Importar captura' });
  expect(section).toHaveClass('bg-slate-50', 'dark:bg-slate-900/60', 'dark:border-slate-700');
  expect(section).not.toHaveClass('bg-white/70', 'bg-slate-50/80');
  const action = screen.getByRole('button', { name: 'Leer captura' });
  expect(action).toHaveClass('min-h-[44px]', 'focus-visible:ring-2', 'dark:bg-slate-800');
  fireEvent.click(action);
  expect(onAction).toHaveBeenCalledTimes(1);
});

test('the shortcut supports a required choice and disabled action', () => {
  render(<ScreenshotImportShortcut title='Captura de posición' description='Elegí la posición'
    actionLabel='Continuar' onAction={jest.fn()} disabled hint='Agregá primero una posición'>
    <label>Destino<select aria-label='Destino'><option>Seleccionar</option></select></label>
  </ScreenshotImportShortcut>);
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  expect(screen.getByLabelText('Destino')).toBeInTheDocument();
  expect(screen.getByText('Agregá primero una posición')).toBeInTheDocument();
});
