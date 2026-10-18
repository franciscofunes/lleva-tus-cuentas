import React, { useState } from 'react';
import { weekdayInsight, merchantInsight } from '../utils/spendingInsights';
import TransactionChartSurface, { ChartCurrencySwitch, TransactionChartEmpty, ChartMoney } from './TransactionChartSurface';

const tone='bg-rose-500 dark:bg-rose-400';
const track='bg-rose-100 dark:bg-rose-500/15';

export default function SpendingInsightsChart({chartData,categories,kind='weekday'}) {
  const [currency,setCurrency]=useState('ARS');
  const rows=kind==='merchant'?merchantInsight(chartData,categories,currency):weekdayInsight(chartData,categories,currency);
  const max=Math.max(1,...rows.map(item=>item.total));
  const hasData=rows.some(row=>row.count>0);
  const title=kind==='merchant'?'Comercios frecuentes':'Gastos por día de la semana';
  const footer=kind==='merchant'
    ? 'Agrupado por el nombre registrado, no por un comercio verificado. Excluye resúmenes globales y cambios de divisas.'
    : 'Agrupado por fecha de operación. Excluye resúmenes globales y cambios de divisas.';

  return <TransactionChartSurface title={title}
    description={'Distribución de gastos · '+currency+' · Período seleccionado'}
    actions={<ChartCurrencySwitch currency={currency} onChange={setCurrency}/>}
    footer={footer}>
    {!hasData ? <TransactionChartEmpty>No hay gastos individuales de esta moneda en el período.</TransactionChartEmpty> :
      <ol className='min-w-0 space-y-4'>
        {rows.map(item=><li key={item.name} className='min-w-0'>
          <div className='flex min-w-0 flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3'>
            <span className='min-w-0 break-words font-semibold text-slate-800 dark:text-slate-100'>{item.name}</span>
            <ChartMoney value={item.total} currency={currency}/>
          </div>
          <div className={'mt-2 h-2.5 overflow-hidden rounded-full '+track} aria-hidden='true'>
            <div className={'h-full rounded-full '+tone} style={{width:Math.max(0,Math.min(100,item.total/max*100))+'%'}}/>
          </div>
          <p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>{item.count} {item.count===1?'movimiento':'movimientos'}</p>
        </li>)}
      </ol>}
  </TransactionChartSurface>;
}
