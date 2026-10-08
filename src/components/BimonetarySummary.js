import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronDown, FiHelpCircle, FiTrendingUp, FiDollarSign, FiBriefcase } from 'react-icons/fi';
import { subscribePortfolioPositions } from '../services/portfolioService';
import { summarizeBimonetaryFlows, sumPortfolioCurrencies } from '../utils/bimonetarySummary';
import UsdExchangePopover from './UsdExchangePopover';

const moneyFormat = {
  ARS: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }),
};
const defaultExpanded = { ars: false, usd: false, portfolio: false };
const muted = 'text-slate-600 dark:text-slate-300';
const signedColor = (number) => number > 0 ? 'text-emerald-700 dark:text-emerald-400'
  : number < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-slate-200';

function MoneyRow({ label, amount, currency, hide, tone }) {
  const color = tone === 'income' ? 'text-emerald-700 dark:text-emerald-400'
    : tone === 'expense' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100';
  return (
    <div className='flex flex-wrap items-start justify-between gap-x-3 gap-y-1'>
      <dt className={muted}>{label}</dt>
      <dd className={'break-words font-semibold tabular-nums ' + color}>
        {hide ? '••••••' : moneyFormat[currency].format(amount)}
      </dd>
    </div>
  );
}

function SummaryCard({ id, title, eyebrow, value, color, caption, Icon, expanded, onToggle, children }) {
  const contentId = 'bimonetary-' + id + '-details';
  return (
    <section aria-label={title}
      className='min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900/60'>
      <button type='button' aria-expanded={expanded} aria-controls={contentId} onClick={onToggle}
        className='flex min-h-[100px] w-full items-start gap-3 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500 sm:p-5'>
        <span aria-hidden='true' className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-purple-700 dark:bg-slate-800 dark:text-purple-300'>
          <Icon size={18} />
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300'>{eyebrow}</span>
          <span className='mt-0.5 block text-sm font-bold text-slate-900 dark:text-white'>{title}</span>
          <span className={'mt-1 block break-words text-[clamp(1.25rem,5vw,1.65rem)] font-extrabold leading-tight tracking-tight tabular-nums ' + color}>{value}</span>
          <span className='mt-1 block text-xs text-slate-500 dark:text-slate-400'>{caption}</span>
        </span>
        <FiChevronDown size={18} aria-hidden='true'
          className={'mt-1 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-300 ' + (expanded ? 'rotate-180' : '')} />
      </button>
      {expanded && (
        <div id={contentId} className='border-t border-slate-200 px-4 pb-4 pt-3 dark:border-slate-700 sm:px-5 sm:pb-5'>
          {children}
        </div>
      )}
    </section>
  );
}

