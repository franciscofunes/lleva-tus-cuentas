import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiCreditCard, FiPlus, FiRefreshCw, FiShield, FiUploadCloud, FiEye, FiEyeOff, FiPieChart, FiEdit2, FiChevronDown } from 'react-icons/fi';
import GenericModal from '../components/GenericModal';
import BankOnboardingForm from '../components/BankOnboardingForm';
import DeleteBankChargeDialog from '../components/DeleteBankChargeDialog';
import StatementLinkEditor from '../components/StatementLinkEditor';
import CardSpendingControls from '../components/CardSpendingControls';
import CardConsumptionMarkdownImporter from '../components/CardConsumptionMarkdownImporter';
import FloatingMenu from '../components/FloatingMenu';
import LitaAssistantPanel from '../components/LitaAssitantPanel';
import CollapsibleSection from '../components/CollapsibleSection';
import QuickAccessCard from '../components/QuickAccessCard';
import FinancialHeaderActions from '../components/FinancialHeaderActions';
import PageDataSkeleton from '../components/PageDataSkeleton';
import { FinancialMetricCard } from '../components/FinancialOverviewPanel';
import { FINANCIAL_ITEM_SURFACE_STYLES, FINANCIAL_RECORD_DISCLOSURE_STYLES, COLLAPSIBLE_SURFACE_STYLES, CollapsibleHeading } from '../components/CollapsibleHeading';
import CardStatementDetails from '../components/CardStatementDetails';
import CardStatementPdfReview from '../components/CardStatementPdfReview';
import { getCategoriesDataAction, storeDataAction } from '../actionCreators/databaseActions';
import { getImportedStatement, saveReviewedStatement, verifyStatementDraft } from '../services/cardStatementService';
import {
  subscribeBanks, subscribeBankAccounts, subscribeBankCards, subscribeBankCharges,
  subscribeBankStatementLinks, subscribeImportedStatements,
  createBankBundle, renameUserBank, saveBankAccount, saveBankCard, saveManualCardCharge,
  deleteManualCardCharge, importReviewedCardConsumptionMarkdown, saveStatementBankLink, reassignStatementBankLink, unlinkStatementBank,
} from '../services/bankingService';
import { sumBankBalances, statementForCard } from '../utils/bankingModel';
import { suggestCardForImportedStatement } from '../utils/bankLinkSuggestions';
import { buildBanksLitaContext } from '../utils/banksLitaContext';
import { subscribeBankBudgets, saveBankBudget } from '../services/bankBudgetService';
import { statementMonthlyHistory, cardMonthManualSpending, cardCycleDates, budgetStatus } from '../utils/cardSpendingInsights';

const initialAccount = { bankId: '', name: 'Caja de ahorro', type: 'caja_ahorro', currency: 'ARS', balance: '0', alias: '', cbu: '' };
const initialCard = { bankId: '', nickname: '', brand: 'Visa', lastFour: '', closingDay: '25', dueDay: '10' };
const initialCharge = { cardId: '', bankId: '', merchant: '', amount: '', currency: 'ARS', purchaseDate: new Date().toISOString().slice(0, 10), installments: '1', note: '' };

