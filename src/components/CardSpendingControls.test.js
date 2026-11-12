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
test('peak includes a breakdown of verified purchases, not total payable balances',()=>{
 const checked=[{month:'2026-10',currency:'ARS',total:650000,statementCount:1,
   entries:[{expenseId:'verified',institution:'Banco QA',card:'Visa',
     closingDate:'2026-10-24',purchases:650000,statementTotal:950000}]}];
 view({history:checked});
 const ars=screen.getByText('Tarjetas en ARS').closest('section');
 fireEvent.click(within(ars).getByText('Comparar con resúmenes anteriores · ARS'));
 fireEvent.click(within(ars).getByText('Ver origen del máximo · 1 resumen(es)'));
 expect(within(ars).getByText('Compras incluidas:',{exact:false})).toHaveTextContent('650.000,00');
 expect(within(ars).getByText('Total a pagar del PDF (no sumado):',{exact:false}))
   .toHaveTextContent('950.000,00');
});
test('changing a draft does not save it and previews exact exceeded amount in rose',async()=>{
  const onSave=jest.fn().mockResolvedValue(undefined);
  view({onSave});
  fireEvent.click(screen.getByText('Editar tope y avisos · ARS'));
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
test('missing or invalid limit has no false available money',()=>{
  view({budgets:[]});
  expect(screen.getAllByText(/Definí un tope mayor que cero/)).toHaveLength(2);
  expect(screen.queryByText(/75.066,07/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Comparación con máximo histórico en ARS')).toBeInTheDocument();
});
test('privacy hides budget inputs, progress geometry, ARIA percentages, and spending-risk labels',()=>{
  const onRevealValues=jest.fn();
  const {container}=view({canShowValues:false,onRevealValues,
    statuses:[{currency:'ARS',level:'exceeded'}]});
  expect(screen.getAllByText('Valores ocultos por privacidad')).toHaveLength(2);
  expect(screen.getByRole('status')).toHaveTextContent('topes, consumos y porcentajes están ocultos');
  expect(screen.queryByLabelText('Tope mensual ARS')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Aviso previo USD')).not.toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  expect(screen.queryByText(/Te queda poco margen/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Superaste el tope/)).not.toBeInTheDocument();
  expect(screen.queryByText(/1.367.794/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Comparación con máximo histórico en ARS')).not.toBeInTheDocument();
  expect(container.querySelector('[aria-valuenow]')).toBeNull();
  expect(container.querySelector('[style*="width"]')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Mostrar importes de Bancos'}));
  expect(onRevealValues).toHaveBeenCalledTimes(1);
});
test('hiding and revealing amounts preserves unsaved draft limits without writing',()=>{
  const onSave=jest.fn();
  const common={budgets,history,spent,statuses:[],onSave,onAskLita:jest.fn(),onImportMarkdown:jest.fn()};
  const {rerender}=render(<CardSpendingControls {...common} canShowValues/>);
  fireEvent.click(screen.getByText('Editar tope y avisos · ARS'));
  fireEvent.change(screen.getByLabelText('Tope mensual ARS'),{target:{value:'1250000'}});
  expect(screen.getByLabelText('Tope mensual ARS')).toHaveValue(1250000);
  rerender(<CardSpendingControls {...common} canShowValues={false}/>);
  expect(screen.queryByLabelText('Tope mensual ARS')).not.toBeInTheDocument();
  rerender(<CardSpendingControls {...common} canShowValues/>);
  expect(screen.getByLabelText('Tope mensual ARS')).toHaveValue(1250000);
  expect(onSave).not.toHaveBeenCalled();
});
test('imports and Lita buttons invoke existing authorized flows',()=>{
  const onAskLita=jest.fn(),onImportMarkdown=jest.fn();
  view({onAskLita,onImportMarkdown});
  fireEvent.click(screen.getByRole('button',{name:/Importar captura/}));
  fireEvent.click(screen.getByText('Ayuda y opciones de avisos'));
  fireEvent.click(screen.getByRole('button',{name:/Pedirle a Lita/}));
  expect(onAskLita).toHaveBeenCalledTimes(1);
  expect(onImportMarkdown).toHaveBeenCalledTimes(1);
});

test('current registered spending and remaining amount lead the ARS panel',()=>{
  view();
  const card=screen.getByText('Tarjetas en ARS').closest('section');
  expect(card).toHaveTextContent('Gastado en este ciclo');
  expect(card).toHaveTextContent('75.066,07');
  expect(within(card).getByText('Editar tope y avisos · ARS').closest('details')).not.toHaveAttribute('open');
  expect(within(card).getByText('Comparar con resúmenes anteriores · ARS').closest('details')).not.toHaveAttribute('open');
});

test('applying a historical reference automatically reveals the unsaved budget editor',()=>{
 view();
 const ars=screen.getByText('Tarjetas en ARS').closest('section');
 fireEvent.click(within(ars).getByText('Comparar con resúmenes anteriores · ARS'));
 fireEvent.click(within(ars).getByRole('button',{name:'Usar referencia'}));
 expect(within(ars).getByText('Editar tope y avisos · ARS').closest('details')).toHaveAttribute('open');
 expect(Number(within(ars).getByLabelText('Tope mensual ARS').value)).toBeGreaterThan(0);
});
