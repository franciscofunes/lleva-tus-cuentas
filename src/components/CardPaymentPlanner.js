import React, { useMemo, useState } from 'react';
import { BANK_FORM_STYLES } from './BankFormStyles';
import { FINANCIAL_ITEM_SURFACE_STYLES } from './CollapsibleHeading';
import { calculateCardPaymentPlan, formatPlannerMoney } from '../utils/cardPaymentPlanner';

const formatAmountInput = (value) => value === undefined || value === null ? '' : String(value);

function latestCardStatement(card, statements, links) {
  const linked = links.filter((link) => link.cardId === card.id)
    .map((link) => statements.find((statement) => statement.expenseId === link.expenseId))
    .filter(Boolean)
    .sort((a, b) => String(b.dueDate || '').localeCompare(String(a.dueDate || '')))[0];
  const snapshot = card.statementSnapshot || {};
  const useLinked = Boolean(linked && (!snapshot.dueDate || String(linked.dueDate || '') >= snapshot.dueDate));
  return {
    amountArs: formatAmountInput(useLinked ? linked.totals?.ARS : snapshot.lastStatementARS),
    amountUsd: formatAmountInput(useLinked ? linked.totals?.USD : snapshot.lastStatementUSD),
    perceptionArs: '', // Generic taxesArs is NOT necessarily an eligible RG 5617 amount.
    dueDate: useLinked ? linked.dueDate : snapshot.dueDate || '',
    source: useLinked ? 'Resumen PDF vinculado' : 'Referencia manual del home banking',
  };
}

function MoneyField({ label, value, onChange, required = false }) {
  return <label className={BANK_FORM_STYLES.label}>
    <span>{label}</span>
    <input className={BANK_FORM_STYLES.input} inputMode='decimal' required={required}
      value={value} onChange={(event) => onChange(event.target.value)} placeholder='0,00'/>
  </label>;
}

