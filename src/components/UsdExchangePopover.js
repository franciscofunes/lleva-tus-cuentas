import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiArrowRight, FiCheck, FiExternalLink, FiInfo, FiRefreshCw, FiX } from 'react-icons/fi';
import { fetchUsdQuotes } from '../services/usdQuotesService';

const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
});
const usdFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});
const formatArs = (number) => arsFormatter.format(number);
const formatUsd = (number) => usdFormatter.format(number);
const DAYS_STALE_MS = 36 * 60 * 60 * 1000;

function QuoteDialog({ onClose, usdBalance, arsBalance, showValues }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const [quotes, setQuotes] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState('bolsa');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchUsdQuotes()
      .then((data) => {
        if (!active) return;
        setQuotes(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
        setError('No se pudieron cargar las cotizaciones. Comprobá la conexión e intentá de nuevo.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((item) => item.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const refresh = () => {
    setStatus('loading');
    setError('');
    fetchUsdQuotes(true)
      .then((data) => {
        setQuotes(data);
        setStatus('ready');
      })
      .catch(() => {
        setStatus('error');
        setError('No se pudo actualizar. No mostramos valores no verificados.');
      });
  };

  const chosen = quotes.find((quote) => quote.key === selectedMarket) || quotes[0];
  const updatedAt = chosen && new Date(chosen.updatedAt);
  const stale = updatedAt && Date.now() - updatedAt.getTime() > DAYS_STALE_MS;
  const dollars = Number(usdBalance);
  const pesos = Number(arsBalance);
  const hasUsd = Number.isFinite(dollars) && dollars > 0;
  const hasArs = Number.isFinite(pesos) && pesos >= 0;
  const estimate = hasUsd && chosen ? dollars * chosen.compra : null;
  const total = estimate !== null && hasArs ? estimate + pesos : null;

  return createPortal(
    <div
      className='fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/75 sm:items-center sm:p-5'
      data-testid='fx-dialog-backdrop'
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        ref={dialogRef}
        id='usd-exchange-dialog'
        role='dialog'
        aria-modal='true'
        aria-labelledby='usd-exchange-title'
        aria-describedby='usd-exchange-intro'
        className='flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:max-h-[90dvh] sm:rounded-3xl'
      >
        <div className='flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700 sm:p-5'>
          <div className='min-w-0'>
            <p className='text-xs font-extrabold uppercase tracking-wide text-purple-700 dark:text-purple-300'>Cotizaciones USD / ARS</p>
            <h2 id='usd-exchange-title' className='mt-1 text-xl font-extrabold'>¿Cuántos pesos recibirías?</h2>
            <p id='usd-exchange-intro' className='mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300'>
              Estimación al vender tus dólares, usando el precio de <strong>compra</strong> del mercado elegido.
            </p>
          </div>
          <button ref={closeRef} type='button' onClick={onClose} aria-label='Cerrar cotizaciones'
            className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'>
            <FiX size={20} aria-hidden='true' />
          </button>
        </div>

        <div className='min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5'>
          {status === 'loading' && (
            <div role='status' className='rounded-xl bg-slate-100 p-5 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
              Consultando cotizaciones actualizadas…
            </div>
          )}
          {status === 'error' && (
            <div role='alert' className='rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200'>
              <p>{error}</p>
              <button type='button' onClick={refresh}
                className='mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-purple-600 px-4 font-bold text-white hover:bg-purple-700'>
                <FiRefreshCw size={15} aria-hidden='true' /> Reintentar
              </button>
            </div>
          )}
          {status === 'ready' && chosen && (
            <div className='space-y-4'>
              <fieldset>
                <legend className='mb-2 text-sm font-bold text-slate-800 dark:text-slate-100'>Elegí una cotización</legend>
                <div className='grid grid-cols-2 gap-2'>
                  {quotes.map((quote) => {
                    const active = quote.key === chosen.key;
                    return (
                      <button key={quote.key} type='button'
                        aria-pressed={active}
                        onClick={() => setSelectedMarket(quote.key)}
                        className={'min-w-0 rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ' +
                          (active
                            ? 'border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-400 dark:bg-purple-900/30 dark:text-purple-100'
                            : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-purple-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100')}
                      >
                        <span className='flex items-center justify-between gap-1 text-xs font-bold'>
                          <span>{quote.label}</span>
                          {active && <FiCheck aria-hidden='true' className='shrink-0' />}
                        </span>
                        <span className='mt-2 block break-words text-sm font-extrabold tabular-nums'>{formatArs(quote.compra)}</span>
                        <span className='mt-1 block text-[11px] text-slate-600 dark:text-slate-300'>por USD · compra</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className='grid grid-cols-2 gap-3 rounded-xl bg-slate-100 p-3 dark:bg-slate-800'>
                <div>
                  <p className='text-xs text-slate-600 dark:text-slate-300'>Compra · vendés USD</p>
                  <p className='mt-1 break-words text-sm font-bold tabular-nums'>{formatArs(chosen.compra)}</p>
                </div>
                <div>
                  <p className='text-xs text-slate-600 dark:text-slate-300'>Venta · comprás USD</p>
                  <p className='mt-1 break-words text-sm font-bold tabular-nums'>{formatArs(chosen.venta)}</p>
                </div>
              </div>

              <div className='rounded-2xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-500/30 dark:bg-purple-950/30'>
                <p className='text-xs font-semibold text-slate-700 dark:text-slate-200'>Tu Portfolio USD, estimado en ARS</p>
                {showValues && estimate !== null ? (
                  <>
                    <p className='mt-1 break-words text-2xl font-extrabold tabular-nums text-purple-800 dark:text-purple-200'>
                      {formatArs(estimate)}
                    </p>
                    <p className='mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300'>
                      {formatUsd(dollars)} <FiArrowRight aria-hidden='true' /> {formatArs(estimate)}
                    </p>
                  </>
                ) : (
                  <p className='mt-2 text-sm text-slate-700 dark:text-slate-300'>
                    {showValues ? 'No hay saldo USD positivo para estimar.' : 'Importes ocultos por tu configuración de privacidad.'}
                  </p>
                )}
              </div>

              {showValues && total !== null && (
                <div className='rounded-xl border border-slate-200 p-3 dark:border-slate-700'>
                  <p className='text-xs text-slate-600 dark:text-slate-300'>Portfolio expresado en ARS (estimado)</p>
                  <p className='mt-1 break-words text-lg font-bold tabular-nums'>{formatArs(total)}</p>
                  <p className='mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400'>
                    Posiciones ARS + posiciones USD convertidas, sin sumar movimientos mensuales ni deudas.
                  </p>
                </div>
              )}

              <div className='text-xs leading-5 text-slate-600 dark:text-slate-300'>
                Actualizada: <time dateTime={chosen.updatedAt}>{updatedAt.toLocaleString('es-AR')}</time>
                {stale && <p className='mt-1 font-semibold text-amber-700 dark:text-amber-300'>Cotización antigua: verificá antes de operar.</p>}
              </div>
            </div>
          )}
          <div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-700'>
            <a href='https://dolarapi.com/docs/argentina/operations/get-dolares' target='_blank' rel='noreferrer noopener'
              className='inline-flex min-h-[36px] items-center gap-1.5 text-xs font-bold text-purple-700 underline dark:text-purple-300'>
              DolarAPI · Fuente <FiExternalLink aria-hidden='true' />
            </a>
            {status === 'ready' && (
              <button type='button' onClick={refresh}
                className='inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800'>
                <FiRefreshCw aria-hidden='true' /> Actualizar
              </button>
            )}
          </div>
          <p className='mt-3 text-[11px] leading-5 text-slate-500 dark:text-slate-400'>
            Referencia informativa, no precio garantizado. No incluye comisiones ni impuestos; el MEP efectivo puede diferir.
            Este cálculo no altera tus saldos, ganancias ni transacciones.
          </p>
        </div>
      </section>
    </div>,
    document.body
  );
}

export default function UsdExchangePopover({ usdBalance, arsBalance = 0, showValues = true }) {
  const [open, setOpen] = useState(false);
  const close = React.useCallback(() => setOpen(false), []);

  return (
    <>
      <button type='button' onClick={() => setOpen(true)} aria-expanded={open}
        aria-label='Ver cotizaciones del dólar para estimar pesos' aria-haspopup='dialog' aria-controls='usd-exchange-dialog'
        className='inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-600 dark:text-purple-300 dark:hover:bg-slate-700'>
        <FiInfo aria-hidden='true' /> Cotizaciones USD/ARS
      </button>
      {open && (
        <QuoteDialog onClose={close} usdBalance={usdBalance} arsBalance={arsBalance} showValues={showValues} />
      )}
    </>
  );
}
