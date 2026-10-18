import {geoEligibleRecords,geoLocatedRecords} from './geoTransactionInsights';
const categories=[{name:'Honorarios',isExpense:false},{name:'Comida',isExpense:true},
 {name:'Resumen tarjeta',isExpense:true},{name:'Venta divisas',isExpense:true}];
const rows=[
 {id:'us',category:'Honorarios',transactionCurrency:'USD',amount:1200,expenseName:'Cliente',location:{source:'search',label:'New York',latitude:40.712,longitude:-74.006}},
 {id:'ar',category:'Comida',amount:500,location:{source:'device',label:'Buenos Aires',latitude:-34.6,longitude:-58.4}},
 {id:'manual',category:'Honorarios',transactionCurrency:'USD',amount:100,location:{source:'manual',label:'Estados Unidos'}},
 {id:'statement',category:'Resumen tarjeta',amount:10000,location:{source:'device',latitude:-34.6,longitude:-58.4}},
 {id:'fx',category:'Venta divisas',amount:9000,location:{source:'device',latitude:-34.6,longitude:-58.4}},
];
test('US-source income requires a selected place; currency and payer are not geolocation',()=>{
 expect(geoEligibleRecords(rows,categories,'USD','income').map(r=>r.id)).toEqual(['us','manual']);
 expect(geoLocatedRecords(rows,categories,'USD','income').map(r=>r.id)).toEqual(['us']);
});
test('flow selector separates incomes, expenses, and currency without double-counting card statements',()=>{
 expect(geoLocatedRecords(rows,categories,'ARS','all').map(r=>r.id)).toEqual(['ar']);
 expect(geoLocatedRecords(rows,categories,'USD','all').map(r=>r.id)).toEqual(['us']);
 expect(geoEligibleRecords(rows,categories,'ARS','income')).toHaveLength(0);
});
