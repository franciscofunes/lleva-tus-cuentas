import React from 'react';
import '@testing-library/jest-dom';
import {fireEvent,render,screen,within} from '@testing-library/react';
import SpendingInsightsChart from './SpendingInsightsChart';
import CategoryBreakdownChart from './CategoryBreakdownChart';

const categories=[{name:'Comida',isExpense:true},{name:'Resumen tarjeta',isExpense:true}];
const data=[
 {id:'one',category:'Comida',amount:800,expenseName:'Panadería',selectedDate:'2026-10-17'},
 {id:'usd',category:'Comida',amount:10,expenseName:'Café',selectedDate:'2026-10-17',transactionCurrency:'USD'},
 {id:'statement',category:'Resumen tarjeta',amount:2000,expenseName:'Visa',selectedDate:'2026-10-17'}
];
test('legacy and new charts share card surface, title hierarchy and styled tracks',()=>{
 const {container}=render(<>
  <CategoryBreakdownChart data={[{name:'Comida',value:800}]} title='Gastos en pesos' />
  <SpendingInsightsChart kind='merchant' chartData={data} categories={categories} />
 </>);
 expect(container.querySelectorAll('.ltc-chart-surface')).toHaveLength(2);
 expect(screen.getByRole('heading',{name:'Gastos en pesos'})).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'Comercios frecuentes'})).toBeInTheDocument();
 expect(screen.getAllByText('Comida').length).toBeGreaterThan(0);
 expect(screen.getByText('Panadería')).toBeInTheDocument();
});
test('the insights currency control uses the same shared buttons as the map',()=>{
 render(<SpendingInsightsChart kind='weekday' chartData={data} categories={categories}/>);
 const group=screen.getByRole('group',{name:'Moneda del gráfico'});
 expect(within(group).getByRole('button',{name:'ARS'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(within(group).getByRole('button',{name:'USD'}));
 expect(within(group).getByRole('button',{name:'USD'})).toHaveAttribute('aria-pressed','true');
 expect(screen.getByText(/10,00/)).toBeInTheDocument();
});
