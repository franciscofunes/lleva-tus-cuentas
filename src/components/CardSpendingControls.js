import React, { useEffect, useState } from 'react';
import {
  FiAlertCircle, FiBell, FiCheckCircle, FiFileText, FiInfo,
  FiTrendingDown, FiTrendingUp, FiZap,
} from 'react-icons/fi';
import { statementMonthExtremes, historicalPeakStatus } from '../utils/cardSpendingInsights';
import { cardBudgetProgress } from '../utils/cardBudgetProgress';

const fmt = (n, currency) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(n);
const input = 'mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white focus-visible:ring-2 focus-visible:ring-purple-500';
const smallBtn = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-purple-500/50 px-3 py-2 text-sm font-bold text-purple-700 dark:text-purple-300 focus-visible:ring-2 focus-visible:ring-purple-500';

const riskStyles = {
  ok: {
    surface: 'border-emerald-500/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/25 dark:text-emerald-200',
    bar: 'bg-emerald-600 dark:bg-emerald-400',
    label: 'Vas bien con tu tope',
    heading: 'Todavía podés gastar',
    icon: FiCheckCircle,
  },
  warning: {
    surface: 'border-amber-500/50 bg-amber-50 text-amber-950 dark:bg-amber-950/25 dark:text-amber-200',
    bar: 'bg-amber-500',
    label: 'Atención: te estás acercando al tope',
    heading: 'Cuidá tu margen disponible',
    icon: FiAlertCircle,
  },
  critical: {
    surface: 'border-orange-500/60 bg-orange-50 text-orange-950 dark:bg-orange-950/25 dark:text-orange-200',
    bar: 'bg-orange-500',
    label: 'Estás muy cerca de tu tope',
    heading: 'Te queda poco margen',
    icon: FiAlertCircle,
  },
  exceeded: {
    surface: 'border-rose-600/60 bg-rose-50 text-rose-950 dark:bg-rose-950/25 dark:text-rose-200',
    bar: 'bg-rose-600',
    label: 'Superaste tu tope',
    heading: 'Te pasaste del tope por',
    icon: FiAlertCircle,
  },
};

function BudgetMargin({ progress, currency, visible, disabled, unsaved }) {
  if (!progress) return (
    <div className='rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300'>
      Definí un tope mayor que cero para ver cuánto margen de gasto te queda.
    </div>
  );
  const theme = riskStyles[progress.level];
  const Icon = theme.icon;
  return (
    <div className={'space-y-3 rounded-2xl border p-4 ' + theme.surface}
      aria-label={'Margen antes del tope en ' + currency}>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <p className='flex items-center gap-2 text-sm font-bold'>
          <Icon size={17} aria-hidden='true' /> {theme.label}
        </p>
        {unsaved && <span className='rounded-full border border-current/30 px-2 py-1 text-[11px] font-semibold'>
          Vista previa · sin guardar
        </span>}
      </div>
      <div>
        <p className='text-xs font-bold tracking-wide'>{theme.heading}</p>
        <p className='mt-1 break-words text-[clamp(1.5rem,5.5vw,2.1rem)] font-extrabold leading-tight tabular-nums'
          aria-label={progress.level === 'exceeded' ? 'Monto excedido' : 'Monto disponible'}>
          {visible ? fmt(progress.level === 'exceeded' ? progress.overage : progress.remaining, currency) : '••••'}
        </p>
        <p className='mt-2 text-xs leading-relaxed'>
          {progress.level === 'exceeded'
            ? 'El consumo registrado supera el límite que definiste.'
            : <>Antes de llegar al tope de {visible ? fmt(progress.limit, currency) : '••••'}.</>}
        </p>
      </div>
      <div>
        <div className='mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold'>
          <span>Tope utilizado</span>
          <span className='tabular-nums'>{visible ? progress.percent + '%' : '••••'}</span>
        </div>
        <div role='progressbar' aria-label={'Porcentaje usado del tope ' + currency}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.barPercent)}
          className='h-2.5 overflow-hidden rounded-full bg-slate-300/70 dark:bg-slate-700'>
          <div className={'h-full rounded-full transition-all ' + theme.bar}
            style={{width: progress.barPercent + '%'}} />
        </div>
      </div>
      <p className='text-xs leading-relaxed'>
        {disabled
          ? 'Las notificaciones de este presupuesto están desactivadas; el indicador visual sigue disponible.'
          : 'Los colores son orientativos (verde 0–69%, ámbar 70–89%, naranja 90–99%, rojo 100%+). El porcentaje de aviso que guardaste se configura por separado.'}
      </p>
    </div>
  );
}