/** Period flows and current Portfolio holdings must never be added together. */
export default function BimonetarySummary({ docs, categories, userId, hideValues, isLoading }) {
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioStatus, setPortfolioStatus] = useState('loading');
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loadedFor, setLoadedFor] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    setPortfolio([]);
    setPortfolioStatus(userId ? 'loading' : 'unavailable');
    if (!userId) return undefined;
    return subscribePortfolioPositions(userId,
      (rows) => { setPortfolio(rows); setPortfolioStatus('ready'); },
      () => setPortfolioStatus('error')
    );
  }, [userId]);

  useEffect(() => {
    // Store only disclosure preferences, scoped by Firebase UID; never financial values.
    setLoadedFor(null);
    let saved = defaultExpanded;
    if (userId) {
      try {
        const value = JSON.parse(localStorage.getItem('ltc:bimonetary:expanded:' + userId) || '{}');
        saved = {
          ars: value.ars === true,
          usd: value.usd === true,
          portfolio: value.portfolio === true,
        };
      } catch {
        // Blocked or corrupt storage must not stop the summary working.
      }
    }
    setExpanded(saved);
    setShowExplanation(false);
    setLoadedFor(userId || null);
  }, [userId]);

  useEffect(() => {
    if (!userId || loadedFor !== userId) return;
    try {
      localStorage.setItem('ltc:bimonetary:expanded:' + userId, JSON.stringify(expanded));
    } catch {
      // In-memory state remains functional.
    }
  }, [userId, loadedFor, expanded]);

  const flows = useMemo(() => summarizeBimonetaryFlows(docs || [], categories || []), [docs, categories]);
  const holdings = useMemo(() => sumPortfolioCurrencies(portfolio), [portfolio]);
  const money = (amount, currency) => hideValues ? '••••••' : moneyFormat[currency].format(amount);
  const toggle = (name) => setExpanded((current) => ({ ...current, [name]: !current[name] }));
  const missingCount = flows.unexplainedArsCount + flows.missingUsdCount;

  if (isLoading) return <p role='status' className={'text-sm ' + muted}>Cargando movimientos del período…</p>;

  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-1 gap-3'>
        <SummaryCard id='ars' title='Flujo de pesos argentinos' eyebrow='ARS · Este período'
          value={money(flows.knownArsNet, 'ARS')} color={signedColor(flows.knownArsNet)}
          caption='Entradas y salidas en pesos' Icon={FiDollarSign}
          expanded={expanded.ars} onToggle={() => toggle('ars')}>
          <dl className='space-y-2.5 text-sm'>
            <MoneyRow label='Ingresos ARS' amount={flows.earnedArs} currency='ARS' hide={hideValues} tone='income' />
            <MoneyRow label='Gastos ARS' amount={flows.spentArs} currency='ARS' hide={hideValues} tone='expense' />
            <div className='space-y-2.5 border-t border-slate-200 pt-3 dark:border-slate-700'>
              <p className='text-xs font-semibold text-slate-500 dark:text-slate-400'>Conversiones, no sueldos ni consumos</p>
              <MoneyRow label='Venta USD → ARS' amount={flows.fromUsdSalesArs} currency='ARS' hide={hideValues} />
              <MoneyRow label='Compra USD ← ARS' amount={flows.spentOnUsdPurchasesArs} currency='ARS' hide={hideValues} />
            </div>
          </dl>
          <p className={'mt-3 text-xs leading-5 ' + muted}>Flujo neto ARS, no pérdida patrimonial ni saldo bancario.</p>
        </SummaryCard>

        <SummaryCard id='usd' title='Movimiento de dólares' eyebrow='USD · Este período'
          value={money(flows.knownUsdMovement, 'USD')} color={signedColor(flows.knownUsdMovement)}
          caption='Ingresados + comprados − vendidos' Icon={FiTrendingUp}
          expanded={expanded.usd} onToggle={() => toggle('usd')}>
          <dl className='space-y-2.5 text-sm'>
            <MoneyRow label='Ingresos USD' amount={flows.earnedUsd} currency='USD' hide={hideValues} tone='income' />
            <MoneyRow label='Dólares comprados' amount={flows.purchasedUsd} currency='USD' hide={hideValues} />
            <MoneyRow label='Dólares vendidos' amount={flows.soldUsd} currency='USD' hide={hideValues} />
          </dl>
          <p className={'mt-3 text-xs leading-5 ' + muted}>Flujo del período, no ganancias ni saldo de inversiones.</p>
        </SummaryCard>

        <SummaryCard id='portfolio' title='Patrimonio en Portfolio' eyebrow='Posiciones actuales · USD'
          value={portfolioStatus === 'ready' ? money(holdings.USD, 'USD') : portfolioStatus === 'loading' ? 'Cargando…' : 'No disponible'}
          color='text-purple-700 dark:text-purple-300' caption='Saldos registrados, no flujo del mes'
          Icon={FiBriefcase} expanded={expanded.portfolio} onToggle={() => toggle('portfolio')}>
          {portfolioStatus === 'loading' && <p role='status' className={'text-sm ' + muted}>Cargando posiciones…</p>}
          {portfolioStatus === 'error' && <p role='alert' className='text-sm text-amber-700 dark:text-amber-300'>No se pudieron consultar los saldos. Revisalos en Portfolio.</p>}
          {portfolioStatus === 'ready' && (
            <>
              <dl className='space-y-2.5 text-sm'>
                <MoneyRow label='Portfolio ARS' amount={holdings.ARS} currency='ARS' hide={hideValues} />
                <MoneyRow label='Portfolio USD' amount={holdings.USD} currency='USD' hide={hideValues} />
              </dl>
              {holdings.positions === 0 && <p className={'mt-2 text-xs ' + muted}>No hay saldos válidos registrados.</p>}
              <div className='mt-4'>
                <UsdExchangePopover usdBalance={holdings.USD} arsBalance={holdings.ARS} showValues={!hideValues} />
              </div>
            </>
          )}
          <Link to='/portfolio'
            className='mt-3 inline-flex min-h-[40px] items-center rounded-lg border border-purple-400 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-purple-300 dark:hover:bg-slate-800'>
            Ver Portfolio →
          </Link>
        </SummaryCard>
      </div>

      {missingCount > 0 && (
        <p role='status' className='text-xs font-medium text-amber-700 dark:text-amber-300'>
          {missingCount} movimientos con importes incompletos. Revisá el detalle antes de interpretar los totales.
        </p>
      )}

      <div className='text-xs'>
        <button type='button' onClick={() => setShowExplanation((current) => !current)}
          aria-expanded={showExplanation} aria-controls='bimonetary-help'
          className='inline-flex min-h-[36px] items-center gap-2 font-semibold text-slate-600 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-slate-300'>
          <FiHelpCircle aria-hidden='true' /> ¿Qué significa este resumen?
          <FiChevronDown aria-hidden='true' className={showExplanation ? 'rotate-180' : ''} />
        </button>
        {showExplanation && (
          <p id='bimonetary-help' className={'mt-2 rounded-lg border border-slate-200 bg-white p-3 leading-5 dark:border-slate-700 dark:bg-slate-900 ' + muted}>
            Un flujo ARS negativo no significa necesariamente pérdida: puede reflejar compras de USD u otras transferencias.
            El movimiento neto USD tampoco es rentabilidad. Portfolio muestra posiciones actuales, no movimientos del período.
            Ninguna cifra se convierte sin elegir explícitamente una cotización.
          </p>
        )}
      </div>
    </div>
  );
}
