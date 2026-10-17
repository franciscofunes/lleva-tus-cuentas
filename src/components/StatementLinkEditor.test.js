import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import StatementLinkEditor from './StatementLinkEditor';

const banks = [
  {code:'ciudad',name:'Banco Ciudad',active:true},
  {code:'santander',name:'Banco Santander',active:true},
];
const cards = [
  {id:'visa-ciudad',bankId:'ciudad',nickname:'Visa Ciudad',brand:'Visa',lastFour:'4555'},
  {id:'visa-santander',bankId:'santander',nickname:'Visa Santander',brand:'Visa',lastFour:'4210'},
  {id:'master-santander',bankId:'santander',nickname:'Master Santander',brand:'Mastercard',lastFour:'1234'},
];
const statement = {expenseId:'expense1',period:'2026-10',cardBrand:'Visa'};
const link = {expenseId:'expense1',bankId:'ciudad',cardId:'visa-ciudad'};
const mount = (props={}) => {
  const onSave=jest.fn().mockResolvedValue(undefined);
  const onUnlink=jest.fn().mockResolvedValue(undefined);
  const onClose=jest.fn();
  const result=render(<StatementLinkEditor statement={statement} link={link} banks={banks} cards={cards}
    onSave={onSave} onUnlink={onUnlink} onClose={onClose} {...props}/>);
  return {...result,onSave,onUnlink,onClose};
};

test('prefills current bank/card and blocks a no-op save', () => {
  const {onSave}=mount();
  expect(screen.getByLabelText('Nuevo banco del resumen')).toHaveValue('ciudad');
  expect(screen.getByLabelText('Nueva tarjeta del resumen')).toHaveValue('visa-ciudad');
  expect(screen.getByRole('button',{name:'Guardar nueva asociación'})).toBeDisabled();
  expect(onSave).not.toHaveBeenCalled();
});

test('filters cards by selected bank; confirms correction without changing amounts or PDF', async () => {
  const {onSave,onClose}=mount();
  fireEvent.change(screen.getByLabelText('Nuevo banco del resumen'),{target:{value:'santander'}});
  expect(screen.getByLabelText('Nueva tarjeta del resumen')).toHaveValue('');
  const list=screen.getByLabelText('Nueva tarjeta del resumen');
  expect(within(list).queryByRole('option',{name:/Visa Ciudad/})).not.toBeInTheDocument();
  expect(within(list).getByRole('option',{name:/Visa Santander/})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Guardar nueva asociación'})).toBeDisabled();
  fireEvent.change(list,{target:{value:'visa-santander'}});
  fireEvent.click(screen.getByRole('button',{name:'Guardar nueva asociación'}));
  await waitFor(()=>expect(onSave).toHaveBeenCalledWith('expense1','santander','visa-santander'));
  await waitFor(()=>expect(onClose).toHaveBeenCalledWith(expect.stringMatching(/nueva tarjeta/)));
});

test('unlink requires a second explicit confirmation, never removes the expense', async () => {
  const {onUnlink,onClose}=mount();
  fireEvent.click(screen.getByRole('button',{name:'Desvincular resumen'}));
  expect(screen.getByText(/No se borra su PDF/)).toBeInTheDocument();
  expect(onUnlink).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Mantener asociación'}));
  expect(onUnlink).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Desvincular resumen'}));
  fireEvent.click(screen.getByRole('button',{name:'Sí, desvincular'}));
  await waitFor(()=>expect(onUnlink).toHaveBeenCalledWith('expense1'));
  await waitFor(()=>expect(onClose).toHaveBeenCalledWith(expect.stringMatching(/desvinculado/)));
});

test('failed changes show error and leave modal open with user selection intact', async () => {
  const onSave=jest.fn().mockRejectedValue(new Error('Missing or insufficient permissions.'));
  const {onClose}=mount({onSave});
  fireEvent.change(screen.getByLabelText('Nuevo banco del resumen'),{target:{value:'santander'}});
  fireEvent.change(screen.getByLabelText('Nueva tarjeta del resumen'),{target:{value:'visa-santander'}});
  fireEvent.click(screen.getByRole('button',{name:'Guardar nueva asociación'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Missing or insufficient permissions.'));
  expect(screen.getByLabelText('Nueva tarjeta del resumen')).toHaveValue('visa-santander');
  expect(onClose).not.toHaveBeenCalled();
});
