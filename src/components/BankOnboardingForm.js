import React, { useEffect, useRef, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { exampleBankMarkdown, parseBankMarkdown } from '../utils/banksMarkdown';
import { FINANCIAL_RECORD_DISCLOSURE_STYLES } from './CollapsibleHeading';
import { BANK_FORM_STYLES } from './BankFormStyles';

const input = BANK_FORM_STYLES.input;
const secondary = BANK_FORM_STYLES.secondary;
const primary = BANK_FORM_STYLES.primary;
const blankAccount = () => ({
  name:'',type:'caja_ahorro',currency:'ARS',balance:'0',alias:'',cbu:'',
  accountNumber:'',holder:'',holderTaxId:'',branch:'',
});
const blankCard = () => ({
  nickname:'',brand:'Visa',lastFour:'',closingDay:'',dueDay:'',
  closingDate:'',dueDate:'',asOf:'',
  lastStatementARS:'',lastStatementUSD:'',minimumPaymentARS:'',
  currentConsumptionARS:'',currentConsumptionUSD:'',availableLimitARS:'',
});
const snapshotFields = [
  ['lastStatementARS','Último resumen · ARS'],['lastStatementUSD','Último resumen · USD'],
  ['minimumPaymentARS','Pago mínimo · ARS'],['currentConsumptionARS','Consumos actuales · ARS'],
  ['currentConsumptionUSD','Consumos actuales · USD'],['availableLimitARS','Disponible para compras · ARS'],
];
function Field({ label, value, onChange, ...props }) {
  return <label className={BANK_FORM_STYLES.label}>
    {label}<input className={input} value={value || ''} onChange={(event)=>onChange(event.target.value)} {...props}/>
  </label>;
}
const Area = ({ children, title, description }) => (
  <section className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50 sm:p-4'>
    <div><h3 className='text-base font-bold text-slate-900 dark:text-slate-50'>{title}</h3>
      {description && <p className='mt-1 text-xs text-slate-600 dark:text-slate-400'>{description}</p>}</div>
    {children}
  </section>
);
export default function BankOnboardingForm({ onSave, onCancel, existingBanks = [], busy = false }) {
  const [name,setName]=useState('');
  const [accounts,setAccounts]=useState([]);
  const [cards,setCards]=useState([]);
  const [markdown,setMarkdown]=useState('');
  const [parsed,setParsed]=useState(null);
  const [importMode,setImportMode]=useState(false);
  const [error,setError]=useState('');
  const submittingRef=useRef(false);
  const errorRef=useRef(null);
  useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
  const change=(setRows,index,key,value)=>{setError('');setRows(rows=>rows.map((row,i)=>i===index?{...row,[key]:value}:row));};
  const remove=(setRows,index)=>setRows(rows=>rows.filter((row,i)=>i!==index));
  const preview=()=>{const result=parseBankMarkdown(markdown);setParsed(result);setError('');};
  const apply=()=>{
    if(!parsed?.valid)return;
    setName(parsed.name);setAccounts(parsed.accounts);setCards(parsed.cards);
    setImportMode(false);setError('');
  };
  const submit=async(event)=>{
    event.preventDefault();
    if (busy || submittingRef.current) return;
    if (name.trim().length < 2) {
      setError('Ingresá un nombre de banco de al menos dos caracteres.');return;
    }
    if (existingBanks.some((bank)=>bank.name?.trim().toLocaleLowerCase()===name.trim().toLocaleLowerCase())) {
      setError('Ya agregaste un banco con ese nombre. Editalo desde Mis bancos.');return;
    }
    setError('');
    submittingRef.current=true;
    try { await onSave({name,accounts,cards}); }
    catch(e){
      const isFirestorePermissionError =
        e?.code === 'permission-denied'
        || /missing or insufficient permissions/i.test(String(e?.message || ''));
      setError(isFirestorePermissionError
        ? 'No pudimos guardar el banco por un problema de permisos. Tus datos siguen acá; revisá tu sesión e intentá nuevamente.'
        : 'No pudimos guardar el banco. Tus datos siguen acá; revisá tu conexión e intentá nuevamente.');
    }
    finally { submittingRef.current=false; }
  };
  return <div className='min-w-0 space-y-4 pb-3'>
    <div className='pr-10'>
      <p className='text-xs font-extrabold uppercase tracking-wider text-purple-500'>Organización financiera</p>
      <h2 className='mt-1 text-xl font-extrabold sm:text-2xl'>Agregar banco</h2>
      <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>Elegí los datos que querés registrar. Solo el nombre es obligatorio si no cargás cuentas ni tarjetas.</p>
    </div>
    <form onSubmit={submit} className='space-y-4'>
      <Area title='Banco' description='Los bancos se crean solo cuando lo confirmás, nunca automáticamente.'>
        <Field label='Nombre del banco' required minLength={2} maxLength={70} value={name} onChange={v=>{setName(v);setError('');}} placeholder='Ej.: Banco Ciudad'/>
      </Area>
      <section className='space-y-3' aria-label='Importar banco desde Markdown'>
        <button type='button' className={secondary} aria-expanded={importMode} aria-controls='bank-markdown-importer' onClick={()=>setImportMode(x=>!x)}>
          {importMode?'Ocultar importador':'Pegar Markdown'}
        </button>
        <div id='bank-markdown-importer' hidden={!importMode}>
          {importMode && <Area title='Rellenar desde Markdown' description='Pegá tus datos, revisá la vista previa y aplicalos al formulario. No se guarda hasta que confirmes.'>
            <textarea aria-label='Markdown de bancos' rows={8} className={input+' resize-y !font-mono'} value={markdown}
              onChange={e=>{setMarkdown(e.target.value);setParsed(null);}}
              placeholder={exampleBankMarkdown}/>
            <button type='button' className={secondary} onClick={preview} disabled={!markdown.trim()||busy}>Comparar Markdown</button>
            {parsed && <div role='status' className='rounded-xl border border-purple-500/40 p-3 text-sm'>
              {parsed.errors.length ? <><p className='font-bold text-rose-600 dark:text-rose-300'>Corregí antes de continuar:</p>
                {parsed.errors.map((e,i)=><p key={i} className='mt-1 text-rose-600 dark:text-rose-300'>{e}</p>)}</> :
                <><p className='font-bold'>{parsed.name}</p>
                  <p className='mt-1 text-slate-600 dark:text-slate-300'>{parsed.accounts.length} cuentas y {parsed.cards.length} tarjetas detectadas.</p>
                  <p className='mt-1 text-xs'>Revisá saldos, monedas, fechas, últimos cuatro dígitos y cuentas antes de guardar. Las capturas no demuestran pagos o consumos conciliados.</p>
                  <button type='button' className={primary+' mt-3'} onClick={apply}>Aplicar al formulario</button></>}
            </div>}
          </Area>}
        </div>
      </section>
      <Area title='Cuentas bancarias (opcional)' description='Registrá una cuenta por moneda. El saldo manual no se transforma en ingreso de Transacciones.'>
        {accounts.map((a,i)=><div key={i} className='space-y-3 rounded-xl border border-slate-300 p-3 dark:border-slate-600'>
          <div className='flex items-center justify-between'><p className='font-bold'>Cuenta {i+1}</p>
            <button type='button' className={secondary} onClick={()=>remove(setAccounts,i)} aria-label={'Eliminar cuenta '+(i+1)}><FiTrash2/></button></div>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <Field label='Nombre de la cuenta' required maxLength={70} value={a.name} onChange={v=>change(setAccounts,i,'name',v)}/>
            <label className={BANK_FORM_STYLES.label}>Tipo
              <select className={input} value={a.type} onChange={e=>change(setAccounts,i,'type',e.target.value)}>
                <option value='caja_ahorro'>Caja de ahorro</option><option value='cuenta_corriente'>Cuenta corriente</option><option value='otra'>Otra</option>
              </select>
            </label>
            <label className={BANK_FORM_STYLES.label}>Moneda
              <select className={input} value={a.currency} onChange={e=>change(setAccounts,i,'currency',e.target.value)}><option>ARS</option><option>USD</option></select>
            </label>
            <Field label='Saldo manual' required inputMode='decimal' value={a.balance} onChange={v=>change(setAccounts,i,'balance',v)}/>
            <Field label='Número de cuenta (opcional)' maxLength={60} value={a.accountNumber} onChange={v=>change(setAccounts,i,'accountNumber',v)}/>
            <Field label='Alias (opcional)' maxLength={80} value={a.alias} onChange={v=>change(setAccounts,i,'alias',v)}/>
            <Field label='CBU/CVU (opcional, 22 dígitos)' inputMode='numeric' pattern='[0-9]{22}' maxLength={22} value={a.cbu} onChange={v=>change(setAccounts,i,'cbu',v)}/>
            <Field label='Titular (opcional)' maxLength={100} value={a.holder} onChange={v=>change(setAccounts,i,'holder',v)}/>
            <Field label='CUIT/CUIL titular (opcional)' maxLength={24} value={a.holderTaxId} onChange={v=>change(setAccounts,i,'holderTaxId',v)}/>
            <Field label='Sucursal (opcional)' maxLength={70} value={a.branch} onChange={v=>change(setAccounts,i,'branch',v)}/>
          </div>
        </div>)}
        <button type='button' className={secondary} disabled={accounts.length+cards.length>=20}
          onClick={()=>setAccounts(rows=>[...rows,blankAccount()])}><FiPlus/> Agregar cuenta</button>
      </Area>
      <Area title='Tarjetas de crédito (opcional)' description='Solo guardamos los últimos cuatro dígitos. Los importes son una foto manual del home banking, no compras nuevas.'>
        {cards.map((c,i)=><div key={i} className='space-y-3 rounded-xl border border-slate-300 p-3 dark:border-slate-600'>
          <div className='flex items-center justify-between'><p className='font-bold'>Tarjeta {i+1}</p><button type='button' className={secondary} onClick={()=>remove(setCards,i)} aria-label={'Eliminar tarjeta '+(i+1)}><FiTrash2/></button></div>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <Field label='Nombre de la tarjeta' required maxLength={70} value={c.nickname} onChange={v=>change(setCards,i,'nickname',v)}/>
            <label className={BANK_FORM_STYLES.label}>Marca
              <select className={input} value={c.brand} onChange={e=>change(setCards,i,'brand',e.target.value)}>
                <option>Visa</option><option>Mastercard</option><option>Amex</option><option>Otra</option>
              </select>
            </label>
            <Field label='Últimos 4 dígitos' inputMode='numeric' maxLength={4} pattern='[0-9]{4}' value={c.lastFour} onChange={v=>change(setCards,i,'lastFour',v)}/>
            <Field label='Día habitual de cierre' required type='number' min='1' max='31' value={c.closingDay} onChange={v=>change(setCards,i,'closingDay',v)}/>
            <Field label='Día habitual de vencimiento' required type='number' min='1' max='31' value={c.dueDay} onChange={v=>change(setCards,i,'dueDay',v)}/>
          </div>
          <details className='rounded-xl border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70'>
            <summary className={FINANCIAL_RECORD_DISCLOSURE_STYLES+' cursor-pointer leading-snug'}>Datos del último resumen y período actual (opcionales)</summary>
            <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <Field label='Fecha de cierre mostrada' type='date' value={c.closingDate} onChange={v=>change(setCards,i,'closingDate',v)}/>
              <Field label='Fecha de vencimiento mostrada' type='date' value={c.dueDate} onChange={v=>change(setCards,i,'dueDate',v)}/>
              <Field label='Fecha de consulta de saldos' type='date' value={c.asOf} onChange={v=>change(setCards,i,'asOf',v)}/>
              {snapshotFields.map(([key,label])=><Field key={key} label={label} inputMode='decimal'
                value={c[key]} onChange={v=>change(setCards,i,key,v)}/>)}
            </div>
          </details>
        </div>)}
        <button type='button' className={secondary} disabled={accounts.length+cards.length>=20}
          onClick={()=>setCards(rows=>[...rows,blankCard()])}><FiPlus/> Agregar tarjeta</button>
      </Area>
      {error && <p role='alert' tabIndex={-1} ref={errorRef} className='rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm leading-relaxed text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200'>{error}</p>}
      <p className='text-xs text-slate-600 dark:text-slate-300'>No ingreses claves, CVV ni los 16 dígitos de las tarjetas. La importación no registra pagos, consumos ni transferencias en Transacciones.</p>
      <div data-testid='bank-onboarding-actions' className='sticky bottom-0 z-10 -mx-4 grid grid-cols-2 gap-2 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 sm:-mx-6 sm:px-6'>
        <button type='button' className={secondary} onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className={primary} type='submit' disabled={busy}>
          {busy?'Guardando…':'Guardar banco'}
        </button>
      </div>
    </form>
  </div>;
}
