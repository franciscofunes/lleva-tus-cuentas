import { getTransactionCurrency } from './customCategories';
import { hasTransactionCoordinates } from './transactionLocation';

export const isIndividualExpense = (item,categories) => (
  (categories||[]).some(c=>c?.name===item?.category && c.isExpense===true) &&
  !/(?:compra|venta|ingreso) divisas|resumen tarjeta/i.test(item?.category||'') &&
  Number.isFinite(Number(item?.amount)) && Number(item.amount)>=0
);
export const expensesForInsight = (rows,categories,currency) =>
  (rows||[]).filter(row=>isIndividualExpense(row,categories) && getTransactionCurrency(row)===currency);
export function weekdayInsight(rows,categories,currency) {
  const days=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(name=>({name,total:0,count:0}));
  expensesForInsight(rows,categories,currency).forEach(item=>{
    const d=String(item.selectedDate||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return;
    const date=new Date(d+'T12:00:00Z');
    if(Number.isNaN(date.valueOf())||date.toISOString().slice(0,10)!==d)return;
    const day=days[date.getUTCDay()];day.total+=Number(item.amount);day.count++;
  });
  return days;
}
export function merchantInsight(rows,categories,currency) {
  const groups=new Map();
  expensesForInsight(rows,categories,currency).forEach(item=>{
    const name=String(item.expenseName||'').trim()||'Sin nombre';
    const key=name.toLocaleLowerCase('es-AR');
    const group=groups.get(key)||{name,total:0,count:0};
    group.total+=Number(item.amount);group.count++;groups.set(key,group);
  });
  return [...groups.values()].sort((a,b)=>b.total-a.total).slice(0,10);
}
export const geoInsight=(rows,categories,currency) =>
 expensesForInsight(rows,categories,currency).filter(item=>hasTransactionCoordinates(item.location));
