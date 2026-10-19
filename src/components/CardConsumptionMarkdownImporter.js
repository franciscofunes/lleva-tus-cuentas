import React, { useState } from 'react';
import { FiClipboard, FiCheckCircle, FiAlertTriangle, FiUploadCloud } from 'react-icons/fi';
import {
  parseCardConsumptionMarkdown,exampleCardConsumptionMarkdown,
  duplicateChargeFingerprint,suggestCardMatch
} from '../utils/cardConsumptionMarkdown';

const formInput='mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50';
const action='inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-purple-500/60 px-3 py-2 text-sm font-bold text-purple-700 dark:text-purple-300 disabled:opacity-50';
export const screenshotPrompt=`Tengo capturas de consumos de tarjetas de distintos bancos para LTC$. Leé SOLO datos visibles, nunca inventes operaciones, importes ni fechas. No incluyas CBU/CVV/claves/PAN completo. Generá SOLO Markdown, sin tablas ni explicaciones, con estos registros:

# LTC$ · Consumos tarjetas
- type: snapshot
  banco: NOMBRE EXACTO DEL BANCO
  tarjeta: NOMBRE EXACTO O ÚLTIMOS CUATRO DÍGITOS
  fechaConsulta: AAAA-MM-DD
  consumosARS: 1234.56
  consumosUSD: 12.34
  cierre: AAAA-MM-DD
  vencimiento: AAAA-MM-DD

Para una pantalla que muestra consumos TOTALES actuales, usá snapshot (NO crees charge).
Omití las líneas que NO estén visibles; fechaConsulta y al menos un consumo son obligatorios.
Para una captura con operaciones INDIVIDUALES confirmadas, usá por cada compra:
- type: charge
  banco: ...
  tarjeta: ...
  comercio: ...
  fechaCompra: AAAA-MM-DD
  importe: 1234.56
  moneda: ARS
  cuotas: 1
  referencia: IDENTIFICADOR SI ESTÁ VISIBLE

No combines monedas; no incluyas pagos, saldos de cuentas, cuotas futuras totales, transferencias, resúmenes PDF ni gastos de Transacciones. Si faltan datos imprescindibles, preguntame en vez de inventarlos. Máximo 10 registros por bloque. Los valores deben ser números decimales SIN símbolos. Si hay varias tarjetas, separalas en registros distintos.`;

