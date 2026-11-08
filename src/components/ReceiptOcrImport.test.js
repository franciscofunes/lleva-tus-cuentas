import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import ReceiptOcrImport from './ReceiptOcrImport';

jest.mock('./LocalScreenshotOcr', () => ({__esModule: true, default: ({onRecognized, allowCamera, autoRead, compact, receiptMode}) => <>
  <span data-testid='receipt-reader-mode'>{`${allowCamera}/${autoRead}/${compact}/${receiptMode}`}</span>
  <button type='button' onClick={() => onRecognized({text:'LIBRERIA ABC\nFECHA 05/11/2026\nTOTAL ARS 12.500,00'})}>Leer ticket de prueba</button>
  <button type='button' onClick={() => onRecognized({text:'COMERCIO: LIBRERIA ABC\nFECHA: 07/11/26\nCUPON 0078\nTOTAL ARS 2000'})}>Leer cupón de prueba</button>
  <button type='button' onClick={() => onRecognized({text:'DOCUMENTO NO FISCAL\nCARNES DEL NORTE\nFecha borrosa\nTOTAL borroso'})}>Leer ticket borroso</button>
  <button type='button' onClick={() => onRecognized({text:'DOCUMENTO NO FISCAL\n---\n###'})}>Leer ticket ilegible</button>
</>}));

test('OCR immediately fills the draft, with no checkbox or extra Apply action and no save', () => {
  const onApply = jest.fn();
  render(<ReceiptOcrImport onApply={onApply}/>);
  expect(screen.getByTestId('receipt-reader-mode')).toHaveTextContent('true/true/true/true');
  fireEvent.click(screen.getByRole('button', {name:'Leer ticket de prueba'}));
  expect(onApply).toHaveBeenCalledTimes(1);
  expect(onApply).toHaveBeenCalledWith({merchant:'LIBRERIA ABC',amount:12500,date:'2026-11-05',currency:'ARS',ocrMissingFields:[]});
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', {name:/Aplicar campos/})).not.toBeInTheDocument();
});

test('privacy mode does not render the reader or use OCR content', () => {
  const onApply = jest.fn();
  render(<ReceiptOcrImport onApply={onApply} privacyHidden/>);
  expect(screen.getByText(/Mostrá los importes/)).toBeInTheDocument();
  expect(screen.queryByRole('button', {name:'Leer ticket de prueba'})).not.toBeInTheDocument();
  expect(onApply).not.toHaveBeenCalled();
});

test('optional coupon number crosses directly into the editable draft', () => {
  const onApply = jest.fn();
  render(<ReceiptOcrImport onApply={onApply}/>);
  fireEvent.click(screen.getByRole('button', {name:'Leer cupón de prueba'}));
  expect(onApply).toHaveBeenCalledWith({merchant:'LIBRERIA ABC',amount:2000,date:'2026-11-07',currency:'ARS',documentNumber:'0078',documentType:'coupon',ocrMissingFields:[]});
});

test('crumpled non-fiscal receipt still proposes the merchant and marks amount/date missing', () => {
  const onApply = jest.fn();
  render(<ReceiptOcrImport onApply={onApply}/>);
  fireEvent.click(screen.getByRole('button', {name:'Leer ticket borroso'}));
  expect(onApply).toHaveBeenCalledWith({merchant:'CARNES DEL NORTE',currency:null,ocrMissingFields:['importe','fecha']});
});

test('unreadable image stays on manual-entry path without dumping long OCR text', () => {
  const onApply = jest.fn();
  render(<ReceiptOcrImport onApply={onApply}/>);
  fireEvent.click(screen.getByRole('button', {name:'Leer ticket ilegible'}));
  expect(onApply).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent(/completar la compra a mano/);
  expect(screen.getByText(/Ver texto leído \(opcional\)/)).toBeInTheDocument();
});
