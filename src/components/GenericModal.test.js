import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GenericModal from './GenericModal';

function ModalFixture() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type='button' onClick={() => setOpen(true)}>Abrir formulario</button>
      <GenericModal show={open} dialogLabel='Formulario de prueba'
        component={<div><h2>Formulario de prueba</h2><button type='button'>Guardar</button></div>}
        closeModal={() => setOpen(false)} />
    </>
  );
}

test('restores focus to trigger when Escape closes an LTC modal', async () => {
  render(<ModalFixture />);
  const trigger = screen.getByRole('button', { name: 'Abrir formulario' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByRole('dialog', { name: 'Formulario de prueba' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(trigger).toHaveFocus());
});

test('Tab and Shift+Tab cannot escape a generic modal', () => {
  render(<ModalFixture />);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir formulario' }));
  const close = screen.getByRole('button', { name: 'Cerrar' });
  const save = screen.getByRole('button', { name: 'Guardar' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(save).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(close).toHaveFocus();
});
