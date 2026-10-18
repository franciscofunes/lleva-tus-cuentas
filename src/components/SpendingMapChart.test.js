import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SpendingMapChart from './SpendingMapChart';

const categories=[{name:'Comida',isExpense:true},{name:'Salario',isExpense:false},{name:'Resumen tarjeta',isExpense:true}];
const located=[
 {id:'a',category:'Comida',expenseName:'Panadería',selectedDate:'2026-10-12',amount:120,location:{label:'Panadería',source:'search',latitude:-34.60,longitude:-58.40}},
 {id:'b',category:'Comida',expenseName:'Café',selectedDate:'2026-10-13',amount:80,location:{label:'Café',source:'device',latitude:-34.601,longitude:-58.401}},
 {id:'c',category:'Comida',expenseName:'Super',selectedDate:'2026-10-15',amount:400,transactionCurrency:'USD',location:{label:'Super',source:'search',latitude:-34.61,longitude:-58.41}},
 {id:'d',category:'Comida',expenseName:'Lugar manual',selectedDate:'2026-10-16',amount:500,location:{label:'Barrio',source:'manual'}},
 {id:'e',category:'Salario',expenseName:'Sueldo',amount:1000,location:{label:'Oficina',source:'device',latitude:-34.6,longitude:-58.4}},
 {id:'f',category:'Resumen tarjeta',expenseName:'Visa',amount:9000,location:{label:'Banco',source:'device',latitude:-34.6,longitude:-58.4}}
];

test('shows private map loading action and honest mapped coverage for individual ARS expenses',()=>{
 const {container}=render(<SpendingMapChart chartData={located} categories={categories}/>);
 expect(screen.getByText(/2 de 3/)).toBeInTheDocument();
 expect(container.querySelectorAll('img[src*="tile.openstreetmap.org"]')).toHaveLength(0);
 expect(screen.getByRole('button',{name:'Zonas H3'})).toHaveAttribute('aria-pressed','true');
 expect(screen.getByRole('button',{name:'Movimientos'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Mostrar mapa mundial'}));
 expect(container.querySelectorAll('img[src*="tile.openstreetmap.org"]').length).toBeGreaterThan(0);
 expect(screen.getAllByRole('button',{name:/Acercar zona/}).length).toBeGreaterThan(0);
});

test('changes between zoom-based zones, density layer and individual spending pins',()=>{
 const {container}=render(<SpendingMapChart chartData={located} categories={categories}/>);
 fireEvent.click(screen.getByRole('button',{name:'Mostrar mapa mundial'}));
 fireEvent.click(screen.getByRole('button',{name:'Concentración'}));
 expect(screen.getByRole('button',{name:'Concentración'})).toHaveAttribute('aria-pressed','true');
 expect(container.querySelectorAll('polygon[points]').length).toBeGreaterThan(0);
 fireEvent.click(screen.getByRole('button',{name:'Importe'}));
 expect(screen.getByRole('button',{name:'Importe'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:'Movimientos'}));
 expect(screen.getByRole('button',{name:'Movimientos'})).toHaveAttribute('aria-pressed','true');
 const pins=screen.getAllByRole('button',{name:/Ver \d+ movimiento/});
 expect(pins.length).toBe(2);
 fireEvent.click(pins[0]);
 expect(screen.getByText(/movimiento\(s\) en ubicación aproximada/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Cerrar detalle del mapa'}));
 expect(screen.queryByRole('button',{name:'Cerrar detalle del mapa'})).not.toBeInTheDocument();
});

test('currency is a dedicated switch, never aggregates ARS and USD in one map',()=>{
 render(<SpendingMapChart chartData={located} categories={categories}/>);
 const cur=screen.getByRole('group',{name:'Moneda del mapa'});
 fireEvent.click(within(cur).getByRole('button',{name:'USD'}));
 expect(screen.getByText(/1 de 1/)).toBeInTheDocument();
 fireEvent.click(within(cur).getByRole('button',{name:'ARS'}));
 expect(screen.getByText(/2 de 3/)).toBeInTheDocument();
});

test('renders consistent empty state and does not fetch tiles when no location exists',()=>{
 const {container}=render(<SpendingMapChart chartData={located.filter(row=>row.id==='d')} categories={categories}/>);
 expect(screen.getByRole('status')).toHaveTextContent(/No hay gastos con coordenadas/);
 expect(screen.queryByRole('button',{name:'Mostrar mapa mundial'})).not.toBeInTheDocument();
 expect(container.querySelectorAll('img')).toHaveLength(0);
});

test('global map supports US income, world zoom, west/east movement and separate financial flows',()=>{
 const income={id:'us-income',category:'Salario',transactionCurrency:'USD',amount:2500,
  expenseName:'Cliente USA',selectedDate:'2026-10-18',
  location:{source:'search',label:'New York',latitude:40.712,longitude:-74.006}};
 const {container}=render(<SpendingMapChart chartData={[...located,income]} categories={categories}/>);
 fireEvent.click(screen.getByRole('button',{name:'Ingresos'}));
 const usd=screen.getByRole('group',{name:'Moneda del mapa'});
 fireEvent.click(within(usd).getByRole('button',{name:'USD'}));
 expect(screen.getByText(/1 de 1/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Mostrar mapa mundial'}));
 fireEvent.click(screen.getByRole('button',{name:'Ver mundo completo'}));
 expect(screen.getByText(/Zoom 0/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Mover mapa al oeste'}));
 fireEvent.click(screen.getByRole('button',{name:'Mover mapa al este'}));
 fireEvent.click(screen.getByRole('button',{name:'Acercar mapa'}));
 expect(screen.getByText(/Zoom 1/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Ajustar todas las ubicaciones'}));
 fireEvent.click(screen.getByRole('button',{name:'Ambos'}));
 expect(screen.getByRole('button',{name:'Importe'})).toBeDisabled();
 expect(container.querySelectorAll('img[src*="tile.openstreetmap.org"]').length).toBeGreaterThan(0);
});
test('global map supports pointer navigation without requiring geolocation permission',()=>{
 const {container}=render(<SpendingMapChart chartData={located} categories={categories}/>);
 fireEvent.click(screen.getByRole('button',{name:'Mostrar mapa mundial'}));
 const map=container.querySelector('[aria-label^="Mapa mundial interactivo"]');
 expect(map).toBeInTheDocument();
 fireEvent.pointerDown(map,{pointerId:1,clientX:100,clientY:120,button:0});
 fireEvent.pointerMove(map,{pointerId:1,clientX:160,clientY:120});
 fireEvent.pointerUp(map,{pointerId:1,clientX:160,clientY:120});
 expect(screen.getByRole('button',{name:'Ver mundo completo'})).toBeInTheDocument();
});
