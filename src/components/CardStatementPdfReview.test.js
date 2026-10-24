import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CardStatementPdfReview from './CardStatementPdfReview';
import { analyzeStatementPdf } from '../services/cardStatementService';
import { localModelAvailability, suggestLocalCategories } from '../services/localCategorySuggestions';

jest.mock('../services/localCategorySuggestions', () => ({
  ...jest.requireActual('../services/localCategorySuggestions'),
  localModelAvailability:jest.fn(),
  suggestLocalCategories:jest.fn(),
}));
jest.mock('../services/cardStatementService', () => ({
  analyzeStatementPdf: jest.fn(),
}));
const syntheticDraft = {
  schema: 'ltc.card-statement.v1',
  fileSha256: 'a'.repeat(64),
  statement: {
    reconciliation: {ARS:true,USD:true},
    period:'2026-10', closingDate:'2026-10-03', dueDate:'2026-10-15',
    totals: {ARS:'141234.55',USD:'22.50'},
    purchases: {ARS:'141234.55',USD:'22.50'},
    taxesArs:'0.00',feesArs:'0.00',
  },
  items:[
    {sourcePage:1,receipt:'1',merchant:'LTC QA Compra ARS',date:'2026-10-02',currency:'ARS',amount:'141234.55'},
    {sourcePage:2,receipt:'2',merchant:'LTC QA Compra USD',date:'2026-10-03',currency:'USD',amount:'22.50'},
  ],
};
const file = () => new File(['%PDF-1.7 qa only'],'LTC-QA-secret-141234.pdf',{type:'application/pdf'});
beforeEach(() => {
  jest.clearAllMocks();
  analyzeStatementPdf.mockResolvedValue(syntheticDraft);
  localModelAvailability.mockResolvedValue('available');
  suggestLocalCategories.mockResolvedValue({
    proposals:[{index:0,merchant:'LTC QA Compra ARS',category:'Compras'}],
    durationMs:400,engine:'Prompt API',
  });
});
const mount=(privacyHidden = true,onApply=jest.fn())=>{
  const onDraft=jest.fn();
  const view=render(<CardStatementPdfReview
    categories={[{name:'Compras',isExpense:true}]}
    onDraft={onDraft} onApply={onApply} privacyHidden={privacyHidden}/>);
  return {...view,onDraft,onApply};
};
const upload=()=>fireEvent.change(screen.getByLabelText('Elegir resumen bancario en PDF'),{
  target:{files:[file()]},
});

test('masked review never renders PDF filename, financial amounts, merchant or editor even after analysis',async()=>{
  const {onDraft,onApply}=mount();
  upload();
  await waitFor(()=>expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({fileSha256:syntheticDraft.fileSha256})));
  expect(screen.getByText('Archivo PDF seleccionado')).toBeInTheDocument();
  expect(screen.getByText(/Resumen analizado y conciliado/)).toBeInTheDocument();
  expect(screen.queryByText(/LTC-QA-secret-141234/)).not.toBeInTheDocument();
  expect(screen.queryByText('LTC QA Compra ARS')).not.toBeInTheDocument();
  expect(screen.queryByText(/141\.234,55/)).not.toBeInTheDocument();
  expect(screen.queryByText('Total ARS')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Completar campos del formulario/})).not.toBeInTheDocument();
  expect(onApply).not.toHaveBeenCalled();
});

test('toggling privacy removes reviewed PDF DOM and restores same unsaved categorized draft',async()=>{
  const {rerender,onDraft,onApply}=mount(false);
  upload();
  expect(await screen.findByText('Totales conciliados')).toBeInTheDocument();
  expect(screen.getByText('LTC-QA-secret-141234.pdf')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Revisar y categorizar consumos/}));
  expect(screen.getByText('LTC QA Compra ARS')).toBeInTheDocument();
  const select=screen.getAllByLabelText('Categoría sugerida',{selector:'select'})[0];
  fireEvent.change(select,{target:{value:'Compras'}});
  expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({
    items:expect.arrayContaining([expect.objectContaining({merchant:'LTC QA Compra ARS',suggestedCategory:'Compras'})]),
  }));
  rerender(<CardStatementPdfReview categories={[{name:'Compras',isExpense:true}]} onDraft={onDraft}
    onApply={onApply} privacyHidden/>);
  expect(screen.queryByText('LTC QA Compra ARS')).not.toBeInTheDocument();
  expect(screen.queryByText('LTC-QA-secret-141234.pdf')).not.toBeInTheDocument();
  expect(screen.queryByText('Totales conciliados')).not.toBeInTheDocument();
  rerender(<CardStatementPdfReview categories={[{name:'Compras',isExpense:true}]} onDraft={onDraft}
    onApply={onApply} privacyHidden={false}/>);
  expect(screen.getByText('LTC QA Compra ARS')).toBeInTheDocument();
  expect(screen.getAllByLabelText('Categoría sugerida',{selector:'select'})[0]).toHaveValue('Compras');
  expect(onApply).not.toHaveBeenCalled();
});

