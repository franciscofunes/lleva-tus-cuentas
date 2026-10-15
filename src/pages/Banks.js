import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiCreditCard, FiPlus, FiRefreshCw, FiShield, FiUploadCloud, FiEye, FiEyeOff } from 'react-icons/fi';
import CollapsibleSection from '../components/CollapsibleSection';
import CardStatementDetails from '../components/CardStatementDetails';
import CardStatementPdfReview from '../components/CardStatementPdfReview';
import AppFooter from '../components/AppFooter';
import { getCategoriesDataAction, storeDataAction } from '../actionCreators/databaseActions';
import { getImportedStatement, saveReviewedStatement, verifyStatementDraft } from '../services/cardStatementService';
import {
  subscribeBanks, subscribeBankAccounts, subscribeBankCards, subscribeBankCharges,
  subscribeBankStatementLinks, subscribeImportedStatements,
  addUserBank, renameUserBank, saveBankAccount, saveBankCard, saveManualCardCharge,
  deleteManualCardCharge, saveStatementBankLink,
} from '../services/bankingService';
import { sumBankBalances, statementForCard } from '../utils/bankingModel';

const initialAccount = { bankId: '', name: 'Caja de ahorro', type: 'caja_ahorro', currency: 'ARS', balance: '0', alias: '', cbu: '' };
const initialCard = { bankId: '', nickname: '', brand: 'Visa', lastFour: '', closingDay: '25', dueDay: '10' };
const initialCharge = { cardId: '', bankId: '', merchant: '', amount: '', currency: 'ARS', purchaseDate: new Date().toISOString().slice(0, 10), installments: '1', note: '' };

const inputClass = 'min-h-[44px] w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
const buttonClass = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50';
const secondary = 'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200';
const surface = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5';
const money = (value, currency) => new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
const maskCbu = (cbu) => cbu ? '•••• •••• •••• •••• ' + String(cbu).slice(-4) : 'No informado';
function Field({ title, children }) {
  return <label className='block min-w-0 space-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300'><span>{title}</span>{children}</label>;
}
function ErrorMessage({ error }) { return error ? <p role='alert' className='rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'>{error}</p> : null; }

export default function Banks() {
  const user = useSelector((state) => state.auth.user);
  // A new session remounts the entire state tree before rendering prior-user data.
  return <BanksWorkspace key={user?.uid || 'guest'} user={user} />;
}

