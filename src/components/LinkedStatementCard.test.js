import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LinkedStatementCard from './LinkedStatementCard';

jest.mock('./CardStatementDetails', () => ({ expenseId }) =>
  <p data-testid='linked-pdf-items'>Desglose del PDF {expenseId}</p>);

const statement={
  expenseId:'synthetic-expense-1', period:'2026-10', cardBrand:'Visa',
  closingDate:'2026-10-02', dueDate:'2026-10-15', itemCount:2,
  totals:{ARS:125300.21,USD:24.50},
};

test('linked summary reuses Transactions item tokens, dates, native currencies and compact disclosure',()=>{
  const onCorrect=jest.fn();
  render(<LinkedStatementCard statement={statement} onCorrect={onCorrect}/>);
  const card=screen.getByRole('article',{name:'Resumen vinculado 2026-10 Visa'});
  expect(card).toHaveClass('ltc-transaction-card','dark:bg-slate-800');
  expect(card).toHaveTextContent('Resumen 2026-10 · Visa');
  expect(card).toHaveTextContent('Cierre 2026-10-02 · Vencimiento 2026-10-15 · 2 consumos');
  expect(within(card).getByLabelText('Totales del resumen vinculado por moneda')).toHaveTextContent('ARS');
  expect(within(card).getByLabelText('Totales del resumen vinculado por moneda')).toHaveTextContent('USD');
  const button=within(card).getByRole('button',{name:'Revisar resumen'});
  expect(button).toHaveClass('min-h-[44px]');
  expect(button).toHaveAttribute('aria-expanded','false');
  expect(within(card).queryByTestId('linked-pdf-items')).not.toBeInTheDocument();
  expect(within(card).queryByRole('button',{name:'Corregir vínculo del resumen 2026-10'})).not.toBeInTheDocument();
  expect(onCorrect).not.toHaveBeenCalled();
});

test('read-only drilldown is loaded only on demand; existing association is corrected by parent modal only',()=>{
  const onCorrect=jest.fn();
  render(<LinkedStatementCard statement={statement} onCorrect={onCorrect}/>);
  fireEvent.click(screen.getByRole('button',{name:'Revisar resumen'}));
  expect(screen.getByRole('button',{name:'Ocultar opciones'})).toHaveAttribute('aria-expanded','true');
  expect(screen.getByTestId('linked-pdf-items')).toHaveTextContent('synthetic-expense-1');
  const correct=screen.getByRole('button',{name:'Corregir vínculo del resumen 2026-10'});
  expect(correct).toHaveClass('min-h-[44px]');
  fireEvent.click(correct);
  expect(onCorrect).toHaveBeenCalledTimes(1);
  expect(onCorrect).toHaveBeenCalledWith('synthetic-expense-1');
  fireEvent.click(screen.getByRole('button',{name:'Ocultar opciones'}));
  expect(screen.queryByTestId('linked-pdf-items')).not.toBeInTheDocument();
});

test('privacy hides totals and removes the PDF child immediately while preserving manual correction',()=>{
  const onCorrect=jest.fn();
  const {rerender}=render(<LinkedStatementCard statement={statement} onCorrect={onCorrect} privacyHidden={false}/>);
  fireEvent.click(screen.getByRole('button',{name:'Revisar resumen'}));
  expect(screen.getByTestId('linked-pdf-items')).toBeInTheDocument();
  rerender(<LinkedStatementCard statement={statement} onCorrect={onCorrect} privacyHidden/>);
  expect(screen.queryByTestId('linked-pdf-items')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Totales del resumen vinculado por moneda')).toHaveTextContent('ARS •••• · USD ••••');
  expect(screen.getByText(/Mostrá los importes en Bancos/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Corregir vínculo del resumen 2026-10'}));
  expect(onCorrect).toHaveBeenCalledTimes(1);
  rerender(<LinkedStatementCard statement={statement} onCorrect={onCorrect} privacyHidden={false}/>);
  expect(screen.getByTestId('linked-pdf-items')).toBeInTheDocument();
});

test('busy state disables link correction without blocking read-only statement expansion',()=>{
  const onCorrect=jest.fn();
  render(<LinkedStatementCard statement={statement} disabled onCorrect={onCorrect}/>);
  fireEvent.click(screen.getByRole('button',{name:'Revisar resumen'}));
  const correct=screen.getByRole('button',{name:'Corregir vínculo del resumen 2026-10'});
  expect(correct).toBeDisabled();
  fireEvent.click(correct);
  expect(onCorrect).not.toHaveBeenCalled();
});
