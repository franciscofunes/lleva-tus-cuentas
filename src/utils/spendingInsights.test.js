import {weekdayInsight,merchantInsight,geoInsight} from './spendingInsights';
const categories=[{name:'Alimentos',isExpense:true},{name:'Resumen tarjeta',isExpense:true},{name:'Venta divisas',isExpense:true},{name:'Salario',isExpense:false}];
const records=[
 {id:'a',category:'Alimentos',expenseName:'Kiosco',amount:120,selectedDate:'2026-10-16',location:{source:'device',latitude:-34.6,longitude:-58.4}},
 {id:'b',category:'Alimentos',expenseName:'Kiosco',amount:80,selectedDate:'2026-10-16'},
 {id:'c',category:'Resumen tarjeta',expenseName:'Visa',amount:3000,selectedDate:'2026-10-16'},
 {id:'d',category:'Venta divisas',expenseName:'FX',amount:1500,selectedDate:'2026-10-16'},
 {id:'e',category:'Salario',expenseName:'Salario',amount:4000,selectedDate:'2026-10-16'},
 {id:'f',category:'Alimentos',expenseName:'Kiosco',amount:10,transactionCurrency:'USD',selectedDate:'2026-10-17'}
];
test('insights exclude card summaries, FX and income while separating currencies',()=>{
 expect(weekdayInsight(records,categories,'ARS')[5]).toMatchObject({total:200,count:2});
 expect(weekdayInsight(records,categories,'USD')[6].total).toBe(10);
 expect(merchantInsight(records,categories,'ARS')).toEqual([{name:'Kiosco',total:200,count:2}]);
});
test('map includes only located individual expenses',()=>{
 expect(geoInsight(records,categories,'ARS').map(row=>row.id)).toEqual(['a']);
});
