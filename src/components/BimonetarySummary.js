import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribePortfolioPositions } from '../services/portfolioService';
import { summarizeBimonetaryFlows, sumPortfolioCurrencies } from '../utils/bimonetarySummary';
import UsdExchangePopover from './UsdExchangePopover';

const formatter = {
  ARS: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }),
};
const tile = 'min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-900/60';
const row = 'flex flex-wrap items-start justify-between gap-x-3 gap-y-1';
const muted = 'text-slate-600 dark:text-slate-300';

function MoneyRow({ label, amount, currency, hide, emphasis = false }) {
  return (
    <div className={row}>
      <dt className={muted}>{label}</dt>
      <dd className={'break-words font-bold tabular-nums ' + (emphasis ? 'text-slate-900 dark:text-white' : '')}>
        {hide ? '••••••' : formatter[currency].format(amount)}
      </dd>
    </div>
  );
}

/**
 * Transaction flow is a PERIOD movement; Portfolio positions are current
 * holdings. Never silently mix the two or sum ARS with USD.
 */
export default function BimonetarySummary({ docs, categories, userId, hideValues, isLoading }) {
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioStatus, setPortfolioStatus] = useState('loading');

  useEffect(() => {
    setPortfolio([]);
    setPortfolioStatus(userId ? 'loading' : 'unavailable');
    if (!userId) return undefined;
    return subscribePortfolioPositions(userId,
      (positions) => { setPortfolio(positions); setPortfolioStatus('ready'); },
      () => setPortfolioStatus('error')
    );
  }, [userId]);

  const flows = useMemo(
    () => summarizeBimonetaryFlows(docs || [], categories || []),
    [docs, categories]
  );
  const holdings = useMemo(() => sumPortfolioCurrencies(portfolio), [portfolio]);
  const money = (amount, currency) => hideValues ? '••••••' : formatter[currency].format(amount);

  if (isLoading) return <p role='status' className={'text-sm ' + muted}>Cargando movimientos del período…</p>;

  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <section className={tile} aria-label='Flujo de pesos argentinos'>
          <p className='text-xs font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300'>Pesos argentinos · ARS</p>
          <h3 className='mt-2 text-sm font-bold text-slate-900 dark:text-white'>Ingresos y gastos del período</h3>
          <dl className='mt-3 space-y-3 text-sm'>
            <MoneyRow label='Ingresos ARS' amount={flows.earnedArs} currency='ARS' hide={hideValues} />
            <MoneyRow label='Gastos ARS' amount={flows.spentArs} currency='ARS' hide={hideValues} />
            <div className='space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700'>
              <p className='text-xs font-semibold text-slate-500 dark:text-slate-400'>Conversiones entre monedas (no sueldos ni consumo)</p>
              <MoneyRow label='Venta USD → ARS' amount={flows.fromUsdSalesArs} currency='ARS' hide={hideValues} />
              <MoneyRow label='Compra USD ← ARS' amount={flows.spentOnUsdPurchasesArs} currency='ARS' hide={hideValues} />
            </div>
            <div className='border-t border-slate-200 pt-3 dark:border-slate-700'>
              <dt className={'text-xs font-bold uppercase tracking-wide ' + muted}>Flujo neto ARS</dt>
              <dd className='mt-1 break-words text-lg font-extrabold tabular-nums text-slate-900 dark:text-white'>
                {money(flows.knownArsNet, 'ARS')}
              </dd>
            </div>
          </dl>
        </section>
        <section className={tile} aria-label='Flujo de dólares estadounidenses'>
          <p className='text-xs font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300'>Dólares · USD</p>
          <h3 className='mt-2 text-sm font-bold text-slate-900 dark:text-white'>Movimientos del período</h3>
          <dl className='mt-3 space-y-3 text-sm'>
            <MoneyRow label='Ingresos USD' amount={flows.earnedUsd} currency='USD' hide={hideValues} />
            <MoneyRow label='Dólares comprados' amount={flows.purchasedUsd} currency='USD' hide={hideValues} />
            <MoneyRow label='Dólares vendidos' amount={flows.soldUsd} currency='USD' hide={hideValues} />
            <div className='border-t border-slate-200 pt-3 dark:border-slate-700'>
              <dt className={'text-xs font-bold uppercase tracking-wide ' + muted}>Movimiento neto USD</dt>
              <dd className='mt-1 break-words text-lg font-extrabold tabular-nums text-slate-900 dark:text-white'>
                {money(flows.knownUsdMovement, 'USD')}
              </dd>
            </div>
          </dl>
          <p className='mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400'>
            Flujo de dólares ingresados, comprados y vendidos. No es el saldo de tus inversiones.
          </p>
        </section>
      </div>

      <section className='rounded-2xl border border-purple-200 bg-purple-50/60 p-4 dark:border-purple-500/30 dark:bg-slate-900/70'
        aria-label='Saldos actuales de Portfolio'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h3 className='font-extrabold text-slate-900 dark:text-white'>Patrimonio en Portfolio</h3>
            <p className={'text-xs ' + muted}>Saldos actuales, no movimientos del mes.</p>
          </div>
          <Link to='/portfolio'
            className='inline-flex min-h-[44px] items-center rounded-xl border border-purple-500 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-purple-300 dark:hover:bg-slate-800'>
            Ver Portfolio →
          </Link>
        </div>
        {portfolioStatus === 'loading' && <p role='status' className={'mt-3 text-xs ' + muted}>Cargando posiciones…</p>}
        {portfolioStatus === 'error' && (
          <p role='alert' className='mt-3 text-xs text-amber-700 dark:text-amber-300'>
            No se pudieron consultar los saldos. Revisalos en Portfolio.
          </p>
        )}
        {portfolioStatus === 'ready' && (
          <>
            <dl className='mt-4 grid grid-cols-2 gap-3'>
              <div className='min-w-0'>
                <dt className={'text-xs ' + muted}>Portfolio ARS</dt>
                <dd className='mt-1 break-words text-base font-extrabold tabular-nums text-slate-900 dark:text-white'>
                  {money(holdings.ARS, 'ARS')}
                </dd>
              </div>
              <div className='min-w-0'>
                <dt className={'text-xs ' + muted}>Portfolio USD</dt>
                <dd className='mt-1 break-words text-base font-extrabold tabular-nums text-slate-900 dark:text-white'>
                  {money(holdings.USD, 'USD')}
                </dd>
              </div>
            </dl>
            {holdings.positions === 0 && <p className={'mt-3 text-xs ' + muted}>No hay saldos válidos registrados.</p>}
            <div className='mt-3'>
              <UsdExchangePopover usdBalance={holdings.USD} showValues={!hideValues} />
            </div>
          </>
        )}
        <p className={'mt-3 text-xs leading-5 ' + muted}>
          Portfolio es una foto de tus posiciones. No sumamos flujos del período a estos saldos ni convertimos monedas automáticamente.
        </p>
      </section>

      {(flows.unexplainedArsCount > 0 || flows.missingUsdCount > 0) && (
        <p role='status' className='text-xs text-amber-700 dark:text-amber-300'>
          Hay movimientos con importes incompletos; revisá sus datos antes de interpretar los subtotales.
        </p>
      )}
      <p className={'text-xs leading-5 ' + muted}>
        Un flujo ARS negativo no significa necesariamente pérdida: puede reflejar ahorro en USD u otras transferencias. Tampoco equivale al saldo de tu cuenta bancaria.
      </p>
    </div>
  );
}
