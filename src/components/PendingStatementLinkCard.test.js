import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PendingStatementLinkCard from './PendingStatementLinkCard';

jest.mock('./CardStatementDetails', () => () => <p data-testid='pdf-consumptions'>PDF leído solo a pedido</p>);

const statement = {
  id:'sha-qa', expenseId:'synthetic-expense-1', institution:'Banco Ciudad',
  cardBrand:'Visa', period:'2026-10', closingDate:'2026-10-01',
  dueDate:'2026-10-13', totals:{ARS:125000.56,USD:18.40},
};
const banks = [
  {code:'ciudad',name:'Banco Ciudad',active:true},
  {code:'santander',name:'Banco Santander',active:true},
  {code:'inactive',name:'Banco Archivado',active:false},
];
const cards = [
  {id:'ciudad-visa',bankId:'ciudad',brand:'Visa',nickname:'Visa Ciudad',lastFour:'4555'},
  {id:'santander-visa',bankId:'santander',brand:'Visa',nickname:'Visa Santander',lastFour:'4210'},
  {id:'inactive-visa',bankId:'inactive',brand:'Visa',nickname:'Archivada'},
];
const mount=(overrides={})=>{
  const onLink=jest.fn().mockResolvedValue(undefined);
  const onLinked=jest.fn();
  const result=render(<PendingStatementLinkCard statement={statement} banks={banks} cards={cards}
    onLink={onLink} onLinked={onLinked} {...overrides}/>);
  return {...result,onLink,onLinked};
};
const openCard=()=>{
  const disclosure=screen.getByRole('button',{name:'Revisar vínculo'});
  expect(disclosure).toHaveAttribute('aria-expanded','false');
  fireEvent.click(disclosure);
  expect(screen.getByRole('button',{name:'Ocultar opciones'})).toHaveAttribute('aria-expanded','true');
};
const chooseSuggestion=()=>{
  fireEvent.click(screen.getByRole('button',{name:'Usar sugerencia'}));
  expect(screen.getByLabelText('Banco para 2026-10')).toHaveValue('ciudad');
  expect(screen.getByLabelText('Tarjeta para 2026-10')).toHaveValue('ciudad-visa');
};

test('first scan uses actual Transactions record surface and hides expensive controls',()=>{
  const {onLink}=mount();
  const card=screen.getByRole('article',{name:'Resumen pendiente 2026-10'});
  expect(card).toHaveClass('ltc-transaction-card','bg-white','dark:bg-slate-800');
  expect(card).toHaveTextContent('Banco Ciudad · Visa');
  expect(card).toHaveTextContent('Período 2026-10');
  expect(screen.getByRole('button',{name:'Revisar vínculo'})).toHaveClass('min-h-[44px]');
  expect(screen.queryByLabelText('Banco para 2026-10')).not.toBeInTheDocument();
  expect(screen.queryByTestId('pdf-consumptions')).not.toBeInTheDocument();
  expect(onLink).not.toHaveBeenCalled();
});

test('suggestion requires an explicit click and a separate accessible confirmation',async()=>{
  const {onLink,onLinked}=mount();
  openCard();
  expect(screen.getByRole('button',{name:'Usar sugerencia'})).toBeInTheDocument();
  expect(screen.getByLabelText('Banco para 2026-10')).toHaveValue('');
  expect(screen.getByRole('button',{name:'Revisar asociación'})).toBeDisabled();
  chooseSuggestion();
  const chosen=screen.getByText(/Tarjeta elegida:/);
  expect(chosen).toHaveTextContent('Visa Ciudad');
  expect(screen.getByTestId('pdf-consumptions')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Revisar asociación'}));
  const dialog=screen.getByRole('dialog',{name:'Confirmar vínculo del resumen 2026-10'});
  expect(dialog).toHaveAttribute('aria-modal','true');
  expect(dialog).toHaveTextContent('Banco Ciudad · Visa Ciudad');
  expect(dialog).toHaveTextContent('No se duplica la transacción');
  expect(onLink).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button',{name:'Cancelar'}));
  expect(onLink).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Revisar asociación'}));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirmar vínculo'}));
  await waitFor(()=>expect(onLink).toHaveBeenCalledWith('synthetic-expense-1','ciudad','ciudad-visa'));
  expect(onLink).toHaveBeenCalledTimes(1);
  await waitFor(()=>expect(onLinked).toHaveBeenCalledTimes(1));
});

test('repeated confirmation taps cannot create duplicate link writes',async()=>{
  let release;
  const onLink=jest.fn(()=>new Promise(resolve=>{release=resolve;}));
  mount({onLink});
  openCard(); chooseSuggestion();
  fireEvent.click(screen.getByRole('button',{name:'Revisar asociación'}));
  const button=within(screen.getByRole('dialog')).getByRole('button',{name:'Confirmar vínculo'});
  fireEvent.click(button);
  fireEvent.click(button);
  expect(onLink).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button',{name:'Vinculando…'})).toBeDisabled();
  await act(async()=>{release();});
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(onLink).toHaveBeenCalledTimes(1);
});

test('failed Firestore permission is actionable, never leaks raw exception; retry retains selection',async()=>{
  const onLink=jest.fn()
    .mockRejectedValueOnce(Object.assign(new Error('Permission path /users/private-user/secrets'),{code:'permission-denied'}))
    .mockResolvedValueOnce(undefined);
  mount({onLink});
  openCard(); chooseSuggestion();
  fireEvent.click(screen.getByRole('button',{name:'Revisar asociación'}));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirmar vínculo'}));
  await waitFor(()=>expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('Verificá tu sesión'));
  expect(screen.getByRole('dialog')).not.toHaveTextContent('/users/private-user/secrets');
  expect(screen.getByLabelText('Tarjeta para 2026-10')).toHaveValue('ciudad-visa');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirmar vínculo'}));
  await waitFor(()=>expect(onLink).toHaveBeenCalledTimes(2));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('switching banks clears old card; archived bank cannot be chosen',()=>{
  const {onLink}=mount();
  openCard(); chooseSuggestion();
  fireEvent.change(screen.getByLabelText('Banco para 2026-10'),{target:{value:'santander'}});
  expect(screen.getByLabelText('Tarjeta para 2026-10')).toHaveValue('');
  expect(screen.getByRole('button',{name:'Revisar asociación'})).toBeDisabled();
  const bankSelect=screen.getByLabelText('Banco para 2026-10');
  expect(within(bankSelect).queryByRole('option',{name:'Banco Archivado'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Tarjeta para 2026-10'),{target:{value:'santander-visa'}});
  expect(screen.getByRole('button',{name:'Revisar asociación'})).toBeEnabled();
  expect(onLink).not.toHaveBeenCalled();
});

test('masked figures cannot leak through the card or PDF child, preserving ARS/USD separation',()=>{
  const {container}=mount({privacyHidden:true});
  expect(screen.getByLabelText('Totales de resumen por moneda')).toHaveTextContent('ARS •••• · USD ••••');
  expect(container).not.toHaveTextContent('125.000');
  openCard();
  expect(screen.queryByTestId('pdf-consumptions')).not.toBeInTheDocument();
  expect(screen.getByText(/Mostrá los importes en Bancos/)).toBeInTheDocument();
  chooseSuggestion();
  expect(screen.getByRole('button',{name:'Revisar asociación'})).toBeEnabled();
});
