import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OCR } from '../generated/browser-ai/ocr';
import LocalScreenshotOcr from './LocalScreenshotOcr';

jest.mock('../generated/browser-ai/ocr',()=>({OCR:jest.fn()}));

beforeEach(()=>{
  OCR.mockReset();
  OCR.mockImplementation(()=>({
    load:jest.fn().mockResolvedValue(undefined),
    read:jest.fn().mockResolvedValue({text:'Consumos ARS 100,00',lines:[]}),
    dispose:jest.fn().mockResolvedValue(undefined),
  }));
});

test('downloads model only after owner selects a supported screenshot and asks to read it',async()=>{
  const onRecognized=jest.fn();
  render(<LocalScreenshotOcr onRecognized={onRecognized}/>);
  expect(OCR).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Elegir captura para lectura local'),{
    target:{files:[new File(['image'],'card.png',{type:'image/png'})]},
  });
  expect(OCR).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Leer captura en este dispositivo'}));
  await waitFor(()=>expect(onRecognized).toHaveBeenCalledWith({text:'Consumos ARS 100,00',lines:[]}));
  expect(OCR).toHaveBeenCalledWith(expect.objectContaining({size:'small'}));
});

test('privacy mode hides screenshot controls and prevents loading financial images',()=>{
  render(<LocalScreenshotOcr onRecognized={jest.fn()} privacyHidden/>);
  expect(screen.getByText(/Mostrá los importes/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Elegir captura para lectura local')).not.toBeInTheDocument();
  expect(OCR).not.toHaveBeenCalled();
});

test('unsupported files are rejected without loading a model',()=>{
  render(<LocalScreenshotOcr onRecognized={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Elegir captura para lectura local'),{
    target:{files:[new File(['pdf'],'statement.pdf',{type:'application/pdf'})]},
  });
  expect(screen.getByRole('alert')).toHaveTextContent(/PNG, JPG o WEBP/);
  expect(screen.getByRole('button',{name:'Leer captura en este dispositivo'})).toBeDisabled();
  expect(OCR).not.toHaveBeenCalled();
});
