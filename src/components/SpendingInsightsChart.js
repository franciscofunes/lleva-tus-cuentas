import React,{useState} from 'react';
import {weekdayInsight,merchantInsight} from '../utils/spendingInsights';

const format=(n,cur)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:cur,maximumFractionDigits:0}).format(n);
export default function SpendingInsightsChart({chartData,categories,kind='weekday'}) {
  const [currency,setCurrency]=useState('ARS');
  const rows=kind==='merchant'?merchantInsight(chartData,categories,currency):weekdayInsight(chartData,categories,currency);
  const max=Math.max(1,...rows.map(item=>item.total));
  const hasData=rows.some(item=>item.count);
  return <section className='space-y-4' aria-label={kind==='merchant'?'Comercios frecuentes':'Gastos por día de semana'}>
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <div><h3 className='text-sm font-extrabold'>{kind==='merchant'?'Comercios con más gastos':'Gastos por día de semana'}</h3>
        <p className='text-xs text-slate-600 dark:text-slate-300'>Transacciones individuales del período seleccionado</p></div>
      <div role='group' aria-label='Moneda de gastos' className='flex gap-1'>{['ARS','USD'].map(cur=>
        <button type='button' key={cur} aria-pressed={cur===currency} onClick={()=>setCurrency(cur)}
          className={'min-h-[40px] rounded-lg border px-3 text-xs font-bold '+(cur===currency?'border-purple-600 bg-purple-600 text-white':'border-slate-300 dark:border-slate-600')}>{cur}</button>)}</div>
    </div>
    {!hasData?<p role='status' className='rounded-xl border border-dashed border-slate-300 p-4 text-sm dark:border-slate-600'>Todavía no hay gastos individuales de esta moneda en el período.</p>:
      <div className='space-y-3'>{rows.map(row=><div key={row.name} className='grid grid-cols-[57px_minmax(0,1fr)_minmax(83px,auto)] items-center gap-2 text-xs sm:grid-cols-[155px_minmax(0,1fr)_minmax(105px,auto)]'>
        <span className='truncate font-semibold' title={row.name}>{row.name}</span>
        <div className='h-5 overflow-hidden rounded-md bg-slate-200 dark:bg-slate-700'><div className='h-full rounded-md bg-purple-600' style={{width:(row.total/max*100)+'%'}} /></div>
        <span className='text-right font-bold tabular-nums' title={row.count+' movimiento(s)'}>{format(row.total,currency)}</span>
      </div>)}</div>}
    <p className='text-xs text-slate-600 dark:text-slate-300'>{kind==='merchant'?'Agrupado por nombre del movimiento, no por identidad comercial verificada.':'Agrupado por fecha del movimiento.'} Sin cotización implícita ni consumos desglosados de resúmenes PDF.</p>
  </section>;
}
