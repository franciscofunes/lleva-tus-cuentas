import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import QuickPurchaseCapture, {normalizePurchaseAmount} from './QuickPurchaseCapture';
import { saveManualCardCharge, subscribeBankCards, subscribeBanks } from '../services/bankingService';

jest.mock('../services/bankingService', () => ({
  saveManualCardCharge: jest.fn(),
  subscribeBankCards: jest.fn(),
  subscribeBanks: jest.fn(),
}));
jest.mock('./ReceiptOcrImport', () => ({__esModule: true, default: ({onApply}) =>
  <button type='button' onClick={() => onApply({merchant: 'CARNES DEL SUR', amount: 16120, date: '2026-11-07', currency: null})}>Aplicar lectura de prueba</button>,
}));

beforeEach(() => {
  jest.clearAllMocks();
  subscribeBankCards.mockImplementation((_uid, onData) => {
    onData([{id: 'card1', bankId: 'bank1', nickname: 'Visa', lastFour: '1234'}]);
    return jest.fn();
  });
  subscribeBanks.mockImplementation((_uid, onData) => {onData([{id: 'bank1', name: 'Santander'}]);return jest.fn();});
  saveManualCardCharge.mockResolvedValue({id: 'charge1'});
});

test('accepts a credit purchase without uploading any receipt and does not write a Transaction', async () => {
  const onClose = jest.fn();
  const onTransactionDraft = jest.fn();
  render(<QuickPurchaseCapture uid='alice' onClose={onClose} onTransactionDraft={onTransactionDraft}/>);
  expect(screen.getByText(/Ningún comprobante es obligatorio/)).toBeInTheDocument();
  expect(screen.getByRole('button', {name:/Datos extra: comprobante y nota/})).toHaveAttribute('aria-expanded','false');
  expect(screen.queryByLabelText('N.º de ticket, cupón o factura (opcional)')).not.toBeInTheDocument();
  expect(screen.getByRole('button', {name:/Leer ticket o cupón/})).toHaveClass('dark:bg-slate-800', 'focus-visible:ring-violet-500');
  expect(screen.getByLabelText('Comercio')).toHaveClass('dark:bg-slate-800', 'text-base');
  expect(screen.queryByRole('button', {name:'Aplicar lectura de prueba'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Tarjeta utilizada'), {target:{value:'card1'}});
  fireEvent.change(screen.getByLabelText('Comercio'), {target:{value:'Verdulería del barrio'}});
  fireEvent.change(screen.getByLabelText('Importe'), {target:{value:'12.345,67'}});
  fireEvent.click(screen.getByRole('button', {name:'Guardar consumo de tarjeta'}));
  await waitFor(() => expect(saveManualCardCharge).toHaveBeenCalledWith('alice', expect.objectContaining({
    cardId:'card1',bankId:'bank1',merchant:'Verdulería del barrio',amount:'12345.67',currency:'ARS',installments:1,
  })));
  await waitFor(() => expect(onClose).toHaveBeenCalledWith(expect.stringMatching(/Consumo registrado/)));
  expect(onTransactionDraft).not.toHaveBeenCalled();
});

test('a card coupon number can be entered manually without a photo or invoice', async () => {
  const onClose = jest.fn();
  render(<QuickPurchaseCapture uid='alice' onClose={onClose} onTransactionDraft={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Tarjeta utilizada'), {target:{value:'card1'}});
  fireEvent.change(screen.getByLabelText('Comercio'), {target:{value:'Farmacia del Centro'}});
  fireEvent.change(screen.getByLabelText('Importe'), {target:{value:'2850,50'}});
  fireEvent.click(screen.getByRole('button', {name:/Datos extra: comprobante y nota/}));
  fireEvent.change(screen.getByLabelText('Tipo de comprobante (opcional)'), {target:{value:'coupon'}});
  fireEvent.change(screen.getByLabelText('N.º de ticket, cupón o factura (opcional)'), {target:{value:'000482'}});
  fireEvent.click(screen.getByRole('button', {name:'Guardar consumo de tarjeta'}));
  await waitFor(() => expect(saveManualCardCharge).toHaveBeenCalledWith('alice', expect.objectContaining({
    amount:'2850.50',note:'Cupón: 000482',
  })));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(screen.queryByRole('button', {name:'Aplicar lectura de prueba'})).not.toBeInTheDocument();
});

test('cash, debit and transfer only prepare a reviewed Transactions draft', async () => {
  const onTransactionDraft = jest.fn();
  render(<QuickPurchaseCapture uid='alice' onClose={jest.fn()} onTransactionDraft={onTransactionDraft}/>);
  fireEvent.change(screen.getByLabelText('Medio de pago'), {target:{value:'cash'}});
  fireEvent.change(screen.getByLabelText('Comercio'), {target:{value:'Almacén'}});
  fireEvent.change(screen.getByLabelText('Importe'), {target:{value:'12975'}});
  fireEvent.click(screen.getByRole('button', {name:/Datos extra: comprobante y nota/}));
  fireEvent.change(screen.getByLabelText('N.º de ticket, cupón o factura (opcional)'), {target:{value:'3-84'}});
  fireEvent.click(screen.getByRole('button', {name:'Continuar a Transacciones'}));
  await waitFor(() => expect(onTransactionDraft).toHaveBeenCalledWith(expect.objectContaining({
    merchant:'Almacén',amount:'12975',currency:'ARS',comment:expect.stringMatching(/Ticket: 3-84.*Pago: Efectivo/),
  })));
  expect(saveManualCardCharge).not.toHaveBeenCalled();
});

test('local OCR is optional and requires a separate user action before filling inputs', () => {
  render(<QuickPurchaseCapture uid='alice' onClose={jest.fn()} onTransactionDraft={jest.fn()}/>);
  fireEvent.click(screen.getByRole('button', {name:/Leer ticket o cupón/}));
  fireEvent.click(screen.getByRole('button', {name:'Aplicar lectura de prueba'}));
  expect(screen.getByLabelText('Comercio')).toHaveValue('CARNES DEL SUR');
  expect(screen.getByLabelText('Importe')).toHaveValue('16120');
  expect(screen.getByLabelText('Fecha de compra')).toHaveValue('2026-11-07');
  expect(saveManualCardCharge).not.toHaveBeenCalled();
});

test('privacy mode cannot show or submit a draft', () => {
  render(<QuickPurchaseCapture uid='alice' privacyHidden onClose={jest.fn()} onTransactionDraft={jest.fn()}/>);
  expect(screen.getByText(/Mostrá los importes/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Comercio')).not.toBeInTheDocument();
  expect(saveManualCardCharge).not.toHaveBeenCalled();
});

test('amount normalization preserves exact Argentine cents and rejects ambiguous values', () => {
  expect(normalizePurchaseAmount('12.345,67')).toBe('12345.67');
  expect(normalizePurchaseAmount('12345,67')).toBe('12345.67');
  expect(normalizePurchaseAmount('12345.67')).toBe('12345.67');
  expect(() => normalizePurchaseAmount('12.345.67')).toThrow(/Revisá el importe/);
  expect(() => normalizePurchaseAmount('12345,678')).toThrow(/Revisá el importe/);
});
