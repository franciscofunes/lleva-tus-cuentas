import React, {useEffect,useState} from 'react';
import { FiBell, FiTrendingDown, FiTrendingUp, FiZap } from 'react-icons/fi';
import { statementMonthExtremes, historicalPeakStatus } from '../utils/cardSpendingInsights';
const fmt=(n,c)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:c,maximumFractionDigits:2}).format(n);
const input='min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white';
const smallBtn='inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-purple-500/50 px-3 text-sm font-bold text-purple-700 dark:text-purple-300';

export default function CardSpendingControls({budgets=[],statuses=[],history=[],spent,
  onSave,onAskLita,onImportMarkdown,canShowValues=true}) {
  const [draft,setDraft]=useState({});
  const [saving,setSaving]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{
    const d={};
    budgets.forEach(b=>{d[b.currency]={limit:String(b.limit),warnPercent:String(b.warnPercent),enabled:b.enabled};});
    setDraft(d);
  },[budgets]);
  const patch=(currency,values)=>setDraft(prev=>({...prev,[currency]:{...prev[currency],...values}}));
  const save=async(currency)=>{
    setSaving(currency);setError('');
    try{await onSave(currency,{...(draft[currency]||{}),warnPercent:Number(draft[currency]?.warnPercent??80)});}
    catch(e){setError(e?.message||'No se pudo guardar el límite. Revisá tus permisos.');}
    finally{setSaving('');}
  };
  return <div className='space-y-4' aria-label='Alertas y análisis mensual de tarjetas'>
    <div className='rounded-xl border border-purple-300/40 bg-purple-50/50 p-3 text-sm dark:bg-purple-900/10'>
      <p className='font-bold'>Controlá tus consumos antes del cierre</p>
      <p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>El control combina la última foto del consumo actual de cada tarjeta (captura del home banking) con compras manuales posteriores a esa foto. Nunca suma dos veces una compra ni agrega resúmenes PDF históricos.</p>
    </div>
    <div className='grid gap-3 md:grid-cols-2'>
      {['ARS','USD'].map(currency=>{
        const data=draft[currency]||{limit:'',warnPercent:'80',enabled:true};
        const status=statuses.find(s=>s.currency===currency);
        const historyStats=statementMonthExtremes(history,currency);
        const peak=historicalPeakStatus(spent,history,currency);
        return <section key={currency} className='space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/40'>
          <h3 className='text-sm font-extrabold'>Presupuesto mensual · {currency}</h3>
          <p className='text-sm'>Consumos registrados del ciclo actual: <strong className='tabular-nums'>{canShowValues?fmt(spent[currency],currency):'••••'}</strong></p>
          <p className='text-xs text-slate-600 dark:text-slate-300'>{spent.snapshotCardCount||0} total(es) de capturas de tarjetas y compras manuales posteriores. Es un seguimiento parcial, no el saldo oficial.</p>
          {peak&&<div role='status' className={'space-y-2 rounded-xl border p-3 text-xs '+
            (peak.level==='exceeded'?'border-rose-500/60 bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-200':
            peak.level==='critical'||peak.level==='warning'?'border-amber-500/60 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200':
            'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50')}>
            <p className='font-extrabold'>{peak.level==='exceeded'?'Estás igualando o superando tu máximo histórico':
              peak.level==='critical'?'Ojo: estás muy cerca de tu máximo histórico':
              peak.level==='warning'?'Atención: te estás acercando a tu máximo histórico':'Distancia al máximo histórico'}</p>
            <p>Este ciclo: {canShowValues?fmt(peak.spent,currency):'••••'} · Récord {peak.peakMonth}: {canShowValues?fmt(peak.peak,currency):'••••'} ({peak.percentage}%)</p>
            <div className='h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700'>
              <div className={'h-full rounded-full '+(peak.level==='exceeded'?'bg-rose-600':'bg-amber-500')} style={{width:Math.min(100,peak.percentage)+'%'}}/>
            </div>
            <p>Los períodos de los bancos pueden diferir y podrían faltar resúmenes o compras. Usalo como advertencia, no como deuda verificada.</p>
          </div>}
          <label className='block text-xs font-semibold'>Tope mensual ({currency})
            <input className={'mt-1 '+input} type='number' min='0.01' step='0.01' aria-label={'Tope mensual '+currency}
              value={data.limit} onChange={e=>patch(currency,{limit:e.target.value})} placeholder='Ej.: 250000'/>
          </label>
          <label className='block text-xs font-semibold'>Avisar al llegar al
            <select className={'mt-1 '+input} aria-label={'Aviso previo '+currency}
              value={data.warnPercent} onChange={e=>patch(currency,{warnPercent:e.target.value})}>
              {[50,60,70,75,80,85,90,95].map(p=><option key={p} value={p}>{p}% del tope</option>)}
            </select>
          </label>
          <label className='flex items-center gap-2 text-sm'>
            <input type='checkbox' checked={data.enabled!==false} onChange={e=>patch(currency,{enabled:e.target.checked})}/> Alertas activas
          </label>
          {status&&<div role='status' className={'rounded-xl border px-3 py-2 text-xs '+(status.level==='exceeded'
            ?'border-rose-500/40 bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-200'
            :status.level==='warning'?'border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200'
            :'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800')}>
            <p className='font-bold'>{status.level==='exceeded'?'Tope alcanzado o superado':status.level==='warning'?'Te acercás al tope':'Dentro de tu presupuesto'} · {status.percentage}%</p>
            <div className='mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700'>
              <div className={'h-full rounded-full '+(status.level==='exceeded'?'bg-rose-600':'bg-purple-600')} style={{width:Math.min(status.percentage,100)+'%'}}/>
            </div>
          </div>}
          <button type='button' onClick={()=>save(currency)} disabled={!!saving} className='min-h-[42px] w-full rounded-xl bg-purple-600 px-3 text-sm font-bold text-white disabled:opacity-50'>{saving===currency?'Guardando…':'Guardar tope '+currency}</button>
          <div className='border-t border-slate-200 pt-3 text-xs dark:border-slate-700'>
            <p className='font-bold'>Resúmenes de todos los bancos · {currency}</p>
            {historyStats.high?<div className='mt-2 space-y-1'>
              <p className='flex gap-2'><FiTrendingUp className='mt-0.5 text-rose-500'/> Mayor consumo: <strong>{historyStats.high.month} · {canShowValues?fmt(historyStats.high.total,currency):'••••'}</strong></p>
              <p className='flex gap-2'><FiTrendingDown className='mt-0.5 text-emerald-500'/> Menor consumo: <strong>{historyStats.low.month} · {canShowValues?fmt(historyStats.low.total,currency):'••••'}</strong></p>
              <p className='mt-2'>Referencia opcional: 90% del promedio de hasta 6 meses con PDF ({canShowValues?fmt(historyStats.suggestedLimit,currency):'••••'}). No es un tope obligatorio.</p>
              <button type='button' className={smallBtn} onClick={()=>patch(currency,{limit:String(historyStats.suggestedLimit)})}>Usar referencia</button>
            </div>:<p className='mt-2 text-slate-600 dark:text-slate-300'>Todavía no hay resúmenes PDF vinculados para calcular un máximo histórico confiable.</p>}
          </div>
        </section>;
      })}
    </div>
    <p className='text-xs text-slate-600 dark:text-slate-300'>Comparación basada en meses con resúmenes vinculados. Los meses sin PDF no se consideran meses de gasto cero. Los PDF contienen montos auditados por vos, no por LTC$.</p>
    <div className='flex flex-wrap gap-2'>
      <button className={smallBtn} type='button' onClick={onImportMarkdown}><FiBell/> Importar consumos desde capturas</button>
      <button className={smallBtn} type='button' onClick={onAskLita}><FiZap/> Pedirle a Lita que me ayude a definir el tope</button>
      <button className={smallBtn} type='button' onClick={async()=>{
        if(!('Notification' in window)){setError('Este navegador no permite notificaciones nativas. Los avisos en LTC$ siguen disponibles.');return;}
        try{const perm=await window.Notification.requestPermission();
          if(perm!=='granted')setError('El navegador no autorizó notificaciones. Seguirás viendo avisos en LTC$.');
          else setError('Notificaciones activadas mientras LTC$ esté abierto.');
        }catch{setError('No se pudo pedir permiso de notificaciones.');}
      }}><FiBell/> Activar aviso del navegador</button>
    </div>
    {error&&<p role='alert' className='text-sm text-rose-700 dark:text-rose-300'>{error}</p>}
    <p className='text-xs text-slate-600 dark:text-slate-300'>Los avisos del navegador funcionan mientras LTC$ esté abierto; no son push con la aplicación cerrada. Lita recibe agregados mensuales, nunca tu CBU ni números de tarjeta.</p>
  </div>;
}