function HistoricalReference({peak,currency,visible}) {
  if (!peak) return null;
  return (
    <div className='space-y-2 rounded-2xl border border-cyan-500/35 bg-cyan-50 p-4 text-cyan-950 dark:bg-cyan-950/20 dark:text-cyan-100'
      aria-label={'Comparación con máximo histórico en ' + currency}>
      <p className='flex items-center gap-2 text-sm font-extrabold'>
        <FiInfo aria-hidden='true' /> Comparación con tu récord histórico
      </p>
      <p className='text-xs leading-relaxed'>
        Este ciclo representa {visible ? peak.percentage + '%' : '••••'} del mayor consumo
        registrado ({peak.peakMonth}: {visible ? fmt(peak.peak,currency) : '••••'}).
      </p>
      <div className='h-2 overflow-hidden rounded-full bg-cyan-200/80 dark:bg-slate-700'
        role='progressbar' aria-label={'Porcentaje del récord histórico en ' + currency}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.round(peak.ratio*100))}>
        <div className='h-full rounded-full bg-cyan-600 dark:bg-cyan-400'
          style={{width: Math.min(100,peak.ratio*100)+'%'}} />
      </div>
      <p className='text-xs text-cyan-800 dark:text-cyan-200'>
        Es una referencia basada en PDFs vinculados de todos los bancos, no un límite aconsejado.
        Los ciclos y meses pueden no coincidir o estar incompletos.
      </p>
    </div>
  );
}