const inputClass = 'min-h-[44px] w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
const buttonClass = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50';
const secondary = 'inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-purple-400 hover:bg-purple-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:text-slate-200';
const surface = FINANCIAL_ITEM_SURFACE_STYLES;
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
  const reduceMotion = useReducedMotion();
  const uid = user?.uid;
  const [banks, setBanks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [charges, setCharges] = useState([]);
  const [statements, setStatements] = useState([]);
  const [links, setLinks] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [budgetError, setBudgetError] = useState(false);
  const [budgetCollapsed,setBudgetCollapsed] = useState(false);
  const [showConsumptionImporter,setShowConsumptionImporter] = useState(false);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openBank, setOpenBank] = useState(null);
  const [openCard, setOpenCard] = useState(null);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [manageCollapsed, setManageCollapsed] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [showLita, setShowLita] = useState(false);
  const [renameBank, setRenameBank] = useState(null);
  const [showUnlinked, setShowUnlinked] = useState(true);
  const [editingStatementExpenseId, setEditingStatementExpenseId] = useState(null);
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
  const [deleteChargeTarget, setDeleteChargeTarget] = useState(null);
  const [revealedAccount, setRevealedAccount] = useState(null);
  const [pdfCardId, setPdfCardId] = useState('');
  const [pdfDraft, setPdfDraft] = useState(null);
  const lastPdfShaRef = useRef(null);
  const [pendingExpenseId, setPendingExpenseId] = useState(null);
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    setBanks([]); setAccounts([]); setCards([]); setCharges([]);
    setStatements([]); setLinks([]); setBudgets([]); setBudgetError(false); setPending(true); setError('');
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
    const budgetStop=subscribeBankBudgets(uid,(items)=>{if(active){setBudgets(items);setBudgetError(false);}},()=>{if(active)setBudgetError(true);});
    const unsubscribeCategories = dispatch(getCategoriesDataAction(uid));
    return () => { active = false; clean.forEach((stop) => stop?.()); budgetStop?.(); unsubscribeCategories?.(); };
  }, [dispatch, uid]);

  const totals = useMemo(() => sumBankBalances(accounts), [accounts]);
  const history=useMemo(()=>statementMonthlyHistory(statements,links,cards),[statements,links,cards]);
  const manualSpend=useMemo(()=>cardMonthManualSpending(charges,statements,links,cards),[charges,statements,links,cards]);
  const budgetStatuses=useMemo(()=>['ARS','USD'].map(currency=>budgetStatus(manualSpend,
    budgets.find(item=>item.currency===currency),currency,manualSpend.month)).filter(Boolean),[manualSpend,budgets]);
  const litaBankContext = useMemo(() => buildBanksLitaContext({
    banks, accounts, cards, charges, statements, links, history, budgets, manualSpend,
  }), [banks, accounts, cards, charges, statements, links, history, budgets, manualSpend]);
  const unlinked = statements.filter((statement) => !links.some((link) => link.expenseId === statement.expenseId));
  const editingStatement = statements.find((statement) => statement.expenseId === editingStatementExpenseId);
  const editingStatementLink = links.find((link) => link.expenseId === editingStatementExpenseId);
  const openLinking = () => {
    setShowUnlinked(true);
    requestAnimationFrame(() => document.getElementById('bank-imported-statements')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const selectedPdfCard = cards.find((card) => card.id === pdfCardId);
  const statementCategory = (Array.isArray(categories) ? categories : []).find((c) => c.isExpense && /Resumen tarjeta/.test(c.name))?.name;

  const saveNewBank = async (bundle) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (banks.some((bank) => bank.name?.toLocaleLowerCase() === bundle.name?.trim().toLocaleLowerCase()))
        throw new Error('Ya existe un banco con ese nombre.');
      const id = await createBankBundle(uid, bundle);
      setOpenBank(id);
      setManageCollapsed(false);
      setShowBankForm(false);
      toast.success('Banco, cuentas y tarjetas guardados.');
    } catch (err) {
      throw err; // The modal owns actionable form feedback.
    } finally { setBusy(false); }
  };
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
      accountNumber: account.accountNumber || '', holder: account.holder || '', holderTaxId: account.holderTaxId || '', branch: account.branch || '',
    } : { ...initialAccount, bankId });
    setAccountEditingId(account?.id || null);
    setCardDraft(null); setChargeDraft(null);
  };
  const startCard = (bankId, card) => {
    setCardDraft(card ? {
      bankId: card.bankId, nickname: card.nickname, brand: card.brand, lastFour: card.lastFour || '',
      closingDay: String(card.closingDay), dueDay: String(card.dueDay),
      closingDate: card.statementSnapshot?.closingDate || '', dueDate: card.statementSnapshot?.dueDate || '',
      asOf: card.statementSnapshot?.asOf || '',
      ...Object.fromEntries(['lastStatementARS','lastStatementUSD','minimumPaymentARS','currentConsumptionARS','currentConsumptionUSD','availableLimitARS'].map((key) => [key, card.statementSnapshot?.[key] ?? ''])),
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
        <QuickAccessCard
          eyebrow='Organización financiera'
          title='Bancos y tarjetas'
          description='Administrá tus cuentas, tarjetas, consumos y resúmenes vinculados a Transacciones.'
          note={<span className='inline-flex items-start gap-2'><FiShield className='mt-0.5 shrink-0' aria-hidden='true' />Solo vos podés ver estos datos. No solicitamos claves, CVV ni números completos de tarjeta.</span>}
          actionsClassName='min-w-0 sm:shrink-0'
        >
          <FinancialHeaderActions
            currentSection='banks'
            primaryLabel='Agregar banco'
            onPrimaryAction={() => setShowBankForm(true)}
            primaryDisabled={pending}
            valuesVisible={showValues}
            onTogglePrivacy={toggleVisibility}
            privacyIcon={showValues ? <FiEyeOff className='h-5 w-5' aria-hidden='true'/> : <FiEye className='h-5 w-5' aria-hidden='true'/>}
          />
        </QuickAccessCard>
        <ErrorMessage error={error} />
        {pending ? (
          <PageDataSkeleton variant='banks' />
        ) : (
          <>
            <div id='banks-workspace' className='grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-3'>
            <CollapsibleSection
              id='bank-balances'
              eyebrow='Resumen'
              title='Saldos bancarios'
              description='Totales registrados manualmente, separados por moneda.'
              collapsed={summaryCollapsed}
              onToggle={() => setSummaryCollapsed((value) => !value)}
              className='min-w-0'
            >
              <div className='grid min-w-0 grid-cols-2 gap-2 sm:gap-3' aria-label='Saldos manuales por moneda'>
                {['ARS', 'USD'].map((currency, index) => (
                  <FinancialMetricCard
                    key={currency}
                    metric={{
                      id: currency,
                      label: `Saldos registrados · ${currency}`,
                      value: displayMoney(totals[currency], currency),
                      icon: FiCreditCard,
                    }}
                    index={index}
                    reduceMotion={Boolean(reduceMotion)}
                    privacyHidden={!showValues}
                  />
                ))}
              </div>
              <p className='mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400'>
                No incluye deuda de tarjetas ni inversiones de Portfolio. Los saldos en pesos y dólares no se convierten ni se suman entre sí.
              </p>
            </CollapsibleSection>

            <CollapsibleSection
              id='bank-management'
              eyebrow='Actividad'
              title='Mis bancos'
              description={`${banks.filter((bank) => bank.active).length} bancos · ${accounts.length} cuentas · ${cards.length} tarjetas`}
              collapsed={manageCollapsed}
              onToggle={() => setManageCollapsed((value) => !value)}
              className='min-w-0 lg:col-span-2 lg:row-span-2'
            >
              <div className='space-y-4'>
        {banks.length === 0 && (
          <div className='rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300'>
            Todavía no agregaste bancos. Usá «Agregar banco» para crear uno o completar sus datos con Markdown.
          </div>
        )}
        {banks.filter((bank) => bank.active).map((bank) => {
          const id = bank.code;
          return (
            <CollapsibleSection key={id} id={'bank-' + id} eyebrow='Banco' title={bank.name}
              variant='nested'
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
                      <article key={a.id} aria-label={'Cuenta: ' + a.name} className={surface}>
                        <div className='flex min-w-0 flex-wrap items-start justify-between gap-2'>
                          <h4 className='min-w-0 break-words text-base font-bold text-slate-900 dark:text-slate-50'>{a.name}</h4>
                          <span className='shrink-0 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800 dark:border-violet-700 dark:bg-slate-900/70 dark:text-violet-200'>{a.currency}</span>
                        </div>
                        <p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>{a.type === 'cuenta_corriente' ? 'Cuenta corriente' : a.type === 'caja_ahorro' ? 'Caja de ahorro' : 'Otra cuenta'}</p>
                        <p className='mt-2 min-w-0 break-all text-xl font-extrabold tabular-nums text-slate-900 dark:text-slate-50'>{displayMoney(a.balance, a.currency)}</p>
                        <div className='mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-700'>
                          {(a.alias || a.accountNumber || a.holder || a.holderTaxId || a.branch || a.cbu) ? (
                            <details className='group min-w-0'
                              onToggle={(event) => {
                                if (!event.currentTarget.open && revealedAccount === a.id) setRevealedAccount(null);
                              }}>
                              <summary className={FINANCIAL_RECORD_DISCLOSURE_STYLES + ' cursor-pointer list-none [&::-webkit-details-marker]:hidden'}>
                                <FiChevronDown aria-hidden='true' className='h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none' />
                                Ver detalles
                              </summary>
                              <div className='mt-2 min-w-0 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200'
                                aria-label={'Detalles de cuenta ' + a.name}>
                                {a.alias && <p className='break-all'><strong>Alias: </strong>{a.alias}</p>}
                                {a.accountNumber && <p className='break-all'>N.º de cuenta: {revealedAccount === a.id ? a.accountNumber : '•••• ' + a.accountNumber.slice(-4)}</p>}
                                {a.holder && <p className='break-words'>Titular: {a.holder}</p>}
                                {a.holderTaxId && <p>CUIT/CUIL: {revealedAccount === a.id ? a.holderTaxId : '••••'}</p>}
                                {a.branch && <p className='break-words'>Sucursal: {a.branch}</p>}
                                <p className='break-all'>CBU/CVU: {revealedAccount === a.id ? (a.cbu || 'No informado') : maskCbu(a.cbu)}</p>
                                {a.cbu && <button type='button' onClick={() => setRevealedAccount(revealedAccount === a.id ? null : a.id)}
                                  aria-pressed={revealedAccount === a.id} aria-label={(revealedAccount === a.id ? 'Ocultar CBU de ' : 'Ver CBU de ') + a.name}
                                  className='inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200 dark:hover:bg-slate-800'>
                                  {revealedAccount === a.id ? <FiEyeOff aria-hidden='true'/> : <FiEye aria-hidden='true'/>} {revealedAccount === a.id ? 'Ocultar CBU' : 'Ver CBU'}
                                </button>}
                              </div>
                            </details>
                          ) : <span aria-hidden='true' />}
                          <button type='button' className={secondary} onClick={() => startAccount(id, a)}>Editar cuenta o saldo</button>
                        </div>
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
                      <Field title='Número de cuenta'><input className={inputClass} maxLength={60} value={accountDraft.accountNumber || ''} onChange={(e)=>setAccountDraft({ ...accountDraft, accountNumber:e.target.value })}/></Field>
                      <Field title='Titular'><input className={inputClass} maxLength={100} value={accountDraft.holder || ''} onChange={(e)=>setAccountDraft({ ...accountDraft, holder:e.target.value })}/></Field>
                      <Field title='CUIT/CUIL titular'><input className={inputClass} maxLength={24} value={accountDraft.holderTaxId || ''} onChange={(e)=>setAccountDraft({ ...accountDraft, holderTaxId:e.target.value })}/></Field>
                      <Field title='Sucursal'><input className={inputClass} maxLength={70} value={accountDraft.branch || ''} onChange={(e)=>setAccountDraft({ ...accountDraft, branch:e.target.value })}/></Field>
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
                      <details className='sm:col-span-2 rounded-xl border border-slate-300 p-3 dark:border-slate-600'>
                        <summary className='cursor-pointer text-sm font-bold'>Referencia del home banking (opcional)</summary>
                        <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                          {[
                            ['closingDate','Cierre mostrado','date'],['dueDate','Vencimiento mostrado','date'],['asOf','Fecha de consulta','date'],
                            ['lastStatementARS','Último resumen ARS'],['lastStatementUSD','Último resumen USD'],
                            ['minimumPaymentARS','Pago mínimo ARS'],['currentConsumptionARS','Consumos actuales ARS'],
                            ['currentConsumptionUSD','Consumos actuales USD'],['availableLimitARS','Límite disponible ARS'],
                          ].map(([key,label,type]) => (
                            <Field key={key} title={label}><input className={inputClass} type={type || 'text'} inputMode={type ? undefined : 'decimal'}
                              value={cardDraft[key] ?? ''} onChange={(e)=>setCardDraft({...cardDraft,[key]:e.target.value})}/></Field>
                          ))}
                        </div>
                      </details>
                      <div className='sm:col-span-2 flex gap-2'><button className={buttonClass} disabled={busy}>Guardar tarjeta</button><button type='button' className={secondary} onClick={()=>setCardDraft(null)}>Cancelar</button></div>
                    </form>
                  )}
                  {bankCards(id).map((card) => (
                    <CollapsibleSection key={card.id} id={'bank-card-' + card.id}
                      variant='nested'
                      eyebrow={card.brand}
                      title={card.nickname + (card.lastFour ? ' · •••• ' + card.lastFour : '')}
                      description={`Cierre día ${card.closingDay} · Vence día ${card.dueDay}`}
                      collapsed={openCard !== card.id}
                      onToggle={() => setOpenCard((value) => value === card.id ? null : card.id)}>
                      <div className='min-w-0 space-y-3'>
                        <button type='button' className={secondary} onClick={() => startCard(id, card)}>Editar tarjeta</button>
                         <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/50'>
                           <p className='font-bold'>Próximo cierre: {cardCycleDates(card).closingDate || 'Sin fecha'}</p>
                           <p className='mt-1'>Próximo vencimiento: {cardCycleDates(card).dueDate || 'Sin fecha'}</p>
                           {cardCycleDates(card).estimated && <p className='mt-1 text-amber-700 dark:text-amber-300'>Estimado por los días habituales; confirmá las fechas reales en el banco.</p>}
                         </div>
                        {card.statementSnapshot && <div className='grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/50'>
                          {[
                            ['lastStatementARS','Último resumen ARS','ARS'],['lastStatementUSD','Último resumen USD','USD'],
                            ['minimumPaymentARS','Pago mínimo ARS','ARS'],['currentConsumptionARS','Consumos actuales ARS','ARS'],
                            ['currentConsumptionUSD','Consumos actuales USD','USD'],['availableLimitARS','Disponible ARS','ARS'],
                          ].filter(([key])=>card.statementSnapshot[key]!==undefined).map(([key,label,currency])=>(
                            <p className='min-w-0 break-words' key={key}><span className='block text-slate-600 dark:text-slate-300'>{label}</span>
                              <strong className='text-sm'>{displayMoney(card.statementSnapshot[key],currency)}</strong></p>
                          ))}
                          {card.statementSnapshot.closingDate && <p>Cierre mostrado: {card.statementSnapshot.closingDate}</p>}
                          {card.statementSnapshot.dueDate && <p>Vencimiento mostrado: {card.statementSnapshot.dueDate}</p>}
                          <p className='col-span-2 text-slate-500 dark:text-slate-400'>Datos manuales de referencia; no se agregan a gastos o saldo de cuenta.</p>
                        </div>}
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <h4 className='font-bold'>Consumos registrados</h4>
                          <button type='button' className={secondary} onClick={() => startCharge(card)}><FiPlus/> Agregar consumo manual</button>
                          <button type='button' className={secondary} onClick={()=>setShowConsumptionImporter(true)}><FiUploadCloud/> Importar Markdown de consumos</button>
                        </div>
                        <p className='text-xs text-slate-600 dark:text-slate-300'>Estos consumos no crean gastos de Transacciones. Los resúmenes analizados se presentan aparte.</p>
                        {chargesForCard(card.id).length === 0 && <p className='text-sm text-slate-600 dark:text-slate-300'>No hay consumos manuales.</p>}
                        {chargesForCard(card.id).map((charge) => <article key={charge.id}
                          aria-label={'Consumo: ' + charge.merchant}
                          className='flex min-w-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'>
                          <div className='min-w-0 flex-1'>
                            <p className='break-words font-semibold text-slate-900 dark:text-slate-50'>{charge.merchant}</p>
                            <p className='text-xs text-slate-600 dark:text-slate-300'>{charge.purchaseDate} · {charge.installments} cuota(s)</p>
                          </div>
                          <span className='min-w-0 break-all text-base font-extrabold tabular-nums text-slate-900 dark:text-slate-50'>{displayMoney(charge.amount, charge.currency)}</span>
                          <button type='button' disabled={busy}
                            aria-label={'Eliminar consumo de ' + charge.merchant}
                            className='inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border border-rose-300 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40'
                            onClick={() => setDeleteChargeTarget(charge)}>Eliminar</button>
                        </article>)}
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
                          <div className='mt-3 border-t border-slate-200 pt-3 dark:border-slate-700'>
                            <button type='button' className={secondary} disabled={busy}
                              aria-label={'Corregir vínculo del resumen ' + statement.period}
                              onClick={() => setEditingStatementExpenseId(statement.expenseId)}>
                              <FiEdit2 aria-hidden='true' /> Corregir vínculo
                            </button>
                          </div>
                        </article>)}
                        <button type='button' className={secondary} onClick={()=>{setPdfCardId(card.id);setPdfDraft(null);setPendingExpenseId(null);}}>
                          <FiUploadCloud/> Importar resumen PDF de esta tarjeta
                        </button>
                      </div>
                    </CollapsibleSection>
                  ))}
                </section>
              </div>
            </CollapsibleSection>
          );
        })}

              </div>
            </CollapsibleSection>
            <CollapsibleSection id='bank-spending-alerts' eyebrow='Control mensual'
              title='Topes y consumos de tarjetas'
              description='Controlá cuánto podés gastar antes de tus topes en ARS y USD. El historial es una referencia.'
              collapsed={budgetCollapsed} onToggle={()=>setBudgetCollapsed(v=>!v)} className='min-w-0'>
              {budgetError && <p role='alert' className='mb-3 rounded-xl border border-amber-400/50 p-3 text-xs text-amber-700 dark:text-amber-300'>
                No se pudo cargar la configuración de topes. Revisá las reglas de Firestore para bankSpendingBudgets.
              </p>}
              <CardSpendingControls budgets={budgets} statuses={budgetStatuses} history={history}
                spent={manualSpend} canShowValues={showValues}
                onSave={(currency,values)=>saveBankBudget(uid,currency,values)}
                onAskLita={()=>setShowLita(true)}
                onImportMarkdown={()=>setShowConsumptionImporter(true)}/>
            </CollapsibleSection>

          </div>
        {pdfCardId && selectedPdfCard && (
          <section className={`${COLLAPSIBLE_SURFACE_STYLES.root} p-4 sm:p-5`}>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <CollapsibleHeading eyebrow='Importación' title='Analizar resumen PDF'
                description={`${banks.find((bank) => bank.code === selectedPdfCard.bankId)?.name || 'Banco'} · ${selectedPdfCard.nickname}`} />
              <button type='button' className={secondary} onClick={()=>{setPdfCardId('');setPdfDraft(null);setPendingExpenseId(null);}}>Cerrar</button>
            </div>
            <div className='mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700'>
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
            </div>
          </section>
        )}

        <CollapsibleSection id='bank-imported-statements' eyebrow='Tarjetas · paso pendiente' title='Vincular resúmenes a tarjetas'
          description={unlinked.length ? unlinked.length + ' resumen(es) ya importado(s) esperan una tarjeta' : 'Todos los resúmenes importados están organizados'}
          collapsed={!showUnlinked} onToggle={() => setShowUnlinked((value) => !value)}>
          <div className='mb-4 rounded-xl border border-purple-400/40 bg-purple-500/5 p-3 text-sm'>
            <p className='font-bold'>¿Qué significa vincular un resumen?</p>
            <p className='mt-1 text-slate-600 dark:text-slate-300'>El PDF y la transacción ya están guardados. Elegí la tarjeta a la que corresponde para verlos juntos. No se crea otro gasto, no se carga otra compra y no se modifica el importe.</p>
            <p className='mt-2 text-xs text-slate-600 dark:text-slate-300'>Paso 1 · Revisá el resumen → Paso 2 · Elegí banco y tarjeta → Paso 3 · Confirmá la asociación.</p>
          </div>
          {unlinked.length === 0 && <p role='status' className='rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700'>No tenés resúmenes pendientes de vincular.</p>}
          {unlinked.map((statement) => {
            const suggestion = suggestCardForImportedStatement(statement, banks, cards);
            const chosen = assignments[statement.expenseId] || { bankId:'', cardId:'' };
            const candidateCards = cards.filter((card)=>card.bankId === chosen.bankId);
            const chosenCard = candidateCards.find((card) => card.id === chosen.cardId);
            const chosenBank = banks.find((bank) => bank.code === chosen.bankId);
            return <article key={statement.id} className='mb-3 space-y-3 rounded-xl border border-slate-300 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/40 sm:p-4'>
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <p className='text-xs font-extrabold uppercase tracking-wide text-purple-700 dark:text-purple-300'>Resumen pendiente de asociar</p>
                  <h3 className='mt-1 text-base font-extrabold'>{statement.institution} · {statement.cardBrand}</h3>
                  <p className='text-sm text-slate-600 dark:text-slate-300'>Período {statement.period} · Cierre {statement.closingDate} · Vence {statement.dueDate}</p>
                </div>
                <span className='rounded-full border border-amber-400/60 px-2 py-1 text-xs font-bold text-amber-700 dark:text-amber-300'>Sin tarjeta</span>
              </div>
              <p className='text-sm font-semibold tabular-nums'>{displayMoney(statement.totals?.ARS,'ARS')} · {displayMoney(statement.totals?.USD,'USD')}</p>
              {showValues && <CardStatementDetails expenseId={statement.expenseId}/>}
              {suggestion && <div className='flex flex-wrap items-center gap-2 rounded-lg border border-purple-300/70 p-3 text-sm dark:border-purple-600/60'>
                <p className='min-w-0 flex-1'>Coincidencia probable: <strong>{banks.find((b)=>b.code===suggestion.bankId)?.name} · {cards.find((c)=>c.id===suggestion.cardId)?.nickname}</strong></p>
                <button type='button' className={secondary} disabled={busy} onClick={()=>setAssignments((prev)=>({...prev,[statement.expenseId]:suggestion}))}>Usar sugerencia</button>
              </div>}
              <div className='grid gap-3 sm:grid-cols-2'>
                <Field title='1. Banco del resumen'><select aria-label={'Banco para ' + statement.period} className={inputClass} value={chosen.bankId} onChange={(e)=>setAssignments((prev)=>({...prev,[statement.expenseId]:{bankId:e.target.value,cardId:''}}))}><option value=''>Elegí banco</option>{banks.map((bank)=><option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></Field>
                <Field title='2. Tarjeta a la que pertenece'><select aria-label={'Tarjeta para ' + statement.period} className={inputClass} value={chosen.cardId} disabled={!chosen.bankId} onChange={(e)=>setAssignments((prev)=>({...prev,[statement.expenseId]:{...chosen,cardId:e.target.value}}))}><option value=''>Elegí tarjeta</option>{candidateCards.map((card)=><option key={card.id} value={card.id}>{card.nickname} {card.lastFour ? '•••• '+card.lastFour : ''}</option>)}</select></Field>
              </div>
              {chosenCard && <p className='text-xs text-slate-600 dark:text-slate-300'>Se asociará con <strong>{chosenBank?.name} · {chosenCard.nickname}</strong>. La operación se puede consultar desde esa tarjeta.</p>}
              <button type='button' className={buttonClass} disabled={busy || !chosen.cardId} onClick={()=>run(()=>saveStatementBankLink(uid,statement.expenseId,chosen.bankId,chosen.cardId),'Resumen asociado correctamente · sin crear gastos')}>3. Confirmar asociación</button>
            </article>;
          })}
        </CollapsibleSection>
          </>
        )}
        {editingStatement && editingStatementLink && (
          <GenericModal
            show={Boolean(editingStatement && editingStatementLink)}
            dialogLabel={'Corregir vínculo del resumen ' + editingStatement.period}
            component={StatementLinkEditor}
            statement={editingStatement}
            link={editingStatementLink}
            banks={banks}
            cards={cards}
            onSave={(expenseId, bankId, cardId) => reassignStatementBankLink(uid, expenseId, bankId, cardId)}
            onUnlink={async (expenseId) => {
              await unlinkStatementBank(uid, expenseId);
              setShowUnlinked(true);
            }}
            onClose={(success) => {
              setEditingStatementExpenseId(null);
              if (success) toast.success(success);
            }}
            closeModal={() => setEditingStatementExpenseId(null)}
          />
        )}
        {showConsumptionImporter && (
          <GenericModal
            show={showConsumptionImporter}
            dialogLabel='Importar consumos desde capturas mediante Markdown'
            component={CardConsumptionMarkdownImporter}
            banks={banks}
            cards={cards}
            charges={charges}
            onSave={(reviewed)=>importReviewedCardConsumptionMarkdown(uid,reviewed)}
            onClose={(success)=>{
              setShowConsumptionImporter(false);
              if(success)toast.success(success);
            }}
            closeModal={()=>setShowConsumptionImporter(false)}
          />
        )}
        {deleteChargeTarget && (
          <DeleteBankChargeDialog
            charge={deleteChargeTarget}
            privacyHidden={!showValues}
            onClose={() => setDeleteChargeTarget(null)}
            onDelete={async (chargeId) => {
              await deleteManualCardCharge(uid, chargeId);
              toast.success('Consumo manual eliminado.');
            }}
          />
        )}
        <GenericModal
          show={showBankForm}
          dialogLabel='Crear banco y completar datos'
          component={BankOnboardingForm}
          onSave={saveNewBank}
          onCancel={() => { if(!busy) setShowBankForm(false); }}
          closeModal={() => { if(!busy) setShowBankForm(false); }}
          existingBanks={banks}
          busy={busy}
        />
        {!pending && (
          <FloatingMenu
            openTransactionModal={() => setShowBankForm(true)}
            openLitaModal={() => setShowLita(true)}
            primaryMessage='Banco'
            isModalOpen={showBankForm || showLita}
          />
        )}
        {showLita && (
          <LitaAssistantPanel
            isOpen={showLita}
            setIsOpen={setShowLita}
            section='banks'
            context={litaBankContext}
          />
        )}
      </div>
    </main>
  );
}
