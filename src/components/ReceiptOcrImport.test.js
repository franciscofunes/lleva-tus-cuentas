import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import ReceiptOcrImport from './ReceiptOcrImport';

jest.mock('./LocalScreenshotOcr', () => ({__esModule: true, default: ({onRecognized, allowCamera, privacyHidden}) => <>
  <button type='button' disabled={privacyHidden} aria-label={allowCamera ? 'Leer ticket de prueba' : 'No camera'}
    onClick={() => onRecognized({text:'LIBRERIA ABC\nFECHA 05/11/2026\nTOTAL ARS 12.500,00'})}>Leer imagen</button>
  <button type='button' disabled={privacyHidden} onClick={() => onRecognized({text:'COMERCIO: LIBRERIA ABC\nFECHA: 07/11/26\nCUPON 0078\nTOTAL ARS 2000'})}>Leer cupón de prueba</button>
  </>,
}));

test('receipt review requires selected field approval and never persists automatically', () => {
  const onApply = jest.fn();
  render(<ReceiptOcrImport onApply={onApply}/>);
  fireEvent.click(screen.getByRole('button', {name:'Leer ticket de prueba'}));
  expect(screen.getByText('ARS 12.500,00')).toBeInTheDocument();
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', {name:'Aplicar Fecha'}));
  fireEvent.click(screen.getByRole('button', {name:'Aplicar campos seleccionados'}));
  expect(onApply).toHaveBeenCalledWith({merchant:'LIBRERIA ABC', amount:12500, currency:'ARS'});
});

test('privacy state renders no photo content and prevents review', () => {
  const onApply = jest.fn();
  const {rerender} = render(<ReceiptOcrImport onApply={onApply}/>);
  fireEvent.click(screen.getByRole('button', {name:'Leer ticket de prueba'}));
  expect(screen.getByText('ARS 12.500,00')).toBeInTheDocument();
  rerender(<ReceiptOcrImport onApply={onApply} privacyHidden/>);
  expect(screen.queryByText('ARS 12.500,00')).not.toBeInTheDocument();
  expect(screen.queryByText('LIBRERIA ABC')).not.toBeInTheDocument();
  expect(screen.getByText(/Mostrá los importes/)).toBeInTheDocument();
  expect(onApply).not.toHaveBeenCalled();
});

test('the reviewed coupon number remains optional and only crosses when selected', () => {
  const onApply = jest.fn();
  render(<ReceiptOcrImport onApply={onApply}/>);
  fireEvent.click(screen.getByRole('button', {name:'Leer cupón de prueba'}));
  expect(screen.getByText('0078')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', {name:'Aplicar N.º de ticket, cupón u operación'}));
  fireEvent.click(screen.getByRole('button', {name:'Aplicar campos seleccionados'}));
  expect(onApply).toHaveBeenCalledWith({merchant:'LIBRERIA ABC',amount:2000,date:'2026-11-07',currency:'ARS'});
});
