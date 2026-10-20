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


function NestedModalFixture() {
  const [parent, setParent] = useState(false);
  const [child, setChild] = useState(false);
  return (
    <>
      <button type='button' onClick={() => setParent(true)}>Abrir transacción</button>
      <GenericModal show={parent} dialogLabel='Editar transacción'
        component={<div>
          <h2>Editar transacción</h2>
          <button type='button' onClick={() => setChild(true)}>Gestionar categorías</button>
        </div>}
        closeModal={() => setParent(false)} />
      <GenericModal show={child} dialogLabel='Categorías'
        component={<div><h2>Categorías</h2><button type='button'>Guardar categoría</button></div>}
        closeModal={() => setChild(false)} />
    </>
  );
}

test('nested category dialog handles Escape without closing the underlying transaction editor', async () => {
  render(<NestedModalFixture />);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir transacción' }));
  fireEvent.click(screen.getByRole('button', { name: 'Gestionar categorías' }));
  expect(screen.getByRole('dialog', { name: 'Categorías' })).toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Editar transacción' })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Categorías' })).not.toBeInTheDocument());
  expect(screen.getByRole('dialog', { name: 'Editar transacción' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Gestionar categorías' })).toHaveFocus();
});
