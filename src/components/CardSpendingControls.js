import React, { useEffect, useState } from 'react';
import {
  FiAlertCircle, FiBell, FiCheckCircle, FiEye, FiFileText, FiInfo,
  FiTrendingDown, FiTrendingUp, FiZap,
} from 'react-icons/fi';
import { statementMonthExtremes, historicalPeakStatus } from '../utils/cardSpendingInsights';
import { cardBudgetProgress } from '../utils/cardBudgetProgress';

const fmt = (n, currency) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(n);
const input = 'mt-1 min-h-[44px] w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50';
const smallBtn = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-violet-300 px-3 py-2 text-sm font-bold text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-700 dark:text-violet-200';

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
          ? 'Tenés los avisos desactivados. El margen sigue mostrándose.'
          : 'El color indica qué tan cerca estás del tope; el aviso se configura por separado.'}
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
  onSave,onAskLita,onImportMarkdown,onRevealValues,canShowValues=true,
}) {
  const [draft,setDraft]=useState({});
  const [saving,setSaving]=useState('');
  const [error,setError]=useState('');
  const [settingsOpen,setSettingsOpen]=useState({});
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
    <div className='flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between'>
      <div className='min-w-0'>
        <p className='font-extrabold text-slate-900 dark:text-white'>¿Cuánto gasté y cuánto me queda?</p>
        <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
          Mostramos lo registrado en tus tarjetas. Puede faltar información hasta que revises las capturas.
        </p>
      </div>
      <button className={smallBtn+' w-full shrink-0 sm:w-auto'} type='button' onClick={onImportMarkdown}>
        <FiFileText aria-hidden='true'/> Importar captura
      </button>
    </div>
    <div className='grid gap-4 xl:grid-cols-2'>
      {!canShowValues && <div role='status'
        className='flex min-w-0 flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-slate-800 dark:border-violet-800 dark:bg-slate-900/70 dark:text-slate-200 sm:flex-row sm:items-center sm:justify-between xl:col-span-2'>
        <p>Los topes, consumos y porcentajes están ocultos. Mostrá los importes para revisar o editar tus límites.</p>
        {onRevealValues && <button type='button' onClick={onRevealValues}
          className='inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-50 dark:bg-violet-600 dark:hover:bg-violet-500 dark:focus-visible:ring-offset-slate-900'>
          <FiEye aria-hidden='true'/> Mostrar importes de Bancos
        </button>}
      </div>}
      {['ARS','USD'].map(currency=>{
        // Hide the complete financial subtree, including form values, ARIA percentages,
        // progress widths and risk-colored states; CSS masking cannot protect the DOM.
        if (!canShowValues) return <section key={currency}
          aria-label={'Control de tarjetas · '+currency}
          className='min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800'>
          <h3 className='text-base font-extrabold text-slate-900 dark:text-slate-50'>Control de tarjetas · {currency}</h3>
          <p className='rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-300'>
            Valores ocultos por privacidad
          </p>
        </section>;
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
            <h3 className='text-base font-extrabold text-slate-950 dark:text-white'>Tarjetas en {currency}</h3>
            <p className='text-xs font-semibold text-slate-600 dark:text-slate-300'>Gastado en este ciclo (registrado)</p>
            <p className='break-words text-2xl font-extrabold tabular-nums text-slate-950 dark:text-white'>
              {canShowValues?fmt(spent[currency]||0,currency):'••••'}
            </p>
            <p className='text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
              Datos parciales de capturas y compras posteriores. No es la deuda confirmada por tu banco.
            </p>
          </div>

          <BudgetMargin currency={currency} progress={progress} visible={canShowValues}
            unsaved={unsaved} disabled={data.enabled===false} />
          <details className='rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60'
            open={settingsOpen[currency] ?? !saved}
            onToggle={event=>setSettingsOpen(prev=>({...prev,[currency]:event.currentTarget.open}))}>
            <summary className='flex min-h-[44px] cursor-pointer items-center text-sm font-bold text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200'>
              {saved?'Editar tope y avisos':'Configurar tope y avisos'} · {currency}
            </summary>
            <div className='mt-3 space-y-3'>
          <label className='block text-sm font-semibold text-slate-900 dark:text-slate-100'>
            Tu tope mensual ({currency})
            <input className={input} type='number' min='0.01' step='0.01'
              aria-label={'Tope mensual '+currency}
              value={data.limit} onChange={e=>patch(currency,{limit:e.target.value})}
              placeholder='Ej.: 250000'/>
          </label>
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
            </div>
          </details>
          <details className='rounded-xl border-t border-slate-200 pt-3 dark:border-slate-700'>
            <summary className='flex min-h-[44px] cursor-pointer items-center text-sm font-bold text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200'>
              Comparar con resúmenes anteriores · {currency}
            </summary>
            <div className='mt-3 space-y-3'>
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
            </div>
          </details>
        </section>;
      })}
    </div>
    <p className='text-xs text-slate-600 dark:text-slate-300'>
      Los meses sin PDF son datos faltantes, no meses de gasto cero. Las referencias históricas
      son orientativas y pueden incluir ciclos incompletos.
    </p>
    <details className='rounded-xl border border-slate-200 p-3 dark:border-slate-700'>
      <summary className='flex min-h-[44px] cursor-pointer items-center text-sm font-bold text-violet-700 dark:text-violet-200'>Ayuda y opciones de avisos</summary>
      <div className='mt-3 flex flex-wrap gap-2'>
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
    </details>
    {error&&<p role='status' className='text-sm text-rose-700 dark:text-rose-300'>{error}</p>}
    <p className='text-xs text-slate-600 dark:text-slate-300'>
      Los avisos actuales funcionan mientras LTC$ esté abierto. Los push con la app cerrada
      necesitarán un emisor seguro y una suscripción por dispositivo.
    </p>
  </div>;
}
