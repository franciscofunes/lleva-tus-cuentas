import React, { useState } from 'react';
import { FiClipboard, FiCheckCircle, FiAlertTriangle, FiUploadCloud } from 'react-icons/fi';
import LocalScreenshotOcr from './LocalScreenshotOcr';
import { cardPhotoToMarkdown, extractBankChargeHint, extractBankOcrHints } from '../utils/localBankOcr';
import {
  parseCardConsumptionMarkdown,exampleCardConsumptionMarkdown,
  duplicateChargeFingerprint,suggestCardMatch
} from '../utils/cardConsumptionMarkdown';

const formInput='mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50';
const action='inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-violet-500/60 px-3 py-2 text-sm font-bold text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200 disabled:opacity-50';
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

const initialPhoto={type:'snapshot',bankId:'',cardId:'',asOf:'',ars:'',usd:'',merchant:'',purchaseDate:'',amount:'',currency:'ARS',installments:'1'};

export default function CardConsumptionMarkdownImporter({banks=[],cards=[],charges=[],onSave,onClose,privacyHidden=false,onRevealValues}) {
  const [mode,setMode]=useState('photo');
  const [photo,setPhoto]=useState(initialPhoto);
  const [detectedText,setDetectedText]=useState('');
  const [markdown,setMarkdown]=useState('');
  const [review,setReview]=useState(null);
  const [assignments,setAssignments]=useState({});
  const [enabled,setEnabled]=useState({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const updatePhoto=(key,value)=>{
    setPhoto(old=>({...old,[key]:value,...(key==='bankId'?{cardId:''}:{})}));
    setReview(null);setError('');
  };

  const photoRecognized=({text})=>{
    setDetectedText(text);
    const hints=extractBankOcrHints(text);
    const purchase=extractBankChargeHint(text);
    setPhoto(current=>({...current,asOf:hints.asOf,ars:hints.currentConsumptionARS,usd:hints.currentConsumptionUSD,
      merchant:purchase?.merchant||'',purchaseDate:purchase?.purchaseDate||'',amount:purchase?.amount||'',
      currency:purchase?.currency||'ARS'}));
    setReview(null);setError('');
  };

  const previewPhoto=()=>{
    const bank=banks.find(item=>(item.code||item.id)===photo.bankId);
    const card=cards.find(item=>item.id===photo.cardId&&item.bankId===photo.bankId);
    if(!detectedText.trim()||!bank||!card){setError('Leé una captura y elegí el banco y la tarjeta correctos.');return;}
    const raw=cardPhotoToMarkdown({...photo,bank:bank.name,card:card.nickname});
    const parsed=parseCardConsumptionMarkdown(raw);
    setReview(parsed);setError('');setEnabled({});
    setAssignments(parsed.valid?{0:{bankId:photo.bankId,cardId:photo.cardId}}:{});
  };

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
    if(busy||privacyHidden||!review?.valid||!selected.length||issues.length)return;
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
  return <section aria-label='Importar capturas de consumos' className='space-y-4 pb-4 text-slate-900 dark:text-slate-50'>
    <header className='pr-12'>
      <p className='text-xs font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-200'>Bancos · importación asistida</p>
      <h2 className='mt-1 text-xl font-extrabold'>Consumos desde capturas</h2>
      <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>
        Elegí una captura o pegá Markdown. Siempre vas a revisar los datos antes de guardarlos.
      </p>
    </header>
    <div className='grid grid-cols-2 gap-2' aria-label='Método de importación'>
      {[['photo','Desde captura'],['markdown','Pegar Markdown']].map(([value,label])=>(
        <button key={value} type='button' aria-pressed={mode===value} disabled={busy}
          className={'min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 '+(mode===value
            ? 'border-violet-500 bg-violet-100 text-violet-800 dark:border-violet-500 dark:bg-slate-800 dark:text-violet-200'
            : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200')}
          onClick={()=>{setMode(value);setReview(null);setError('');}}>{label}</button>
      ))}
    </div>
    {privacyHidden ? <div className='space-y-2 rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200'>
      <p role='status'>Mostrá los importes de Bancos para revisar una captura y confirmar sus datos.</p>
      {onRevealValues && <button type='button' className={action} onClick={onRevealValues}>Mostrar importes y continuar</button>}
    </div> : <>
      {mode==='photo' ? <div className='space-y-3'>
        <LocalScreenshotOcr onRecognized={photoRecognized} disabled={busy} privacyHidden={privacyHidden}/>
        {detectedText && <>
          <p className='text-xs font-semibold text-amber-700 dark:text-amber-300'>Revisá importes, fechas y tarjeta. Corregí cualquier dato mal leído.</p>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <label className='text-sm font-semibold'>Banco de destino
              <select aria-label='Banco para la captura' className={formInput} value={photo.bankId} onChange={e=>updatePhoto('bankId',e.target.value)}>
                <option value=''>Seleccioná un banco</option>
                {banks.map(b=><option key={b.code||b.id} value={b.code||b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className='text-sm font-semibold'>Tarjeta de destino
              <select aria-label='Tarjeta para la captura' className={formInput} value={photo.cardId} disabled={!photo.bankId} onChange={e=>updatePhoto('cardId',e.target.value)}>
                <option value=''>Seleccioná una tarjeta</option>
                {cards.filter(c=>c.bankId===photo.bankId).map(c=><option key={c.id} value={c.id}>{c.nickname}{c.lastFour?' · •••• '+c.lastFour:''}</option>)}
              </select>
            </label>
          </div>
          <fieldset className='space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800'>
            <legend className='px-1 text-sm font-bold'>¿Qué muestra la captura?</legend>
            <div className='grid gap-2 sm:grid-cols-2'>
              {[['snapshot','Total de consumos actuales'],['charge','Una compra individual']].map(([value,label])=><label key={value} className='flex min-h-[44px] items-center gap-2 text-sm'>
                <input type='radio' name='photo-record-type' checked={photo.type===value} onChange={()=>updatePhoto('type',value)}/> {label}
              </label>)}
            </div>
            {photo.type==='snapshot' ? <div className='grid gap-3 sm:grid-cols-2'>
              <label className='text-sm font-semibold'>Fecha de consulta
                <input type='date' aria-label='Fecha de consulta detectada' className={formInput} value={photo.asOf} onChange={e=>updatePhoto('asOf',e.target.value)}/>
              </label>
              <div className='hidden sm:block'/>
              <label className='text-sm font-semibold'>Consumos actuales ARS
                <input aria-label='Consumos ARS detectados' inputMode='decimal' className={formInput} value={photo.ars} onChange={e=>updatePhoto('ars',e.target.value)} placeholder='Si no figura, dejá vacío'/>
              </label>
              <label className='text-sm font-semibold'>Consumos actuales USD
                <input aria-label='Consumos USD detectados' inputMode='decimal' className={formInput} value={photo.usd} onChange={e=>updatePhoto('usd',e.target.value)} placeholder='Si no figura, dejá vacío'/>
              </label>
            </div> : <div className='grid gap-3 sm:grid-cols-2'>
              <label className='text-sm font-semibold sm:col-span-2'>Comercio de la compra
                <input aria-label='Comercio detectado' className={formInput} value={photo.merchant} maxLength={100} onChange={e=>updatePhoto('merchant',e.target.value)}/>
              </label>
              <label className='text-sm font-semibold'>Fecha de compra
                <input type='date' aria-label='Fecha de compra detectada' className={formInput} value={photo.purchaseDate} onChange={e=>updatePhoto('purchaseDate',e.target.value)}/>
              </label>
              <label className='text-sm font-semibold'>Importe de la compra
                <input aria-label='Importe de compra detectado' inputMode='decimal' className={formInput} value={photo.amount} onChange={e=>updatePhoto('amount',e.target.value)}/>
              </label>
              <label className='text-sm font-semibold'>Moneda
                <select aria-label='Moneda de compra detectada' className={formInput} value={photo.currency} onChange={e=>updatePhoto('currency',e.target.value)}><option>ARS</option><option>USD</option></select>
              </label>
              <label className='text-sm font-semibold'>Cuotas
                <input aria-label='Cuotas detectadas' type='number' min='1' max='60' className={formInput} value={photo.installments} onChange={e=>updatePhoto('installments',e.target.value)}/>
              </label>
            </div>}
          </fieldset>
          <details className='rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/70'>
            <summary className='min-h-[44px] cursor-pointer py-3 font-semibold'>Ver texto reconocido para comparar</summary>
            <pre className='max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200'>{detectedText}</pre>
          </details>
          <button type='button' className={action} onClick={previewPhoto} disabled={busy||!photo.bankId||!photo.cardId}>
            <FiCheckCircle aria-hidden='true'/> Revisar datos detectados
          </button>
          <p className='text-xs text-slate-600 dark:text-slate-300'>Una captura genera un registro. Totales y compras se guardan por separado.</p>
        </>}
      </div> : <div className='space-y-3'>
        <div className='space-y-2 rounded-xl border border-violet-300 bg-violet-50 p-3 dark:border-violet-700 dark:bg-slate-900/70'>
          <button type='button' className={action} onClick={copyPrompt}><FiClipboard aria-hidden='true'/> Copiar instrucciones para ChatGPT</button>
          <p className='text-xs text-slate-600 dark:text-slate-300'>Ocultá datos sensibles antes de subir capturas a servicios externos. No mezcles totales con compras individuales.</p>
        </div>
        <label className='block text-sm font-semibold'>Pegar Markdown
          <textarea aria-label='Markdown de consumos de tarjetas' rows={10} value={markdown} maxLength={16000}
            className={formInput+' resize-y font-mono text-xs'} placeholder={exampleCardConsumptionMarkdown}
            onChange={e=>{setMarkdown(e.target.value);setReview(null);setError('');}}/>
        </label>
        <button type='button' className={action} onClick={preview} disabled={!markdown.trim()||busy}>
          <FiUploadCloud aria-hidden='true'/> Revisar datos antes de guardar
        </button>
      </div>}
    </>}
    {review&&!privacyHidden&&<div className='space-y-3' aria-label='Vista previa de consumos'>
      {review.errors.length>0&&<div role='alert' className='rounded-xl border border-rose-400/60 p-3 text-sm text-rose-700 dark:text-rose-300'>
        <p className='font-bold'>Corregí los datos antes de continuar</p>
        {review.errors.map((message,index)=><p key={index} className='mt-1'>{message}</p>)}
      </div>}
      {review.valid&&review.records.map((entry,index)=>{
        const assoc=assigned(index);
        const candidates=cards.filter(card=>card.bankId===assoc.bankId);
        const hint=suggestCardMatch(entry,banks,cards);
        const card=candidates.find(c=>c.id===assoc.cardId);
        const same=duplicate(entry,assoc);
        return <article key={index} className='space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800'>
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
