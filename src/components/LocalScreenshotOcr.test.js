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

test('camera permission is requested only when clicked and tracks are stopped on close',async()=>{
  const stop = jest.fn();
  const getUserMedia = jest.fn().mockResolvedValue({getTracks:()=>[{stop}]});
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia}});
  const play = jest.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(()=>Promise.resolve());
  const {unmount}=render(<LocalScreenshotOcr onRecognized={jest.fn()} allowCamera/>);
  expect(getUserMedia).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Abrir cámara para sacar foto'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Cerrar cámara'})).toBeInTheDocument());
  expect(getUserMedia).toHaveBeenCalledWith({audio:false,video:{facingMode:{ideal:'environment'}}});
  fireEvent.click(screen.getByRole('button',{name:'Cerrar cámara'}));
  expect(stop).toHaveBeenCalledTimes(1);
  unmount();
  play.mockRestore();
  delete navigator.mediaDevices;
});

test('denied camera permission leaves image picker available and no OCR starts',async()=>{
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:jest.fn().mockRejectedValue({name:'NotAllowedError'})}});
  render(<LocalScreenshotOcr onRecognized={jest.fn()} allowCamera/>);
  fireEvent.click(screen.getByRole('button',{name:'Abrir cámara para sacar foto'}));
  expect(await screen.findByRole('alert')).toHaveTextContent(/No se autorizó la cámara/);
  expect(screen.getByLabelText('Elegir captura para lectura local')).toBeInTheDocument();
  expect(OCR).not.toHaveBeenCalled();
  delete navigator.mediaDevices;
});

test('hiding financial values stops an active camera without retaining a photo',async()=>{
  const stop = jest.fn();
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:jest.fn().mockResolvedValue({getTracks:()=>[{stop}]})}});
  const play = jest.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(()=>Promise.resolve());
  const {rerender}=render(<LocalScreenshotOcr onRecognized={jest.fn()} allowCamera/>);
  fireEvent.click(screen.getByRole('button',{name:'Abrir cámara para sacar foto'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Cerrar cámara'})).toBeInTheDocument());
  rerender(<LocalScreenshotOcr onRecognized={jest.fn()} allowCamera privacyHidden/>);
  await waitFor(()=>expect(stop).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('button',{name:'Tomar foto'})).not.toBeInTheDocument();
  play.mockRestore();
  delete navigator.mediaDevices;
});

test('browser runtime error explains the retry without exposing technical or financial data',async()=>{
  OCR.mockImplementation(()=>({
    load:jest.fn().mockRejectedValue(new Error('no available backend found: wasm initialization failed')),
    dispose:jest.fn().mockResolvedValue(undefined),
  }));
  render(<LocalScreenshotOcr onRecognized={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Elegir captura para lectura local'),{
    target:{files:[new File(['test'],'card.png',{type:'image/png'})]},
  });
  fireEvent.click(screen.getByRole('button',{name:'Leer captura en este dispositivo'}));
  expect(await screen.findByRole('alert')).toHaveTextContent(/\[OCR-MOTOR\] No se pudo iniciar el lector local/);
  expect(screen.getByRole('combobox',{name:'Precisión del modelo OCR'})).toBeInTheDocument();
});

test('classifies a blocked model download without echoing the remote URL or financial content',async()=>{
  OCR.mockImplementation(()=>({
    load:jest.fn().mockRejectedValue(new Error('Could not load det.onnx (403) https://example.net/private-token')),
    dispose:jest.fn().mockResolvedValue(undefined),
  }));
  render(<LocalScreenshotOcr onRecognized={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Elegir captura para lectura local'),{
    target:{files:[new File(['test'],'plazo-fijo.png',{type:'image/png'})]},
  });
  fireEvent.click(screen.getByRole('button',{name:'Leer captura en este dispositivo'}));
  expect(await screen.findByRole('alert')).toHaveTextContent(/\[OCR-NET\]/);
  expect(screen.getByRole('alert')).not.toHaveTextContent(/private-token|plazo-fijo/);
  expect(screen.getByText(/Lector local v2/)).toBeInTheDocument();
  // The original screenshot remains available to retry without re-uploading.
  expect(screen.getByRole('button',{name:'Leer captura en este dispositivo'})).toBeEnabled();
});
