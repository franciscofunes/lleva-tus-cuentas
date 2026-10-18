import { getTransactionCurrency } from './customCategories';
import { hasTransactionCoordinates } from './transactionLocation';

// "Ingresos" are user-tagged income transactions, NOT assumed to originate
// from the country of their employer, the payer or the USD currency.
const excludedCategory = /(?:compra|venta|ingreso)\s+(?:de\s+)?divisas|resumen\s+(?:de\s+)?tarjeta/i;
export const geoEligibleRecords=(rows,categories,currency,flow='expense')=>(rows||[]).filter(row=>{
  if(getTransactionCurrency(row)!==currency || !Number.isFinite(Number(row.amount)) || Number(row.amount)<0)return false;
  const category=(categories||[]).find(c=>c?.name===row.category);
  if(!category || excludedCategory.test(row.category||''))return false;
  return flow==='all' || (flow==='income'?!category.isExpense:category.isExpense===true);
}).map(row=>({...row,_geoKind:(categories||[]).find(c=>c.name===row.category)?.isExpense?'expense':'income'}));

export const geoLocatedRecords=(rows,categories,currency,flow)=>
  geoEligibleRecords(rows,categories,currency,flow).filter(row=>hasTransactionCoordinates(row.location));
