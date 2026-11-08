import React, { useEffect, useRef, useState } from 'react';
import { FiCamera, FiChevronDown, FiCreditCard, FiInfo } from 'react-icons/fi';
import ReceiptOcrImport from './ReceiptOcrImport';
import { saveManualCardCharge, subscribeBankCards, subscribeBanks } from '../services/bankingService';
import { validDate } from '../utils/bankingModel';
import { mergeReceiptDetails, sanitizeReceiptDetails, RECEIPT_LABELS } from '../utils/receiptDetails';
import ReceiptDetailsView from './ReceiptDetailsView';
import { categoriesForNewTransactions, getCategoryCurrency } from '../utils/customCategories';

const inputClass = 'min-h-[44px] w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50 sm:text-sm';
const labelClass = 'block space-y-1 text-sm font-semibold text-slate-800 dark:text-slate-100';
const paymentLabels = {credit: 'Tarjeta de crédito', debit: 'Tarjeta de débito', transfer: 'Transferencia', cash: 'Efectivo'};
const documentLabels = RECEIPT_LABELS;

function todayLocal() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// Users in Argentina paste "12.345,67", "12345,67" and "12345.67".
// Normalize explicitly; never silently round or guess a three-decimal amount.
export function normalizePurchaseAmount(value) {
  const input = String(value || '').trim();
  const local = /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(input);
  const decimalComma = /^\d+(?:,\d{1,2})?$/.test(input);
  const decimalDot = /^\d+(?:\.\d{1,2})?$/.test(input);
  if (!local && !decimalComma && !decimalDot) throw new Error('Revisá el importe. Ejemplo: 12.345,67.');
  const normalized = local ? input.replace(/\./g, '').replace(',', '.') : input.replace(',', '.');
  const number = Number(normalized);
  if (!Number.isFinite(number) || number <= 0) throw new Error('Ingresá un importe mayor a cero.');
  return normalized;
}

function buildNote(note, paymentMethod) {
  const parts = [String(note || '').trim()];
  if (paymentMethod !== 'credit') parts.push(`Pago: ${paymentLabels[paymentMethod]}`);
  return parts.filter(Boolean).join(' · ');
}

