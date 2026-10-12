import React from 'react';
import { summarizeAccountActivity } from '../utils/portfolioAccountActivity';

const amount = (value, currency) =>
  new Intl.NumberFormat('es-AR', { style:'currency', currency: currency || 'ARS' })
    .format(Number(value || 0));

const Metric = ({ label, value, note, accent = '' }) => (
  <div className='min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70'>
    <p className='text-xs font-semibold text-slate-600 dark:text-slate-300'>{label}</p>
    <p className={`mt-1 break-words text-lg font-bold tabular-nums sm:text-xl ${accent || 'text-slate-900 dark:text-slate-50'}`}>{value}</p>
    {note && <p className='mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300'>{note}</p>}
  </div>
);

/** User-recorded evidence only: never represent withdrawals as losses. */
export default function PortfolioAccountOverview({ position, snapshots }) {
  const activity = summarizeAccountActivity(position, snapshots);
  const currency = position.currency || 'ARS';
  return (
    <div className='mt-4 min-w-0 space-y-4' data-testid='remunerated-account-overview'>
      <div className='rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70'>
        <p className='text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-200'>{position.institution}</p>
        <p className='mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50'>{position.name}</p>
        <p className='mt-4 text-sm font-medium text-slate-600 dark:text-slate-300'>Saldo disponible registrado</p>
        <p className='mt-1 break-words text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-50'>
          {amount(position.balance,currency)}
        </p>
        <p className='mt-2 text-xs text-slate-600 dark:text-slate-300'>
          Tasa anual cargada: <strong>{Number(position.annualRate || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}% TNA</strong>
          {' · '}La tasa no es una ganancia acumulada.
        </p>
      </div>
      <div className='grid min-w-0 grid-cols-2 gap-3'>
        <Metric label='Rendimientos registrados' value={amount(activity.userTaggedEarnings,currency)}
          accent='text-emerald-700 dark:text-emerald-400'
          note={`${activity.earningCount} verificación(es) clasificadas como interés; no auditadas.`} />
        <Metric label='Interés diario estimado'
          value={activity.dailyEstimate === null ? 'No disponible' : amount(activity.dailyEstimate,currency)}
          note='Proyección con el saldo y TNA actuales. No es rendimiento confirmado.' />
        <Metric label='Retiros de capital' value={amount(activity.withdrawals,currency)}
          note='Dinero retirado de esta posición; no es una pérdida.' />
        <Metric label='Aportes de capital' value={amount(activity.deposits,currency)}
          note='Ingreso de fondos; no es rendimiento.' />
      </div>
      {activity.needsReview && (
        <div role='status' className='rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/30'>
          <p className='font-semibold text-amber-900 dark:text-amber-200'>Historial pendiente de conciliación</p>
          {activity.negativeLegacyEarnings && (
            <p className='mt-1 text-amber-900 dark:text-amber-200'>
              El acumulado histórico cargado es {amount(activity.reportedEarnings,currency)}.
              Puede incluir retiros antiguos: no demuestra una pérdida financiera.
            </p>
          )}
          {activity.earningsMismatch && !activity.negativeLegacyEarnings && (
            <p className='mt-1 text-amber-900 dark:text-amber-200'>
              El acumulado histórico no coincide con los rendimientos clasificados en las verificaciones disponibles.
            </p>
          )}
          {activity.unclassifiedCount > 0 && (
            <p className='mt-1 text-amber-900 dark:text-amber-200'>
              {activity.unclassifiedCount} movimiento(s) sin clasificar requieren revisión.
            </p>
          )}
          <p className='mt-1 text-xs text-amber-900 dark:text-amber-200'>
            No modificamos ni corregimos automáticamente registros anteriores.
          </p>
        </div>
      )}
      <p className='text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
        Las verificaciones reflejan datos cargados por vos. Las transferencias cambian el saldo de esta cuenta,
        no necesariamente tu patrimonio ni la tasa remunerada.
      </p>
    </div>
  );
}