function BanksWorkspace({ user }) {
  const categories = useSelector((state) => state.database.categories);
  const dispatch = useDispatch();
  const uid = user?.uid;
  const [banks, setBanks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [charges, setCharges] = useState([]);
  const [statements, setStatements] = useState([]);
  const [links, setLinks] = useState([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openBank, setOpenBank] = useState(null);
  const [newBankName, setNewBankName] = useState('');
  const [renameBank, setRenameBank] = useState(null);
  const [showUnlinked, setShowUnlinked] = useState(false);
  const [visibility, setVisibility] = useState({ uid: null, visible: false });
  const showValues = visibility.uid === uid && visibility.visible;
  const displayMoney = (amount, currency) => showValues ? money(amount, currency) : '••••';
  useEffect(() => {
    try { setVisibility({ uid, visible: Boolean(uid && window.localStorage.getItem('ltc-bank-visible:' + uid) === '1') }); }
    catch { setVisibility({ uid, visible: false }); }
  }, [uid]);
  const toggleVisibility = () => {
    const visible = !showValues;
    setVisibility({ uid, visible });
    try { window.localStorage.setItem('ltc-bank-visible:' + uid, visible ? '1' : '0'); }
    catch { /* Privacy controls still work without localStorage. */ }
  };
  const [accountDraft, setAccountDraft] = useState(null);
  const [accountEditingId, setAccountEditingId] = useState(null);
  const [cardDraft, setCardDraft] = useState(null);
  const [cardEditingId, setCardEditingId] = useState(null);
  const [chargeDraft, setChargeDraft] = useState(null);
  const [revealedAccount, setRevealedAccount] = useState(null);
  const [pdfCardId, setPdfCardId] = useState('');
  const [pdfDraft, setPdfDraft] = useState(null);
  const lastPdfShaRef = useRef(null);
  const [pendingExpenseId, setPendingExpenseId] = useState(null);
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    setBanks([]); setAccounts([]); setCards([]); setCharges([]);
    setStatements([]); setLinks([]); setPending(true); setError('');
    if (!uid) return undefined;
    let active = true;
    const received = new Set();
    const report = (e) => { if (active) { setError('No pudimos cargar los bancos. Revisá las reglas de Firestore.'); setPending(false); console.error('[ltc-banks] subscription', e?.code || 'error'); } };
    const connect = (index, subscribe, save) => subscribe(uid, (items) => {
      if (!active) return;
      save(items);
      received.add(index);
      if (received.size === 6) setPending(false);
    }, report);
    const clean = [
      connect(0, subscribeBanks, setBanks),
      connect(1, subscribeBankAccounts, setAccounts),
      connect(2, subscribeBankCards, setCards),
      connect(3, subscribeBankCharges, setCharges),
      connect(4, subscribeImportedStatements, setStatements),
      connect(5, subscribeBankStatementLinks, setLinks),
    ];
    const unsubscribeCategories = dispatch(getCategoriesDataAction(uid));
    return () => { active = false; clean.forEach((stop) => stop?.()); unsubscribeCategories?.(); };
  }, [dispatch, uid]);

  const totals = useMemo(() => sumBankBalances(accounts), [accounts]);
  const unlinked = statements.filter((statement) => !links.some((link) => link.expenseId === statement.expenseId));
  const selectedPdfCard = cards.find((card) => card.id === pdfCardId);
  const statementCategory = (Array.isArray(categories) ? categories : []).find((c) => c.isExpense && /Resumen tarjeta/.test(c.name))?.name;

  const run = async (fn, success) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await fn(); if (success) toast.success(success); }
    catch (e) { setError(e?.message || 'No se pudo guardar el cambio.'); }
    finally { setBusy(false); }
  };
  const startAccount = (bankId, account) => {
    setAccountDraft(account ? {
      bankId: account.bankId, name: account.name, type: account.type, currency: account.currency,
      balance: String(account.balance), alias: account.alias || '', cbu: account.cbu || '',
    } : { ...initialAccount, bankId });
    setAccountEditingId(account?.id || null);
    setCardDraft(null); setChargeDraft(null);
  };
  const startCard = (bankId, card) => {
    setCardDraft(card ? {
      bankId: card.bankId, nickname: card.nickname, brand: card.brand, lastFour: card.lastFour || '',
      closingDay: String(card.closingDay), dueDay: String(card.dueDay),
    } : { ...initialCard, bankId });
    setCardEditingId(card?.id || null);
    setAccountDraft(null); setChargeDraft(null);
  };
  const startCharge = (card) => {
    setChargeDraft({ ...initialCharge, bankId: card.bankId, cardId: card.id });
    setAccountDraft(null); setCardDraft(null);
  };
  const bankAccounts = (bankId) => accounts.filter((account) => account.bankId === bankId);
  const bankCards = (bankId) => cards.filter((card) => card.bankId === bankId);
  const statementsForCard = (id) => statementForCard(statements, links, id);
  const chargesForCard = (id) => charges.filter((charge) => charge.cardId === id);
  // An intermediate onDraft(null) during file selection is not a new PDF.
  // Preserve the already-created expense ID for retries of the same SHA.
  const resetPDF = (draft) => {
    if (draft?.fileSha256 && lastPdfShaRef.current !== draft.fileSha256) {
      setPendingExpenseId(null);
      lastPdfShaRef.current = draft.fileSha256;
    }
    setPdfDraft(draft);
  };
  const storePdf = async () => {
    if (!uid || !selectedPdfCard || !pdfDraft || busy) return;
    await run(async () => {
      verifyStatementDraft(pdfDraft);
      const existing = await getImportedStatement(uid, pdfDraft.fileSha256);
      if (existing && pendingExpenseId && existing.expenseId !== pendingExpenseId) throw new Error('Resumen duplicado.');
      let expenseId = existing?.expenseId || pendingExpenseId;
      if (!expenseId) {
        if (!statementCategory) throw new Error('Todavía no cargó la categoría Resumen tarjeta. Esperá e intentá otra vez.');
        const s = pdfDraft.statement;
        expenseId = await dispatch(storeDataAction({
          userId: uid, name: (s.institution + ' ' + s.cardBrand).slice(0, 30),
          amount: Number(s.totals.ARS), comment: ('Resumen ' + s.period + ' - USD ' + s.totals.USD).slice(0, 70),
          category: statementCategory, transactionCurrency: 'ARS',
          selectedDate: s.dueDate, selectedCloseDate: s.closingDate, selectedExpirationDate: s.dueDate,
          dueDate: s.dueDate, notificationEnabled: true, notificationLeadDays: 5,
        }));
        setPendingExpenseId(expenseId); // safe retry: never create another transaction if PDF save failed
      }
      if (!existing) await saveReviewedStatement({ uid, expenseId, draft: pdfDraft });
      await saveStatementBankLink(uid, expenseId, selectedPdfCard.bankId, selectedPdfCard.id);
      setPdfDraft(null); setPendingExpenseId(null);
    }, 'Resumen guardado y vinculado a la tarjeta sin duplicar consumos.');
  };

  return (
    <main className='min-h-screen bg-slate-50 px-3 py-5 text-slate-900 dark:bg-gray-900 dark:text-slate-100 sm:px-5 lg:px-8'>
      <div className='mx-auto max-w-7xl space-y-5'>
        <header className={surface}>
          <p className='text-xs font-extrabold uppercase tracking-[0.13em] text-purple-700 dark:text-purple-300'>Organización financiera</p>
          <h1 className='mt-1 text-2xl font-extrabold sm:text-3xl'>Bancos y tarjetas</h1>
          <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>Cuentas y saldos manuales, tarjetas, consumos y resúmenes vinculados a Transacciones.</p>
          <p className='mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300'><FiShield aria-hidden='true' /> Solo vos podés consultar estos datos; no vinculamos tu home banking ni solicitamos contraseñas, CVV o números completos de tarjeta.</p>
          <div className='mt-3 flex flex-wrap items-center gap-3'>
            <Link to='/transacciones' className='inline-flex min-h-[40px] items-center text-sm font-bold text-purple-700 dark:text-purple-300'>Ver transacciones →</Link>
            <button type='button' aria-pressed={!showValues} onClick={toggleVisibility} className={secondary}>
              {showValues ? <FiEyeOff aria-hidden='true'/> : <FiEye aria-hidden='true'/>}
              {showValues ? 'Ocultar importes' : 'Mostrar importes'}
            </button>
          </div>
        </header>
        <ErrorMessage error={error} />
        {pending && <div role='status' className={surface + ' animate-pulse'}>Cargando bancos y tarjetas…</div>}
        <div className='grid gap-3 sm:grid-cols-2' aria-label='Saldos manuales por moneda'>
          {['ARS','USD'].map((currency) => (
            <div className={surface} key={currency}>
              <p className='text-xs font-semibold text-slate-600 dark:text-slate-300'>Saldos registrados · {currency}</p>
              <p className='mt-2 break-words text-xl font-extrabold tabular-nums'>{displayMoney(totals[currency], currency)}</p>
              <p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>No incluye deuda de tarjetas ni inversiones de Portfolio.</p>
            </div>
          ))}
        </div>
        {!pending && (
          <section className={surface}>
            <h2 className='text-base font-bold'>Agregar banco</h2>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
              Creá las entidades que usás. No agregamos ningún banco, cuenta ni tarjeta por defecto.
            </p>
            {banks.length === 0 && <p className='mt-3 text-sm'>Todavía no agregaste bancos. Empezá por escribir el nombre de uno.</p>}
            <form className='mt-3 flex flex-col gap-2 sm:flex-row sm:items-end' onSubmit={(event) => {
              event.preventDefault();
              run(async () => {
                const name = newBankName.trim();
                if (banks.some((bank) => bank.name?.toLocaleLowerCase() === name.toLocaleLowerCase()))
                  throw new Error('Ese banco ya está registrado.');
                const id = await addUserBank(uid, name);
                setNewBankName('');
                setOpenBank(id);
              }, 'Banco agregado');
            }}>
              <div className='min-w-0 flex-1'>
                <Field title='Nombre del banco'>
                  <input className={inputClass} required minLength={2} maxLength={70}
                    autoComplete='off' placeholder='Ej.: Banco Galicia, Brubank, BBVA'
                    value={newBankName} onChange={(event) => setNewBankName(event.target.value)}/>
                </Field>
              </div>
              <button type='submit' className={buttonClass} disabled={busy || !newBankName.trim()}>
                <FiPlus aria-hidden='true'/> Agregar banco
              </button>
            </form>
          </section>
        )}
        {banks.filter((bank) => bank.active).map((bank) => {
          const id = bank.code;
          return (
            <CollapsibleSection key={id} id={'bank-' + id} eyebrow='Banco' title={bank.name}
              description={bankAccounts(id).length + ' cuentas · ' + bankCards(id).length + ' tarjetas'}
              collapsed={openBank !== id} onToggle={() => setOpenBank(openBank === id ? null : id)}>
              <div className='space-y-5'>
                {renameBank?.id === id ? (
                  <form className='flex flex-col gap-2 sm:flex-row sm:items-end'
                    onSubmit={(event) => { event.preventDefault(); run(async () => {
                      await renameUserBank(uid, id, renameBank.name);
                      setRenameBank(null);
                    }, 'Banco actualizado'); }}>
                    <div className='min-w-0 flex-1'>
                      <Field title='Editar nombre del banco'>
                        <input className={inputClass} required minLength={2} maxLength={70}
                          value={renameBank.name} onChange={(event) => setRenameBank({id, name:event.target.value})}/>
                      </Field>
                    </div>
                    <button className={buttonClass} disabled={busy}>Guardar nombre</button>
                    <button type='button' className={secondary} onClick={() => setRenameBank(null)}>Cancelar</button>
                  </form>
                ) : (
                  <button type='button' className={secondary}
                    onClick={() => setRenameBank({id, name:bank.name})}>Editar nombre del banco</button>
                )}
                <section className='space-y-3' aria-label={'Cuentas de ' + bank.name}>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <h3 className='text-base font-extrabold'>Cuentas bancarias</h3>
                    <button type='button' className={secondary} disabled={busy} onClick={() => startAccount(id)}><FiPlus/> Añadir cuenta</button>
                  </div>
                  {bankAccounts(id).length === 0 && <p className='text-sm text-slate-600 dark:text-slate-300'>Todavía no agregaste cuentas.</p>}
                  <div className='grid gap-3 md:grid-cols-2'>
                    {bankAccounts(id).map((a) => (
                      <article key={a.id} className={surface}>
                        <p className='font-bold'>{a.name}</p>
                        <p className='text-xs text-slate-600 dark:text-slate-300'>{a.type === 'cuenta_corriente' ? 'Cuenta corriente' : a.type === 'caja_ahorro' ? 'Caja de ahorro' : 'Otra cuenta'} · {a.currency}</p>
                        <p className='mt-2 text-lg font-extrabold tabular-nums'>{displayMoney(a.balance, a.currency)}</p>
                        {a.alias && <p className='mt-2 break-all text-sm'>Alias: {a.alias}</p>}
                        <p className='mt-1 text-xs'>CBU/CVU: {revealedAccount === a.id ? (a.cbu || 'No informado') : maskCbu(a.cbu)}</p>
                        {a.cbu && <button type='button' onClick={() => setRevealedAccount(revealedAccount === a.id ? null : a.id)}
                          className='mt-2 inline-flex min-h-[40px] items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-300'>
                          {revealedAccount === a.id ? <FiEyeOff/> : <FiEye/>} {revealedAccount === a.id ? 'Ocultar CBU' : 'Ver CBU'}
                        </button>}
                        <div className='mt-2'><button type='button' className={secondary} onClick={() => startAccount(id, a)}>Editar cuenta o saldo</button></div>
                      </article>
                    ))}
                  </div>
                  {accountDraft?.bankId === id && (
                    <form className={surface + ' grid gap-3 sm:grid-cols-2'} onSubmit={(event) => { event.preventDefault();
                      run(async () => { await saveBankAccount(uid, accountDraft, accountEditingId); setAccountDraft(null); }, 'Cuenta guardada'); }}>
                      <h4 className='sm:col-span-2 font-bold'>{accountEditingId ? 'Editar cuenta' : 'Nueva cuenta'}</h4>
                      <Field title='Nombre o apodo'><input className={inputClass} required maxLength={70} value={accountDraft.name} onChange={(e)=>setAccountDraft({ ...accountDraft, name:e.target.value })}/></Field>
                      <Field title='Tipo'><select className={inputClass} value={accountDraft.type} onChange={(e)=>setAccountDraft({ ...accountDraft, type:e.target.value })}><option value='caja_ahorro'>Caja de ahorro</option><option value='cuenta_corriente'>Cuenta corriente</option><option value='otra'>Otra</option></select></Field>
                      <Field title='Moneda'><select className={inputClass} value={accountDraft.currency} onChange={(e)=>setAccountDraft({ ...accountDraft, currency:e.target.value })}><option value='ARS'>Pesos (ARS)</option><option value='USD'>Dólares (USD)</option></select></Field>
                      <Field title='Saldo actual (manual)'><input className={inputClass} required inputMode='decimal' value={accountDraft.balance} onChange={(e)=>setAccountDraft({ ...accountDraft, balance:e.target.value })}/></Field>
                      <Field title='Alias (opcional)'><input className={inputClass} maxLength={80} value={accountDraft.alias} onChange={(e)=>setAccountDraft({ ...accountDraft, alias:e.target.value })}/></Field>
                      <Field title='CBU/CVU de 22 dígitos (opcional)'><input className={inputClass} inputMode='numeric' pattern='[0-9]{22}' autoComplete='off' placeholder='Solo si querés guardarlo' value={accountDraft.cbu} onChange={(e)=>setAccountDraft({ ...accountDraft, cbu:e.target.value })}/></Field>
                      <div className='sm:col-span-2 flex flex-wrap gap-2'><button className={buttonClass} disabled={busy}>Guardar cuenta</button><button type='button' className={secondary} onClick={() => setAccountDraft(null)}>Cancelar</button></div>
                    </form>
                  )}
                </section>

                <section className='space-y-3' aria-label={'Tarjetas de ' + bank.name}>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <h3 className='text-base font-extrabold'>Tarjetas de crédito</h3>
                    <button type='button' className={secondary} disabled={busy} onClick={() => startCard(id)}><FiPlus/> Añadir tarjeta</button>
                  </div>
                  {bankCards(id).length === 0 && <p className='text-sm text-slate-600 dark:text-slate-300'>Agregá una tarjeta para registrar consumos e importar sus resúmenes.</p>}
                  {cardDraft?.bankId === id && (
                    <form className={surface + ' grid gap-3 sm:grid-cols-2'} onSubmit={(event) => { event.preventDefault();
                      run(async () => { await saveBankCard(uid, cardDraft, cardEditingId); setCardDraft(null); }, 'Tarjeta guardada'); }}>
                      <h4 className='font-bold sm:col-span-2'>{cardEditingId ? 'Editar tarjeta' : 'Nueva tarjeta'}</h4>
                      <Field title='Nombre de la tarjeta'><input required className={inputClass} maxLength={70} placeholder='Visa Gold' value={cardDraft.nickname} onChange={(e)=>setCardDraft({ ...cardDraft, nickname:e.target.value })}/></Field>
                      <Field title='Marca'><select className={inputClass} value={cardDraft.brand} onChange={(e)=>setCardDraft({ ...cardDraft, brand:e.target.value })}>{['Visa','Mastercard','Amex','Otra'].map(v=><option key={v}>{v}</option>)}</select></Field>
                      <Field title='Últimos 4 dígitos (opcional)'><input className={inputClass} maxLength={4} inputMode='numeric' pattern='[0-9]{4}' value={cardDraft.lastFour} onChange={(e)=>setCardDraft({ ...cardDraft, lastFour:e.target.value })}/></Field>
                      <Field title='Día habitual de cierre'><input required className={inputClass} type='number' min='1' max='31' value={cardDraft.closingDay} onChange={(e)=>setCardDraft({ ...cardDraft, closingDay:e.target.value })}/></Field>
                      <Field title='Día habitual de vencimiento'><input required className={inputClass} type='number' min='1' max='31' value={cardDraft.dueDay} onChange={(e)=>setCardDraft({ ...cardDraft, dueDay:e.target.value })}/></Field>
                      <p className='text-xs text-slate-600 dark:text-slate-300 sm:col-span-2'>Estos días son orientativos. Cada resumen PDF conserva sus fechas reales de cierre y vencimiento.</p>
                      <div className='sm:col-span-2 flex gap-2'><button className={buttonClass} disabled={busy}>Guardar tarjeta</button><button type='button' className={secondary} onClick={()=>setCardDraft(null)}>Cancelar</button></div>
                    </form>
                  )}
                  {bankCards(id).map((card) => (
                    <details key={card.id} className={surface + ' group'}>
                      <summary className='flex cursor-pointer list-none flex-wrap items-center justify-between gap-3'>
                        <span className='inline-flex items-center gap-2 font-extrabold'><FiCreditCard className='text-purple-600 dark:text-purple-300'/> {card.nickname} {card.lastFour && <span className='text-xs font-semibold text-slate-600 dark:text-slate-300'>•••• {card.lastFour}</span>}</span>
                        <span className='text-xs text-slate-600 dark:text-slate-300'>Cierre día {card.closingDay} · Vence día {card.dueDay} ▾</span>
                      </summary>
                      <div className='mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700'>
                        <button type='button' className={secondary} onClick={() => startCard(id, card)}>Editar tarjeta</button>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <h4 className='font-bold'>Consumos registrados</h4>
                          <button type='button' className={secondary} onClick={() => startCharge(card)}><FiPlus/> Agregar consumo manual</button>
                        </div>
                        <p className='text-xs text-slate-600 dark:text-slate-300'>Estos consumos no crean gastos de Transacciones. Los resúmenes analizados se presentan aparte.</p>
                        {chargesForCard(card.id).length === 0 && <p className='text-sm text-slate-600 dark:text-slate-300'>No hay consumos manuales.</p>}
                        {chargesForCard(card.id).map((charge) => <div key={charge.id} className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700'>
                          <div><p className='font-semibold'>{charge.merchant}</p><p className='text-xs text-slate-600 dark:text-slate-300'>{charge.purchaseDate} · {charge.installments} cuota(s)</p></div>
                          <span className='font-extrabold tabular-nums'>{displayMoney(charge.amount, charge.currency)}</span>
                          <button type='button' className='min-h-[40px] text-xs text-rose-600 dark:text-rose-300' onClick={() => run(() => deleteManualCardCharge(uid, charge.id), 'Consumo eliminado')}>Eliminar</button>
                        </div>)}
                        {chargeDraft?.cardId === card.id && (
                          <form className='grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2'
                            onSubmit={(event)=>{event.preventDefault();run(async()=>{await saveManualCardCharge(uid,chargeDraft);setChargeDraft(null)},'Consumo agregado');}}>
                            <Field title='Comercio'><input className={inputClass} required maxLength={100} value={chargeDraft.merchant} onChange={(e)=>setChargeDraft({...chargeDraft,merchant:e.target.value})}/></Field>
                            <Field title='Fecha de compra'><input className={inputClass} type='date' required value={chargeDraft.purchaseDate} onChange={(e)=>setChargeDraft({...chargeDraft,purchaseDate:e.target.value})}/></Field>
                            <Field title='Importe'><input className={inputClass} inputMode='decimal' required value={chargeDraft.amount} onChange={(e)=>setChargeDraft({...chargeDraft,amount:e.target.value})}/></Field>
                            <Field title='Moneda'><select className={inputClass} value={chargeDraft.currency} onChange={(e)=>setChargeDraft({...chargeDraft,currency:e.target.value})}><option>ARS</option><option>USD</option></select></Field>
                            <Field title='Cuotas'><input className={inputClass} type='number' min='1' max='60' value={chargeDraft.installments} onChange={(e)=>setChargeDraft({...chargeDraft,installments:e.target.value})}/></Field>
                            <Field title='Nota opcional'><input className={inputClass} maxLength={300} value={chargeDraft.note} onChange={(e)=>setChargeDraft({...chargeDraft,note:e.target.value})}/></Field>
                            <div className='flex flex-wrap gap-2 sm:col-span-2'><button className={buttonClass} disabled={busy}>Guardar consumo</button><button type='button' className={secondary} onClick={()=>setChargeDraft(null)}>Cancelar</button></div>
                          </form>
                        )}
                        <h4 className='font-bold'>Resúmenes de tarjeta vinculados</h4>
                        {statementsForCard(card.id).length === 0 && <p className='text-sm text-slate-600 dark:text-slate-300'>Todavía no hay resúmenes vinculados.</p>}
                        {statementsForCard(card.id).map((statement) => <article key={statement.id} className='rounded-xl border border-slate-200 p-3 dark:border-slate-700'>
                          <p className='font-bold'>Resumen {statement.period} · {statement.cardBrand}</p>
                          <p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>Cierre {statement.closingDate} · Vencimiento {statement.dueDate} · {statement.itemCount} consumos</p>
                          <p className='mt-1 text-sm font-bold'>{displayMoney(statement.totals?.ARS,'ARS')} · {displayMoney(statement.totals?.USD,'USD')}</p>
                          {showValues ? <CardStatementDetails expenseId={statement.expenseId}/> : <p className='mt-2 text-xs text-slate-600 dark:text-slate-300'>Mostrá los importes para consultar el desglose.</p>}
                        </article>)}
                        <button type='button' className={secondary} onClick={()=>{setPdfCardId(card.id);setPdfDraft(null);setPendingExpenseId(null);}}>
                          <FiUploadCloud/> Importar resumen PDF de esta tarjeta
                        </button>
                      </div>
                    </details>
                  ))}
                </section>
              </div>
            </CollapsibleSection>
          );
        })}

        {pdfCardId && selectedPdfCard && (
          <section className={surface + ' space-y-3'}>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <h2 className='text-lg font-extrabold'>Importar resumen · {banks.find((bank) => bank.code === selectedPdfCard.bankId)?.name || 'Banco'} / {selectedPdfCard.nickname}</h2>
              <button type='button' className={secondary} onClick={()=>{setPdfCardId('');setPdfDraft(null);setPendingExpenseId(null);}}>Cerrar</button>
            </div>
            <CardStatementPdfReview categories={categories || []} onDraft={resetPDF}
              showApplyButton={false} disabled={busy}/>
            {pdfDraft && <div className='space-y-2 rounded-xl border border-amber-300 p-3 text-sm dark:border-amber-800'>
              <p className='font-bold'>Confirmar resumen {pdfDraft.statement?.period}</p>
              <p>Se creará una única transacción Resumen tarjeta con el importe ARS declarado, y el detalle quedará excluido de los totales de gastos. El USD no se convertirá automáticamente.</p>
              <button type='button' className={buttonClass} disabled={busy || !statementCategory} onClick={storePdf}>
                {busy ? <FiRefreshCw className='animate-spin'/> : <FiCreditCard/>}
                Guardar resumen revisado y vincular
              </button>
            </div>}
          </section>
        )}

        <CollapsibleSection id='bank-imported-statements' eyebrow='Análisis' title='Resúmenes importados sin vincular'
          description={unlinked.length + ' resúmenes PDF sin banco/tarjeta asignados'}
          collapsed={!showUnlinked} onToggle={() => setShowUnlinked((value) => !value)}>
          <p className='mb-3 text-sm text-slate-600 dark:text-slate-300'>Estos resúmenes ya existen en Transacciones. Vincularlos no crea nuevos gastos ni vuelve a importar el PDF.</p>
          {unlinked.length === 0 && <p className='text-sm'>No hay resúmenes pendientes de vincular.</p>}
          {unlinked.map((statement) => {
            const chosen = assignments[statement.expenseId] || { bankId:'', cardId:'' };
            const candidateCards = cards.filter((card)=>card.bankId === chosen.bankId);
            return <div key={statement.id} className='mb-3 space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700'>
              <p className='font-extrabold'>{statement.institution} · {statement.cardBrand} · {statement.period}</p>
              <p className='text-xs text-slate-600 dark:text-slate-300'>Cierre: {statement.closingDate} · Vencimiento: {statement.dueDate}</p>
              <p className='text-sm font-semibold'>{displayMoney(statement.totals?.ARS,'ARS')} · {displayMoney(statement.totals?.USD,'USD')}</p>
              {showValues ? <CardStatementDetails expenseId={statement.expenseId}/> : <p className='mt-2 text-xs text-slate-600 dark:text-slate-300'>Mostrá los importes para consultar el desglose.</p>}
              <div className='grid gap-3 sm:grid-cols-2'>
                <Field title='Banco'><select className={inputClass} value={chosen.bankId} onChange={(e)=>setAssignments({...assignments,[statement.expenseId]:{bankId:e.target.value,cardId:''}})}><option value=''>Elegí banco</option>{banks.map((bank)=><option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></Field>
                <Field title='Tarjeta'><select className={inputClass} value={chosen.cardId} disabled={!chosen.bankId} onChange={(e)=>setAssignments({...assignments,[statement.expenseId]:{...chosen,cardId:e.target.value}})}><option value=''>Elegí tarjeta</option>{candidateCards.map((card)=><option key={card.id} value={card.id}>{card.nickname} {card.lastFour ? '•••• '+card.lastFour : ''}</option>)}</select></Field>
              </div>
              <button type='button' className={buttonClass} disabled={busy || !chosen.cardId} onClick={()=>run(()=>saveStatementBankLink(uid,statement.expenseId,chosen.bankId,chosen.cardId),'Resumen vinculado')}>Vincular resumen existente</button>
            </div>;
          })}
        </CollapsibleSection>
        <AppFooter minimal />
      </div>
    </main>
  );
}