/** Optional first capture step, shared between credit purchases and cash-flow drafts. */
export default function QuickPurchaseCapture({uid, categories = [], onTransactionDraft, onClose, privacyHidden = false}) {
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [cards, setCards] = useState([]);
  const [banks, setBanks] = useState([]);
  const [cardId, setCardId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(todayLocal);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [installments, setInstallments] = useState('1');
  const [documentType, setDocumentType] = useState('ticket');
  const [documentNumber, setDocumentNumber] = useState('');
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [optionalDetailsOpen, setOptionalDetailsOpen] = useState(false);
  const [ocrNotice, setOcrNotice] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!uid) return undefined;
    const errorHandler = () => setError('No se pudieron consultar tus tarjetas. Reintentá desde Bancos.');
    const unsubscribeCards = subscribeBankCards(uid, (items) => {
      setCards(items);
      try {
        const lastCard = window.localStorage.getItem(`ltc:quick-capture:last-card:${uid}`);
        setCardId((existing) => items.some((item) => item.id === existing)
          ? existing : (items.some((item) => item.id === lastCard) ? lastCard : ''));
      } catch { /* Private browsing must not block purchase capture. */ }
    }, errorHandler);
    const unsubscribeBanks = subscribeBanks(uid, setBanks, errorHandler);
    return () => { unsubscribeCards(); unsubscribeBanks(); };
  }, [uid]);

  const onOcrApply = (fields) => {
    if (privacyHidden) return;
    if (fields.merchant) setMerchant(fields.merchant);
    if (fields.amount != null) setAmount(String(fields.amount));
    if (fields.date) setDate(fields.date);
    if (fields.currency) setCurrency(fields.currency);
    if (fields.documentNumber) {
      setDocumentNumber(fields.documentNumber);
      setOptionalDetailsOpen(true);
    }
    if (fields.receiptDetails) {
      setReceiptDetails((previous) => mergeReceiptDetails(previous, fields.receiptDetails));
      setOptionalDetailsOpen(true);
    }
    if (fields.documentType) setDocumentType(fields.documentType);
    setError('');
    const missing = fields.ocrMissingFields || [];
    setOcrNotice(missing.length
      ? `Lectura parcial: completá ${missing.join(', ')} manualmente y revisá la moneda y los importes.`
      : 'Datos detectados. Revisá el importe y la moneda antes de guardar.');
    setScanOpen(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (pendingRef.current || privacyHidden) return;
    pendingRef.current = true;
    setIsSubmitting(true);
    setError('');
    try {
      const normalizedAmount = normalizePurchaseAmount(amount);
      if (category && getCategoryCurrency(category, categories) !== currency)
        throw new Error('La categoría elegida utiliza otra moneda. Elegí una categoría compatible.');
      if (merchant.trim().length < 2 || merchant.trim().length > 100) throw new Error('Ingresá el comercio (2 a 100 caracteres).');
      if (!validDate(date)) throw new Error('Revisá la fecha de compra.');
      const primary = receiptDetails?.documents?.[0] || {};
      const reference = sanitizeReceiptDetails({
        documents: [{...primary, type: documentType,
          number: documentType === 'non_fiscal' ? '' : documentNumber.trim(),
          operationNumber: documentType === 'non_fiscal' ? documentNumber.trim() || primary.operationNumber : primary.operationNumber,
        }, ...(receiptDetails?.documents || []).slice(1)],
        items: receiptDetails?.items || [],
      });
      const combinedNote = buildNote(note, paymentMethod);
      if (combinedNote.length > (paymentMethod === 'credit' ? 300 : 70)) throw new Error('Acortá la descripción o el número de comprobante.');
      if (paymentMethod === 'credit') {
        const chosenCard = cards.find((item) => item.id === cardId);
        if (!chosenCard) throw new Error('Elegí la tarjeta con la que compraste.');
        await saveManualCardCharge(uid, {
          bankId: chosenCard.bankId, cardId: chosenCard.id,
          merchant: merchant.trim(), purchaseDate: date, currency,
          amount: normalizedAmount, installments: Number(installments), note: combinedNote,
          category, receiptDetails: reference,
        });
        try { window.localStorage.setItem(`ltc:quick-capture:last-card:${uid}`, cardId); } catch { /* optional */ }
        onClose('Consumo registrado en tu tarjeta. No se agregó a Transacciones.');
      } else {
        onTransactionDraft({
          merchant: merchant.trim().slice(0, 30), amount: normalizedAmount,
          date, currency, comment: (combinedNote || `Compra en ${merchant.trim()}`).slice(0, 70),
          category, receiptDetails: reference,
        });
      }
    } catch (caught) {
      setError(caught?.message || 'No se pudo preparar el consumo. Reintentá.');
    } finally {
      pendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (privacyHidden) return <p role='status' className='text-amber-700 dark:text-amber-300'>Mostrá los importes para registrar un consumo.</p>;
  return <section aria-label='Registrar compra' className='space-y-4 pb-2'>
    <div className='pr-12'>
      <h2 className='text-xl font-bold text-slate-900 dark:text-slate-50'>Registrar compra</h2>
      <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>Con foto, cupón, factura o carga manual. Ningún comprobante es obligatorio.</p>
    </div>

    <button type='button' aria-expanded={scanOpen} onClick={() => setScanOpen((open) => !open)}
      className='flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-violet-400 bg-violet-50 px-3 py-2 text-left text-sm font-semibold text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-600 dark:bg-slate-800 dark:text-violet-200'>
      <span className='inline-flex items-center gap-2'><FiCamera aria-hidden='true'/> Leer ticket o cupón (opcional)</span><FiChevronDown aria-hidden='true' className={scanOpen ? 'rotate-180' : ''}/>
    </button>
    {scanOpen && <ReceiptOcrImport onApply={onOcrApply} disabled={isSubmitting}/>}
    {ocrNotice && <p role='status' className='text-sm text-amber-800 dark:text-amber-200'>{ocrNotice}</p>}

    <form onSubmit={submit} className='space-y-3'>
      <label className={labelClass}>Medio de pago
        <select className={inputClass} value={paymentMethod} onChange={(event) => {setPaymentMethod(event.target.value);setError('');}}>
          {Object.entries(paymentLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {paymentMethod === 'credit' && <label className={labelClass}>Tarjeta utilizada
        <select className={inputClass} value={cardId} onChange={(event) => setCardId(event.target.value)}>
          <option value=''>Elegir una tarjeta…</option>
          {cards.map((card) => <option key={card.id} value={card.id}>{banks.find((bank) => bank.id === card.bankId)?.name || 'Banco'} · {card.nickname} {card.lastFour ? `(${card.lastFour})` : ''}</option>)}
        </select>
        {!cards.length && <span className='block text-xs font-normal text-amber-700 dark:text-amber-300'>Todavía no tenés tarjetas disponibles. Podés agregarlas en Bancos o elegir otro medio de pago.</span>}
      </label>}

      <div className='grid gap-3 sm:grid-cols-2'>
        <label className={labelClass}>Comercio
          <input className={inputClass} value={merchant} onChange={(event) => setMerchant(event.target.value)} maxLength={100} placeholder='Ej.: Verdulería' required/>
        </label>
        <label className={labelClass}>Fecha de compra
          <input className={inputClass} type='date' value={date} onChange={(event) => setDate(event.target.value)} required/>
        </label>
        <label className={labelClass}>Importe
          <input className={inputClass} inputMode='decimal' value={amount} onChange={(event) => setAmount(event.target.value)} placeholder='Ej.: 12.345,67' required/>
        </label>
        <label className={labelClass}>Moneda
          <select className={inputClass} value={currency} onChange={(event) => setCurrency(event.target.value)}><option value='ARS'>ARS</option><option value='USD'>USD</option></select>
        </label>
        {paymentMethod === 'credit' && <label className={labelClass}>Cuotas
          <input className={inputClass} type='number' min='1' max='60' value={installments} onChange={(event) => setInstallments(event.target.value)} required/>
        </label>}
      </div>

      <label className={labelClass}>Categoría (opcional)
        <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value=''>Elegir después</option>
          {categoriesForNewTransactions(categories, category).filter((item) => item.isExpense && !item.name.includes('Resumen tarjeta') && getCategoryCurrency(item.name, categories) === currency)
            .map((item) => <option key={item.id || item.name} value={item.name}>{item.displayName || item.name}</option>)}
        </select>
      </label>

      <button type='button' aria-expanded={optionalDetailsOpen} onClick={() => setOptionalDetailsOpen((open) => !open)}
        className='flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 py-2 text-left text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:text-slate-200'>
        <span>Datos extra: comprobante y nota (opcional)</span><FiChevronDown aria-hidden='true' className={optionalDetailsOpen ? 'rotate-180' : ''}/>
      </button>
      {optionalDetailsOpen && <div className='space-y-3'>
        <div className='grid gap-3 sm:grid-cols-2'>
          <label className={labelClass}>Tipo de comprobante (opcional)
            <select className={inputClass} value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
              {Object.entries(documentLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={labelClass}>N.º de ticket, cupón o factura (opcional)
            <input className={inputClass} value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} maxLength={80} placeholder='Se puede dejar vacío'/>
          </label>
        </div>
        <ReceiptDetailsView value={receiptDetails}/>
        <label className={labelClass}>Detalle (opcional)
          <input className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} maxLength={220} placeholder='Ej.: Verduras para la semana'/>
        </label>
      </div>}
      <p className='flex items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
        {paymentMethod === 'credit' ? <FiCreditCard aria-hidden='true' className='mt-0.5 shrink-0'/> : <FiInfo aria-hidden='true' className='mt-0.5 shrink-0'/>}
        {paymentMethod === 'credit'
          ? 'Este consumo quedará en Bancos, pendiente de conciliar con el resumen. No se sumará otra vez a los gastos de Transacciones.'
          : 'Continuarás al formulario de Transacciones para elegir una categoría y confirmar el gasto antes de guardarlo.'}
      </p>
      {error && <p role='alert' className='rounded-lg border border-rose-400/60 p-2 text-sm text-rose-700 dark:text-rose-300'>{error}</p>}
      <button type='submit' disabled={isSubmitting} className='min-h-[44px] w-full rounded-xl bg-violet-700 px-4 py-2.5 text-base font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-60 dark:bg-violet-600'>
        {isSubmitting ? 'Procesando…' : paymentMethod === 'credit' ? 'Guardar consumo de tarjeta' : 'Continuar a Transacciones'}
      </button>
    </form>
  </section>;
}