export default function CardSpendingControls({
  budgets=[],statuses=[],history=[],spent={ARS:0,USD:0},
  onSave,onAskLita,onImportMarkdown,canShowValues=true,
}) {
  const [draft,setDraft]=useState({});
  const [saving,setSaving]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{
    const d={};
    budgets.forEach(b=>{
      d[b.currency]={limit:String(b.limit),warnPercent:String(b.warnPercent),enabled:b.enabled};
    });
    setDraft(d);
  },[budgets]);
  const patch=(currency,values)=>setDraft(prev=>({
    ...prev,[currency]:{...prev[currency],...values},
  }));
  const save=async(currency)=>{
    setSaving(currency);setError('');
    try{await onSave(currency,{
      ...(draft[currency]||{}),
      warnPercent:Number(draft[currency]?.warnPercent??80),
    });}
    catch(e){setError(e?.message||'No se pudo guardar el límite. Revisá tus permisos.');}
    finally{setSaving('');}
  };
  return <div className='space-y-4' aria-label='Alertas y análisis mensual de tarjetas'>
    <div className='rounded-xl border border-purple-300/40 bg-purple-50/50 p-4 text-sm dark:bg-purple-900/10'>
      <p className='font-bold'>Controlá tus consumos antes del cierre</p>
      <p className='mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
        Sumamos las capturas del consumo actual de cada tarjeta más las compras posteriores.
        Sin duplicar movimientos ni sumar resúmenes PDF históricos al ciclo actual.
      </p>
    </div>
    <div className='grid gap-4 xl:grid-cols-2'>
      {['ARS','USD'].map(currency=>{
        const data=draft[currency]||{limit:'',warnPercent:'80',enabled:true};
        const saved=budgets.find(b=>b.currency===currency);
        const status=statuses.find(s=>s.currency===currency);
        const historyStats=statementMonthExtremes(history,currency);
        const peak=historicalPeakStatus(spent,history,currency);
        const progress=cardBudgetProgress(spent[currency],data.limit);
        const unsaved=!!progress && (!saved ||
          Number(saved.limit)!==progress.limit ||
          Number(saved.warnPercent)!==Number(data.warnPercent) ||
          saved.enabled!==(data.enabled!==false));
        return <section key={currency}
          className='min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40'>
          <div className='space-y-2'>
            <h3 className='text-base font-extrabold text-slate-950 dark:text-white'>Control de tarjetas · {currency}</h3>
            <p className='text-xs font-semibold text-slate-600 dark:text-slate-300'>Consumos registrados del ciclo actual</p>
            <p className='break-words text-2xl font-extrabold tabular-nums text-slate-950 dark:text-white'>
              {canShowValues?fmt(spent[currency]||0,currency):'••••'}
            </p>
            <p className='text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
              {spent.snapshotCardCount||0} total(es) por moneda de capturas y compras manuales posteriores.
              Registro parcial: no es deuda ni saldo bancario verificado.
            </p>
          </div>

          <label className='block text-sm font-semibold text-slate-900 dark:text-slate-100'>
            Tu tope mensual ({currency})
            <input className={input} type='number' min='0.01' step='0.01'
              aria-label={'Tope mensual '+currency}
              value={data.limit} onChange={e=>patch(currency,{limit:e.target.value})}
              placeholder='Ej.: 250000'/>
          </label>
          <BudgetMargin currency={currency} progress={progress} visible={canShowValues}
            unsaved={unsaved} disabled={data.enabled===false} />

          <label className='block text-sm font-semibold text-slate-900 dark:text-slate-100'>
            Notificarme al llegar al
            <select className={input} aria-label={'Aviso previo '+currency}
              value={data.warnPercent} onChange={e=>patch(currency,{warnPercent:e.target.value})}>
              {[50,60,70,75,80,85,90,95].map(n=><option key={n} value={n}>{n}% del tope</option>)}
            </select>
          </label>
          <label className='flex min-h-[42px] items-center gap-2 text-sm'>
            <input type='checkbox' checked={data.enabled!==false}
              onChange={e=>patch(currency,{enabled:e.target.checked})}/> Alertas activas
          </label>
          {status&&status.level!=='ok'&&<p className='text-xs font-semibold text-slate-600 dark:text-slate-300'>
            <FiBell className='mr-1 inline' aria-hidden='true'/>
            {status.level==='exceeded'?'Superaste el tope guardado.':'Se alcanzó el aviso configurado sobre el tope guardado.'}
          </p>}
          <button type='button' onClick={()=>save(currency)} disabled={!!saving}
            className='min-h-[44px] w-full rounded-xl bg-purple-600 px-3 text-sm font-bold text-white focus-visible:ring-4 focus-visible:ring-purple-400/40 disabled:opacity-50'>
            {saving===currency?'Guardando…':'Guardar tope '+currency}
          </button>

          <HistoricalReference peak={peak} currency={currency} visible={canShowValues}/>
          <div className='space-y-2 border-t border-slate-200 pt-4 text-xs dark:border-slate-700'>
            <p className='flex items-center gap-2 text-sm font-extrabold'>
              <FiFileText aria-hidden='true'/> Historial · Resúmenes de todos los bancos ({currency})
            </p>
            {historyStats.high?<div className='space-y-2'>
              <p className='flex flex-wrap items-center gap-2'>
                <FiTrendingUp className='text-cyan-600 dark:text-cyan-400' aria-hidden='true'/>
                Máximo: <strong>{historyStats.high.month} · {canShowValues?fmt(historyStats.high.total,currency):'••••'}</strong>
              </p>
              <p className='flex flex-wrap items-center gap-2'>
                <FiTrendingDown className='text-cyan-600 dark:text-cyan-400' aria-hidden='true'/>
                Mínimo: <strong>{historyStats.low.month} · {canShowValues?fmt(historyStats.low.total,currency):'••••'}</strong>
              </p>
              <div className='rounded-xl bg-slate-50 p-3 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300'>
                <p className='font-bold'>Referencia sugerida</p>
                <p className='mt-1'>90% del promedio de hasta seis meses con PDF:
                  {' '}<strong>{canShowValues?fmt(historyStats.suggestedLimit,currency):'••••'}</strong>
                </p>
                <p className='mt-1'>No se guarda automáticamente ni representa capacidad de pago.</p>
                <button type='button' className={smallBtn+' mt-3'}
                  onClick={()=>patch(currency,{limit:String(historyStats.suggestedLimit)})}>
                  Usar referencia
                </button>
              </div>
            </div>:<p className='text-slate-600 dark:text-slate-300'>
              Todavía no hay resúmenes PDF vinculados para comparar meses.
            </p>}
          </div>
        </section>;
      })}
    </div>
    <p className='text-xs text-slate-600 dark:text-slate-300'>
      Los meses sin PDF son datos faltantes, no meses de gasto cero. Las referencias históricas
      son orientativas y pueden incluir ciclos incompletos.
    </p>
    <div className='flex flex-wrap gap-2'>
      <button className={smallBtn} type='button' onClick={onImportMarkdown}>
        <FiFileText aria-hidden='true'/> Importar consumos desde capturas
      </button>
      <button className={smallBtn} type='button' onClick={onAskLita}>
        <FiZap aria-hidden='true'/> Pedirle a Lita que me ayude a definir el tope
      </button>
      <button className={smallBtn} type='button' onClick={async()=>{
        if(typeof window==='undefined'||!('Notification' in window)){
          setError('Este navegador no permite avisos nativos. Los avisos dentro de LTC$ siguen disponibles.');return;
        }
        try{const perm=await window.Notification.requestPermission();
          setError(perm==='granted'
            ?'Avisos del navegador habilitados mientras LTC$ esté abierto.'
            :'No se autorizaron avisos nativos; la campanita de LTC$ sigue disponible.');
        }catch{setError('No se pudo solicitar el permiso de notificaciones.');}
      }}>
        <FiBell aria-hidden='true'/> Activar avisos del navegador
      </button>
    </div>
    {error&&<p role='status' className='text-sm text-rose-700 dark:text-rose-300'>{error}</p>}
    <p className='text-xs text-slate-600 dark:text-slate-300'>
      Los avisos actuales funcionan mientras LTC$ esté abierto. Los push con la app cerrada
      necesitarán un emisor seguro y una suscripción por dispositivo.
    </p>
  </div>;
}
