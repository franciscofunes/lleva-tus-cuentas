import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CardSpendingControls from './CardSpendingControls';

const budgets=[
  {currency:'ARS',limit:1367794.13,warnPercent:80,enabled:true},
  {currency:'USD',limit:33.08,warnPercent:80,enabled:true},
];
const history=[
  {month:'2026-10',currency:'ARS',total:1785390.07,statementCount:2},
  {month:'2026-08',currency:'ARS',total:1302313.17,statementCount:2},
];
const spent={ARS:1292728.06,USD:20,snapshotCardCount:3,month:'2026-10'};
const view=props=>render(<CardSpendingControls
  budgets={budgets} history={history} spent={spent} statuses={[]}
  onSave={jest.fn().mockResolvedValue(undefined)} onAskLita={jest.fn()}
  onImportMarkdown={jest.fn()} {...props}
/>);

test('exact remaining is visually critical orange, historical comparison stays cyan',()=>{
  view();
  const panel=screen.getByLabelText('Margen antes del tope en ARS');
  expect(panel).toHaveClass('border-orange-500/60');
  expect(within(panel).getByText(/75.066,07/)).toBeInTheDocument();
  expect(within(panel).getByText(/Te queda poco margen/)).toBeInTheDocument();
  const record=screen.getByLabelText('Comparación con máximo histórico en ARS');
  expect(record).toHaveClass('border-cyan-500/35');
  expect(within(record).getByText(/1.785.390,07/)).toBeInTheDocument();
  expect(screen.getByLabelText('Margen antes del tope en USD')).toHaveClass('border-emerald-500/40');
});
test('changing a draft does not save it and previews exact exceeded amount in rose',async()=>{
  const onSave=jest.fn().mockResolvedValue(undefined);
  view({onSave});
  fireEvent.change(screen.getByLabelText('Tope mensual ARS'),{target:{value:'1250000'}});
  const card=screen.getByLabelText('Margen antes del tope en ARS');
  expect(card).toHaveClass('border-rose-600/60');
  expect(within(card).getByText(/42.728,06/)).toBeInTheDocument();
  expect(within(card).getByText(/Vista previa · sin guardar/)).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Guardar tope ARS'}));
  await waitFor(()=>expect(onSave).toHaveBeenCalledWith('ARS',
    expect.objectContaining({limit:'1250000',warnPercent:80})));
});
test('missing or invalid limit has no false available money; hide values respects privacy',()=>{
  view({budgets:[],canShowValues:false});
  expect(screen.getAllByText(/Definí un tope mayor que cero/)).toHaveLength(2);
  expect(screen.queryByText(/75.066,07/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Comparación con máximo histórico en ARS')).toBeInTheDocument();
});
test('imports and Lita buttons invoke existing authorized flows',()=>{
  const onAskLita=jest.fn(),onImportMarkdown=jest.fn();
  view({onAskLita,onImportMarkdown});
  fireEvent.click(screen.getByRole('button',{name:/Importar consumos desde capturas/}));
  fireEvent.click(screen.getByRole('button',{name:/Pedirle a Lita/}));
  expect(onAskLita).toHaveBeenCalledTimes(1);
  expect(onImportMarkdown).toHaveBeenCalledTimes(1);
});
