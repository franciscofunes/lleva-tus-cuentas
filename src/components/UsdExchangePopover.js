import React, { useEffect, useState } from 'react';
import { FiInfo, FiRefreshCw, FiX, FiExternalLink } from 'react-icons/fi';
import { fetchUsdQuotes } from '../services/usdQuotesService';

const ars = (amount) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
}).format(amount);

export default function UsdExchangePopover({ usdBalance, showValues = true }) {
  const [open, setOpen] = useState(false);
  const [rates, setRates] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState('bolsa');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let mounted = true;
    setStatus('loading');
    fetchUsdQuotes().then((data) => {
      if (!mounted) return;
      setRates(data);
      setStatus('ready');
      setError('');
    }).catch(() => {
      if (!mounted) return;
      setStatus('error');
      setError('No se pudieron consultar las cotizaciones. Volvé a intentar.');
    });
    return () => { mounted = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const refresh = () => {
    setStatus('loading');
    fetchUsdQuotes(true).then((data) => {
      setRates(data);
      setStatus('ready');
      setError('');
    }).catch(() => {
      setStatus('error');
      setError('La actualización no está disponible. No se mostrarán cotizaciones inventadas.');
    });
  };
  const chosen = rates.find((r) => r.key === selectedMarket) || rates[0];
  const date = chosen && new Date(chosen.updatedAt);
  const isStale = date && (Date.now() - date.getTime()) > 36 * 3600_000;
  const amount = Number(usdBalance);
  const canEstimate = showValues && Number.isFinite(amount) && amount > 0 && chosen;

  return (
    <div className='relative'>
      <button type='button' onClick={() => setOpen((value) => !value)} aria-expanded={open}
        aria-label='Ver cotizaciones del dólar para estimar pesos' aria-controls='usd-exchange-popover'
        className='inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-600 dark:text-purple-300 dark:hover:bg-slate-700'>
        <FiInfo aria-hidden='true' /> Cotizaciones USD/ARS
      </button>
      {open && (
        <div id='usd-exchange-popover' role='region' aria-label='Referencia de cotizaciones del dólar'
          className='absolute left-0 right-auto top-full z-30 mt-2 w-[min(80vw,330px)] max-w-[calc(100vw-56px)] rounded-2xl border border-slate-300 bg-white p-4 text-left text-slate-900 shadow-2xl dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <h3 className='text-sm font-extrabold'>Si vendés tus dólares</h3>
              <p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>Usamos la cotización de <strong>compra</strong> del mercado elegido: pesos que te pagarían por cada USD.</p>
            </div>
            <button type='button' onClick={() => setOpen(false)} aria-label='Cerrar cotizaciones'
              className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'>
              <FiX aria-hidden='true' />
            </button>
          </div>
          {status === 'loading' && <p role='status' className='mt-4 text-sm'>Consultando cotizaciones…</p>}
          {status === 'error' && <p role='alert' className='mt-3 text-sm text-amber-700 dark:text-amber-300'>{error}</p>}
          {status === 'ready' && chosen && (
            <div className='mt-4 space-y-3'>
              <div>
                <label htmlFor='usd-exchange-market' className='block text-xs font-bold text-slate-700 dark:text-slate-200'>Mercado de referencia</label>
                <select id='usd-exchange-market' value={chosen.key} onChange={(event) => setSelectedMarket(event.target.value)}
                  className='mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white'>
                  {rates.map((quote) => <option key={quote.key} value={quote.key}>{quote.label}</option>)}
                </select>
              </div>
              <div className='grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-3 text-xs dark:bg-slate-800'>
                <div><p className='text-slate-600 dark:text-slate-300'>Compra (vendés USD)</p><p className='mt-1 font-bold'>{ars(chosen.compra)}</p></div>
                <div><p className='text-slate-600 dark:text-slate-300'>Venta (comprás USD)</p><p className='mt-1 font-bold'>{ars(chosen.venta)}</p></div>
              </div>
              {canEstimate && (
                <div className='rounded-xl border border-purple-200 bg-purple-50 p-3 dark:border-purple-500/30 dark:bg-purple-950/20'>
                  <p className='text-xs text-slate-700 dark:text-slate-300'>Portfolio USD convertido a pesos (estimación bruta)</p>
                  <p className='mt-1 break-words text-lg font-bold text-purple-800 dark:text-purple-200'>{ars(amount * chosen.compra)}</p>
                </div>
              )}
              {!canEstimate && <p className='text-xs text-slate-600 dark:text-slate-300'>{showValues ? 'No hay un saldo USD de Portfolio para estimar.' : 'Importes ocultos por tu configuración de privacidad.'}</p>}
              <p className='text-xs text-slate-600 dark:text-slate-300'>
                Actualización: {date.toLocaleString('es-AR')}
                {isStale ? ' · Cotización anterior, puede estar desactualizada' : ''}
              </p>
            </div>
          )}
          <div className='mt-3 flex items-center justify-between gap-2'>
            <a href='https://dolarapi.com/docs/argentina/operations/get-dolares' target='_blank' rel='noreferrer noopener'
              className='inline-flex items-center gap-1 text-xs font-bold text-purple-700 underline dark:text-purple-300'>Fuente: DolarAPI <FiExternalLink aria-hidden='true' /></a>
            <button type='button' disabled={status === 'loading'} onClick={refresh}
              className='inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 px-2 text-xs font-semibold dark:border-slate-600 disabled:opacity-50'>
              <FiRefreshCw aria-hidden='true' /> Actualizar
            </button>
          </div>
          <p className='mt-3 text-[11px] leading-5 text-slate-500 dark:text-slate-400'>
            Referencia informativa, no precio operable garantizado. No incluye comisiones, spreads ni impuestos; MEP puede diferir del efectivo de tu broker. No se usa para modificar saldos o ganancias.
          </p>
        </div>
      )}
    </div>
  );
}