export default function CardConsumptionMarkdownImporter({banks=[],cards=[],charges=[],onSave,onClose}) {
  const [markdown,setMarkdown]=useState('');
  const [review,setReview]=useState(null);
  const [assignments,setAssignments]=useState({});
  const [enabled,setEnabled]=useState({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const preview=()=>{
    const parsed=parseCardConsumptionMarkdown(markdown);
    setReview(parsed);setError('');
    // Suggestions are never persisted or selected automatically.
    setAssignments({});setEnabled({});
  };
  const assigned=(index)=>assignments[index]||{bankId:'',cardId:''};
  const existing=new Set(charges.map(row=>duplicateChargeFingerprint({...row,reference:''})));
  const duplicate=(record,assignment)=>record.type==='charge'&&existing.has(
    duplicateChargeFingerprint({...record.charge,...assignment,reference:''}));
  const issues=review?.records?.map((entry,index)=>{
    const assoc=assigned(index);
    if(enabled[index]===false)return null;
    if(!assoc.bankId||!assoc.cardId)return 'Registro '+(index+1)+': elegí banco y tarjeta.';
    if(!cards.some(c=>c.id===assoc.cardId&&c.bankId===assoc.bankId))
      return 'Registro '+(index+1)+': la tarjeta no pertenece al banco elegido.';
    if(duplicate(entry,assoc))return 'Registro '+(index+1)+': posible consumo ya registrado. Se bloquea la importación duplicada.';
    return null;
  }).filter(Boolean)||[];
  const selected=review?.records?.filter((entry,index)=>enabled[index]!==false).map((entry)=>{
    const i=review.records.indexOf(entry);
    return {...entry,...assigned(i)};
  })||[];
  const save=async()=>{
    if(busy||!review?.valid||!selected.length||issues.length)return;
    setBusy(true);setError('');
    try {
      const result=await onSave(selected);
      onClose('Importación confirmada: '+result.snapshots+' foto(s) de consumo actualizadas, '+result.charges+' compra(s) incorporadas'+(result.duplicates?' y '+result.duplicates+' repetida(s) omitida(s)':'')+'.');
    }catch(e){setError(e?.message||'No se pudo importar. Revisá tus datos y permisos.');}
    finally{setBusy(false);}
  };
  const copyPrompt=async()=>{
    try{await navigator.clipboard.writeText(screenshotPrompt);setError('Prompt copiado. Adjuntá las capturas en ChatGPT y luego pegá el Markdown resultante aquí.');}
    catch{setError('No se pudo copiar automáticamente. Seleccioná el ejemplo o pedime el prompt en ChatGPT.');}
  };
  return <section aria-label='Importar capturas de consumos con Markdown' className='space-y-4 pb-4'>
    <header className='pr-12'>
      <p className='text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-300'>Bancos · importación asistida</p>
      <h2 className='mt-1 text-xl font-extrabold'>Consumos desde capturas</h2>
      <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>
        Subí tus capturas a ChatGPT, pedile el Markdown y pegalo acá. LTC$ nunca analiza imágenes automáticamente ni guarda una compra sin tu confirmación.
      </p>
    </header>
    <div className='space-y-2 rounded-xl border border-purple-300/60 bg-purple-50/50 p-3 dark:bg-purple-950/10'>
      <button type='button' className={action} onClick={copyPrompt}><FiClipboard aria-hidden='true'/> Copiar instrucciones para ChatGPT</button>
      <p className='text-xs text-slate-600 dark:text-slate-300'>Tapá datos sensibles antes de subir capturas. Para totales actuales de una tarjeta, usá <code>snapshot</code>. Para compras individuales, <code>charge</code>. Son registros distintos: no dupliques ambos.</p>
    </div>
    <label className='block text-sm font-semibold'>Pegar Markdown
      <textarea aria-label='Markdown de consumos de tarjetas' rows={10} value={markdown} maxLength={16000}
        className={formInput+' resize-y font-mono text-xs'} placeholder={exampleCardConsumptionMarkdown}
        onChange={e=>{setMarkdown(e.target.value);setReview(null);setError('');}}/>
    </label>
    <button type='button' className={action} onClick={preview} disabled={!markdown.trim()||busy}>
      <FiUploadCloud aria-hidden='true'/> Revisar datos antes de guardar
    </button>
    {review&&<div className='space-y-3' aria-label='Vista previa de consumos'>
      {review.errors.length>0&&<div role='alert' className='rounded-xl border border-rose-400/60 p-3 text-sm text-rose-700 dark:text-rose-300'>
        <p className='font-bold'>Corregí el Markdown antes de continuar</p>
        {review.errors.map((message,index)=><p key={index} className='mt-1'>{message}</p>)}
      </div>}
      {review.valid&&review.records.map((entry,index)=>{
        const assoc=assigned(index);
        const candidates=cards.filter(card=>card.bankId===assoc.bankId);
        const hint=suggestCardMatch(entry,banks,cards);
        const card=candidates.find(c=>c.id===assoc.cardId);
        const same=duplicate(entry,assoc);
        return <article key={index} className='space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50'>
          <label className='flex items-center gap-2 font-bold'>
            <input type='checkbox' aria-label={'Importar registro '+(index+1)}
              checked={enabled[index]!==false} disabled={busy}
              onChange={e=>setEnabled(values=>({...values,[index]:e.target.checked}))}/>
            Registro {index+1} · {entry.type==='snapshot'?'Total del home banking':'Compra individual'}
          </label>
          <p className='text-xs text-slate-600 dark:text-slate-300'>Texto de la captura: {entry.bankHint||'Banco sin identificar'} · {entry.cardHint||'Tarjeta sin identificar'}</p>
          {entry.type==='snapshot'?
            <p className='font-semibold'>Al {entry.snapshot.asOf}: {['ARS','USD'].filter(key=>('currentConsumption'+key) in entry.snapshot).map(c=>c+' '+entry.snapshot['currentConsumption'+c]).join(' · ')}</p>:
            <p className='font-semibold'>{entry.charge.merchant} · {entry.charge.purchaseDate} · {entry.charge.currency} {entry.charge.amount} · {entry.charge.installments} cuota(s)</p>}
          <div className='grid gap-2 sm:grid-cols-2'>
            <label className='text-xs font-bold'>Banco de destino
              <select aria-label={'Banco registro '+(index+1)} className={formInput} value={assoc.bankId} disabled={busy}
                onChange={e=>setAssignments(values=>({...values,[index]:{bankId:e.target.value,cardId:''}}))}>
                <option value=''>Seleccioná un banco</option>
                {banks.map(b=><option key={b.code||b.id} value={b.code||b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className='text-xs font-bold'>Tarjeta de destino
              <select aria-label={'Tarjeta registro '+(index+1)} className={formInput}
                value={assoc.cardId} disabled={!assoc.bankId||busy}
                onChange={e=>setAssignments(values=>({...values,[index]:{...assoc,cardId:e.target.value}}))}>
                <option value=''>Seleccioná una tarjeta</option>
                {candidates.map(c=><option key={c.id} value={c.id}>{c.nickname}{c.lastFour?' · •••• '+c.lastFour:''}</option>)}
              </select>
            </label>
          </div>
          {hint&&!assoc.cardId&&<button type='button' className={action} onClick={()=>{
            const hit=cards.find(c=>c.id===hint);
            setAssignments(values=>({...values,[index]:{bankId:hit.bankId,cardId:hit.id}}));
          }}>Usar sugerencia de tarjeta</button>}
          {card&&entry.type==='snapshot'&&<p className='text-xs text-slate-600 dark:text-slate-300'>
            Se actualizará la foto de consumo de {card.nickname}. No se creará un gasto adicional ni se sumará el saldo de la tarjeta al total.
            {card.statementSnapshot?.asOf&&' Datos anteriores: '+card.statementSnapshot.asOf+'.'}
          </p>}
          {same&&<p role='alert' className='flex gap-2 text-xs font-bold text-rose-700 dark:text-rose-300'>
            <FiAlertTriangle aria-hidden='true'/> Esta compra coincide con un consumo existente. Revisala antes de importarla.
          </p>}
        </article>;
      })}
      {issues.length>0&&<p role='alert' className='rounded-xl border border-amber-400 p-3 text-xs text-amber-800 dark:text-amber-200'>{issues[0]}</p>}
      <div className='flex flex-wrap gap-2'>
        <button type='button' className='inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-purple-600 px-4 font-bold text-white disabled:opacity-50'
          disabled={busy||!review.valid||!selected.length||issues.length>0} onClick={save}>
          <FiCheckCircle aria-hidden='true'/> {busy?'Guardando…':'Confirmar '+selected.length+' registro(s)'}
        </button>
        <button type='button' className={action} disabled={busy} onClick={()=>onClose()}>Cancelar</button>
      </div>
      <p className='text-xs text-slate-600 dark:text-slate-300'>Las compras individuales se guardan como consumos de tarjeta, no como gastos de Transacciones. Los totales capturados reemplazan referencias anteriores de la misma tarjeta; las compras ya incluidas en esa foto no se suman de nuevo.</p>
    </div>}
    {error&&<p role='status' className='rounded-lg border border-slate-300 p-3 text-sm text-slate-700 dark:text-slate-300'>{error}</p>}
  </section>;
}