function AccountSource({ label, accounts, selectedId, onSelect, value, onValue, emptyLabel }) {
  return <div className='space-y-2'>
    <label className={BANK_FORM_STYLES.label}>
      <span>{label}</span>
      <select className={BANK_FORM_STYLES.input} value={selectedId}
        onChange={(event) => {
          const id = event.target.value;
          onSelect(id);
          const selected = accounts.find((account) => account.id === id);
          if (selected) onValue(formatAmountInput(Math.max(0, Number(selected.balance) || 0)));
        }}>
        <option value=''>{emptyLabel}</option>
        {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select>
    </label>
    <MoneyField label='Saldo disponible para este plan' value={value} onChange={onValue}/>
  </div>;
}

export default function CardPaymentPlanner({ banks = [], accounts = [], cards = [], statements = [], links = [], privacyHidden, onRevealValues }) {
  const [chosenCardId, setChosenCardId] = useState('');
  const [lines, setLines] = useState([]);
  const [nextManualId, setNextManualId] = useState(1);
  const [arsAccountId, setArsAccountId] = useState('');
  const [usdAccountId, setUsdAccountId] = useState('');
  const [fxAccountId, setFxAccountId] = useState('');
  const [availableArs, setAvailableArs] = useState('');
  const [availableUsd, setAvailableUsd] = useState('');
  const [fxAvailableUsd, setFxAvailableUsd] = useState('');
  const [rate, setRate] = useState('');
  const [payUsdInKind, setPayUsdInKind] = useState(true);
  const [deductPerceptions, setDeductPerceptions] = useState(false);
  const arsAccounts = useMemo(() => accounts.filter((account) => account.currency === 'ARS'), [accounts]);
  const usdAccounts = useMemo(() => accounts.filter((account) => account.currency === 'USD'), [accounts]);

  const plan = calculateCardPaymentPlan({
    statements: lines, availableArs, availableUsd, fxAvailableUsd,
    rateArsPerUsd: rate, payUsdInKind, deductPerceptions,
    sameUsdSource: Boolean(fxAccountId && fxAccountId === usdAccountId),
  });
  const updateLine = (id, key, value) => setLines((current) => current.map((line) =>
    line.id === id ? { ...line, [key]: value } : line));
  const addSelectedCard = () => {
    const card = cards.find((item) => item.id === chosenCardId);
    if (!card || lines.some((line) => line.id === card.id)) return;
    const bank = banks.find((item) => item.code === card.bankId);
    setLines((current) => [...current, {
      id: card.id, name: `${bank?.name || 'Banco'} · ${card.nickname}`,
      ...latestCardStatement(card, statements, links),
    }]);
    setChosenCardId('');
  };
  const addManualCard = () => {
    setLines((current) => [...current, { id: `manual-${nextManualId}`, name: '', amountArs: '',
      amountUsd: '', perceptionArs: '', dueDate: '', source: 'Carga manual', manual: true }]);
    setNextManualId((value) => value + 1);
  };

  // Privacy is structural: the actual numbers and editable inputs never enter
  // the DOM while Bancos is masked, including when this panel stays expanded.
  if (privacyHidden) return <div className='space-y-3'>
    <p className='text-sm text-slate-700 dark:text-slate-200'>Mostrá los importes para simular un pago. El plan no se guarda ni modifica tus saldos.</p>
    <button className={BANK_FORM_STYLES.secondary} type='button' onClick={onRevealValues}>Mostrar importes</button>
  </div>;

  return <div className='space-y-4'>
    <p className='text-sm leading-relaxed text-slate-700 dark:text-slate-200'>Elegí una o varias tarjetas, indicá tus saldos y la cotización que te ofrece la billetera. Es una simulación local: no vende divisas, paga tarjetas ni registra gastos.</p>
    <div className='grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end'>
      <label className={BANK_FORM_STYLES.label}>
        <span>Tarjeta registrada</span>
        <select className={BANK_FORM_STYLES.input} value={chosenCardId} onChange={(event) => setChosenCardId(event.target.value)}>
          <option value=''>Elegí una tarjeta</option>
          {cards.filter((card) => !lines.some((line) => line.id === card.id)).map((card) => <option key={card.id} value={card.id}>
            {banks.find((bank) => bank.code === card.bankId)?.name || 'Banco'} · {card.nickname}
          </option>)}
        </select>
      </label>
      <button type='button' disabled={!chosenCardId} className={BANK_FORM_STYLES.secondary} onClick={addSelectedCard}>Agregar tarjeta</button>
      <button type='button' className={BANK_FORM_STYLES.secondary} onClick={addManualCard}>Agregar manualmente</button>
    </div>

    {lines.map((line) => <article key={line.id} aria-label={'Pago planificado ' + (line.name || 'manual')}
      className={`${FINANCIAL_ITEM_SURFACE_STYLES} space-y-3`}>
      <div className='flex min-w-0 items-center justify-between gap-2'>
        <h3 className='min-w-0 break-words text-base font-bold text-slate-900 dark:text-slate-50'>{line.name || 'Tarjeta sin nombre'}</h3>
        <button type='button' className={BANK_FORM_STYLES.secondary} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
          aria-label={'Quitar ' + (line.name || 'tarjeta manual')}>Quitar</button>
      </div>
      {line.manual && <label className={BANK_FORM_STYLES.label}><span>Nombre de la tarjeta</span>
        <input className={BANK_FORM_STYLES.input} value={line.name} onChange={(event) => updateLine(line.id, 'name', event.target.value)} />
      </label>}
      <p className='text-xs text-slate-600 dark:text-slate-300'>{line.source}{line.dueDate ? ` · Vence ${line.dueDate}` : ''}. Confirmá que el saldo no tenga pagos posteriores.</p>
      <div className='grid gap-3 sm:grid-cols-3'>
        <MoneyField label='Total del resumen ARS' value={line.amountArs} onChange={(v) => updateLine(line.id, 'amountArs', v)}/>
        <MoneyField label='Total del resumen USD' value={line.amountUsd} onChange={(v) => updateLine(line.id, 'amountUsd', v)}/>
        <MoneyField label='Percepción RG 5617 en ARS' value={line.perceptionArs} onChange={(v) => updateLine(line.id, 'perceptionArs', v)}/>
      </div>
    </article>)}

    <section className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70' aria-label='Fondos y cotización'>
      <h3 className='font-bold text-slate-900 dark:text-slate-50'>Fondos disponibles</h3>
      <div className='grid gap-3 md:grid-cols-3'>
        <AccountSource label='Cuenta para pagar ARS' accounts={arsAccounts} selectedId={arsAccountId}
          onSelect={setArsAccountId} value={availableArs} onValue={setAvailableArs} emptyLabel='Ingresar saldo manual'/>
        <AccountSource label='Cuenta para pagar USD' accounts={usdAccounts} selectedId={usdAccountId}
          onSelect={setUsdAccountId} value={availableUsd} onValue={setAvailableUsd} emptyLabel='Ingresar saldo manual'/>
        <AccountSource label='Cuenta donde vender USD' accounts={usdAccounts} selectedId={fxAccountId}
          onSelect={setFxAccountId} value={fxAvailableUsd} onValue={setFxAvailableUsd} emptyLabel='Ingresar saldo manual'/>
      </div>
      <MoneyField label='Cotización de venta (ARS por 1 USD)' value={rate} onChange={setRate} required/>
      <p className='text-xs text-slate-600 dark:text-slate-300'>Los saldos bancarios son manuales; la cotización también. Verificá ambos antes de operar. No hay integración ni ejecución automática con la billetera.</p>
      <div className='space-y-2'>
        <label className='flex min-h-[44px] items-center gap-3 text-sm text-slate-900 dark:text-slate-50'>
          <input className='h-5 w-5 accent-violet-700' type='checkbox' checked={payUsdInKind}
            onChange={(event) => setPayUsdInKind(event.target.checked)}/>
          Pagar el saldo en USD directamente con dólares
        </label>
        <label className='flex min-h-[44px] items-center gap-3 text-sm text-slate-900 dark:text-slate-50'>
          <input className='h-5 w-5 accent-violet-700' type='checkbox' checked={deductPerceptions}
            onChange={(event) => setDeductPerceptions(event.target.checked)}/>
          Confirmo que puedo descontar la percepción RG 5617 al pagar los USD en término
        </label>
      </div>
    </section>

    {plan.error ? <p role='status' className='rounded-xl border border-amber-400/60 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'>{plan.error}</p>
      : <section aria-label='Resultado del plan de pago' className='space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-950/30'>
        <h3 className='text-sm font-bold text-emerald-900 dark:text-emerald-200'>Venta USD necesaria para cubrir los pesos</h3>
        <p className='break-all text-2xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-100'>{formatPlannerMoney(plan.sellUsdCents, 'USD')}</p>
        <dl className='grid gap-2 text-sm text-slate-800 dark:text-slate-200 sm:grid-cols-2'>
          <div><dt>Total resúmenes ARS</dt><dd className='font-bold tabular-nums'>{formatPlannerMoney(plan.totalArsCents, 'ARS')}</dd></div>
          <div><dt>Percepción descontada</dt><dd className='font-bold tabular-nums'>{formatPlannerMoney(plan.deductedCents, 'ARS')}</dd></div>
          <div><dt>Pesos faltantes</dt><dd className='font-bold tabular-nums'>{formatPlannerMoney(plan.missingArsCents, 'ARS')}</dd></div>
          <div><dt>Pesos estimados por la venta</dt><dd className='font-bold tabular-nums'>{formatPlannerMoney(plan.proceedsArsCents, 'ARS')}</dd></div>
          <div><dt>Saldo USD a pagar directamente</dt><dd className='font-bold tabular-nums'>{formatPlannerMoney(plan.totalUsdCents, 'USD')}</dd></div>
          <div><dt>USD todavía sin cobertura</dt><dd className='font-bold tabular-nums'>{formatPlannerMoney(plan.missingUsdCents, 'USD')}</dd></div>
        </dl>
        {plan.perceptionNotApplied && <p role='alert' className='text-sm font-semibold text-amber-800 dark:text-amber-200'>No se descontó la percepción: falta cobertura para pagar todos los USD o hay un importe sin saldo USD asociado.</p>}
        {plan.insufficientFx && <p role='alert' className='text-sm font-semibold text-rose-700 dark:text-rose-300'>La cuenta elegida no tiene USD suficientes para la venta calculada.</p>}
        {plan.missingUsdCents > 0 && <p role='alert' className='text-sm font-semibold text-rose-700 dark:text-rose-300'>Queda deuda en USD; no la convertimos a pesos con la cotización de la billetera.</p>}
        <p className='text-xs text-slate-700 dark:text-slate-300'>Resultado estimado, sin comisiones ni cambios de cotización. Revisá vencimiento, percepción y modalidad de débito automático con tu banco. Nada se guarda automáticamente.</p>
      </section>}
  </div>;
}