test('visible review uses touch-friendly controls and optional application still requires a user click',async()=>{
  const {onApply}=mount(false);
  upload();
  expect(await screen.findByText('Totales conciliados')).toBeInTheDocument();
  const expand=screen.getByRole('button',{name:/Revisar y categorizar consumos/});
  expect(expand).toHaveClass('min-h-[44px]','focus-visible:ring-2');
  fireEvent.click(expand);
  expect(screen.getAllByLabelText('Categoría sugerida',{selector:'select'})[0]).toHaveClass('min-h-[44px]');
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:/Completar campos del formulario/}));
  expect(onApply).toHaveBeenCalledTimes(1);
  expect(onApply).toHaveBeenCalledWith(syntheticDraft.statement);
});

test('local AI pilot is gated and never shows suggestion button by default',async()=>{
  mount(false);
  upload();
  expect(await screen.findByText('Totales conciliados')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Revisar y categorizar consumos/}));
  expect(screen.queryByRole('button',{name:'Sugerir categorías en este dispositivo'})).not.toBeInTheDocument();
  expect(suggestLocalCategories).not.toHaveBeenCalled();
});

test('opt-in local proposal requires explicit per-item acceptance; never changes money',async()=>{
  const onDraft=jest.fn();
  const onApply=jest.fn();
  render(<CardStatementPdfReview categories={[{name:'Compras',isExpense:true}]}
    onDraft={onDraft} onApply={onApply} privacyHidden={false} enableOnDeviceSuggestions/>);
  upload();
  expect(await screen.findByText('Totales conciliados')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Revisar y categorizar consumos/}));
  const ai=await screen.findByRole('button',{name:'Sugerir categorías en este dispositivo'});
  expect(suggestLocalCategories).not.toHaveBeenCalled();
  fireEvent.click(ai);
  const accept=await screen.findByRole('button',{name:'Aplicar sugerencia'});
  expect(onDraft).not.toHaveBeenLastCalledWith(expect.objectContaining({
    items:expect.arrayContaining([expect.objectContaining({suggestedCategory:'Compras'})]),
  }));
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(accept);
  const last=onDraft.mock.calls[onDraft.mock.calls.length-1][0];
  expect(last.items[0]).toEqual(expect.objectContaining({
    suggestedCategory:'Compras',amount:'141234.55',currency:'ARS',
    merchant:'LTC QA Compra ARS',
  }));
  expect(last.statement.totals).toEqual({ARS:'141234.55',USD:'22.50'});
  expect(last.fileSha256).toBe(syntheticDraft.fileSha256);
  expect(onApply).not.toHaveBeenCalled();
  expect(screen.queryByRole('button',{name:'Aplicar sugerencia'})).not.toBeInTheDocument();
});

test('local AI shows unsupported notice, preserving manual editing',async()=>{
  localModelAvailability.mockResolvedValue('unavailable');
  const onDraft=jest.fn();
  render(<CardStatementPdfReview categories={[{name:'Compras',isExpense:true}]}
    onDraft={onDraft} onApply={jest.fn()} privacyHidden={false} enableOnDeviceSuggestions/>);
  upload();
  expect(await screen.findByText('Totales conciliados')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Revisar y categorizar consumos/}));
  expect(await screen.findByText(/Este navegador no ofrece el modelo local/)).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Sugerir categorías en este dispositivo'})).not.toBeInTheDocument();
  expect(screen.getAllByLabelText('Categoría sugerida',{selector:'select'})[0]).toBeEnabled();
});

test('masking privacy while local model runs cancels it and unmounts every suggestion',async()=>{
  let resolve;
  suggestLocalCategories.mockImplementation(()=>new Promise(done=>{resolve=done;}));
  const onDraft=jest.fn();
  const onApply=jest.fn();
  const {rerender}=render(<CardStatementPdfReview categories={[{name:'Compras',isExpense:true}]}
    onDraft={onDraft} onApply={onApply} privacyHidden={false} enableOnDeviceSuggestions/>);
  upload();
  expect(await screen.findByText('Totales conciliados')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Revisar y categorizar consumos/}));
  fireEvent.click(await screen.findByRole('button',{name:'Sugerir categorías en este dispositivo'}));
  expect(await screen.findByRole('button',{name:'Cancelar IA'})).toBeInTheDocument();
  rerender(<CardStatementPdfReview categories={[{name:'Compras',isExpense:true}]}
    onDraft={onDraft} onApply={onApply} privacyHidden enableOnDeviceSuggestions/>);
  expect(screen.queryByRole('button',{name:'Cancelar IA'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Aplicar sugerencia'})).not.toBeInTheDocument();
  await require('@testing-library/react').act(async()=>{
    resolve({proposals:[{index:0,merchant:'LTC QA Compra ARS',category:'Compras'}],durationMs:50});
  });
  expect(screen.queryByRole('button',{name:'Aplicar sugerencia'})).not.toBeInTheDocument();
  expect(onApply).not.toHaveBeenCalled();
});
