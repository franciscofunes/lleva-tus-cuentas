import React from 'react';
import '@testing-library/jest-dom';
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import { OCR } from '../generated/browser-ai/ocr';
import CardConsumptionMarkdownImporter from './CardConsumptionMarkdownImporter';
jest.mock('../generated/browser-ai/ocr',()=>({OCR:jest.fn()}));
const banks=[{code:'ciudad',name:'Banco Ciudad'},{code:'galicia',name:'Banco Galicia'}];
const cards=[{id:'visa',bankId:'ciudad',nickname:'Visa Gold',lastFour:'1234'},
 {id:'master',bankId:'galicia',nickname:'Master',lastFour:'4567'}];
const sample=`# ChatGPT screenshot
- type: snapshot
  banco: Banco Ciudad
  tarjeta: Visa Gold
  fechaConsulta: 2026-10-18
  consumosARS: 475.000,00
  consumosUSD: 20.00
- type: charge
  banco: Banco Galicia
  tarjeta: Master
  comercio: Farmacia
  fechaCompra: 2026-10-17
  importe: 10000,00
  moneda: ARS
  cuotas: 1`;

test('ChatGPT Markdown is read-only until bank/card review and explicit final confirmation',async()=>{
 const onSave=jest.fn().mockResolvedValue({snapshots:1,charges:1,duplicates:0});
 const onClose=jest.fn();
 render(<CardConsumptionMarkdownImporter banks={banks} cards={cards} charges={[]} onSave={onSave} onClose={onClose}/>);
 fireEvent.click(screen.getByRole('button',{name:'Pegar Markdown'}));
 fireEvent.change(screen.getByLabelText('Markdown de consumos de tarjetas'),{target:{value:sample}});
 fireEvent.click(screen.getByRole('button',{name:'Revisar datos antes de guardar'}));
 expect(onSave).not.toHaveBeenCalled();
 expect(screen.getByText(/475000/)).toBeInTheDocument();
 expect(screen.getAllByText(/Farmacia/).length).toBeGreaterThan(0);
 expect(screen.getByRole('button',{name:/Confirmar/})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Banco registro 1'),{target:{value:'ciudad'}});
 fireEvent.change(screen.getByLabelText('Tarjeta registro 1'),{target:{value:'visa'}});
 fireEvent.change(screen.getByLabelText('Banco registro 2'),{target:{value:'galicia'}});
 fireEvent.change(screen.getByLabelText('Tarjeta registro 2'),{target:{value:'master'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirmar 2 registro(s)'}));
 await waitFor(()=>expect(onSave).toHaveBeenCalledTimes(1));
 const saved=onSave.mock.calls[0][0];
 expect(saved).toHaveLength(2);
 expect(saved[0].snapshot.currentConsumptionARS).toBe(475000);
 expect(saved[0]).toMatchObject({bankId:'ciudad',cardId:'visa'});
 expect(saved[1]).toMatchObject({bankId:'galicia',cardId:'master'});
 await waitFor(()=>expect(onClose).toHaveBeenCalledWith(expect.stringMatching(/Importación confirmada/)));
});

test('blocks purchases that match an already registered bank/card/date/amount/merchant',()=>{
 const onSave=jest.fn();
 render(<CardConsumptionMarkdownImporter banks={banks} cards={cards}
  charges={[{bankId:'galicia',cardId:'master',merchant:'Farmacia',
   purchaseDate:'2026-10-17',amount:10000,currency:'ARS',installments:1}]} onSave={onSave} onClose={jest.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Pegar Markdown'}));
 fireEvent.change(screen.getByLabelText('Markdown de consumos de tarjetas'),{target:{value:sample}});
 fireEvent.click(screen.getByRole('button',{name:'Revisar datos antes de guardar'}));
 fireEvent.change(screen.getByLabelText('Banco registro 1'),{target:{value:'ciudad'}});
 fireEvent.change(screen.getByLabelText('Tarjeta registro 1'),{target:{value:'visa'}});
 fireEvent.change(screen.getByLabelText('Banco registro 2'),{target:{value:'galicia'}});
 fireEvent.change(screen.getByLabelText('Tarjeta registro 2'),{target:{value:'master'}});
 expect(screen.getByText(/compra coincide con un consumo existente/)).toBeInTheDocument();
 expect(screen.getByRole('button',{name:/Confirmar/})).toBeDisabled();
 fireEvent.click(screen.getByLabelText('Importar registro 2'));
 expect(screen.getByRole('button',{name:'Confirmar 1 registro(s)'})).not.toBeDisabled();
 expect(onSave).not.toHaveBeenCalled();
});

test('reviewed local OCR snapshot uses the existing safe card import path',async()=>{
 OCR.mockImplementation(()=>({load:jest.fn().mockResolvedValue(undefined),
  read:jest.fn().mockResolvedValue({text:'Consumos ARS 475.000,00\nConsumos USD 20.00\nFecha de consulta: 18/10/2026',lines:[]}),
  dispose:jest.fn().mockResolvedValue(undefined)}));
 const onSave=jest.fn().mockResolvedValue({snapshots:1,charges:0,duplicates:0});
 const onClose=jest.fn();
 render(<CardConsumptionMarkdownImporter banks={banks} cards={cards} charges={[]} onSave={onSave} onClose={onClose}/>);
 fireEvent.change(screen.getByLabelText('Elegir captura para lectura local'),{
  target:{files:[new File(['image'],'galicia.png',{type:'image/png'})]},
 });
 fireEvent.click(screen.getByRole('button',{name:'Leer captura en este dispositivo'}));
 await waitFor(()=>expect(screen.getByLabelText('Consumos ARS detectados')).toHaveValue('475.000,00'));
 expect(onSave).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Banco para la captura'),{target:{value:'ciudad'}});
 fireEvent.change(screen.getByLabelText('Tarjeta para la captura'),{target:{value:'visa'}});
 fireEvent.click(screen.getByRole('button',{name:'Revisar datos detectados'}));
 expect(screen.getByRole('button',{name:'Confirmar 1 registro(s)'})).not.toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Confirmar 1 registro(s)'}));
 await waitFor(()=>expect(onSave).toHaveBeenCalledWith([expect.objectContaining({
  type:'snapshot',bankId:'ciudad',cardId:'visa',
  snapshot:expect.objectContaining({currentConsumptionARS:475000,currentConsumptionUSD:20,asOf:'2026-10-18'})
 })]));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Confirmar 1 registro(s)'})).not.toBeDisabled());
});

test('privacy mode does not expose or save recognized amounts',()=>{
 const onSave=jest.fn();
 render(<CardConsumptionMarkdownImporter banks={banks} cards={cards} charges={[]} onSave={onSave} onClose={jest.fn()} privacyHidden/>);
 expect(screen.getByText(/Mostrá los importes de Bancos/)).toBeInTheDocument();
 expect(screen.queryByLabelText('Elegir captura para lectura local')).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Confirmar.*registro/})).not.toBeInTheDocument();
 expect(onSave).not.toHaveBeenCalled();
});
