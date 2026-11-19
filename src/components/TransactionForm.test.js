import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { storeDataAction } from '../actionCreators/databaseActions';
import TransactionForm, { CREATE_CATEGORY_OPTION } from './TransactionForm';

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) => selector({
    auth: { user: { uid: 'private-user' } },
    database: { isDataFetching: false },
  }),
}));
jest.mock('../actionCreators/databaseActions', () => ({
  storeDataAction: jest.fn(),
  updateDataAction: jest.fn(),
}));
jest.mock('../services/cardStatementService', () => ({
  getImportedStatement: jest.fn(),
  saveReviewedStatement: jest.fn(),
  verifyStatementDraft: jest.fn(),
}));
jest.mock('../services/bankingService', () => ({ saveStatementBankLink: jest.fn() }));
jest.mock('./BankStatementSelector', () => () => null);
jest.mock('./CardStatementPdfReview', () => () => null);
jest.mock('./InfoTooltip', () => () => null);

const initialCategories = [
  { id: 'transport', name: 'Transporte 🚌', isExpense: true, active: true },
  { id: 'home', name: 'Hogar 🏡', origin: 'shared', isExpense: true, active: true },
  { id: 'salary', name: 'Salario 💲', isExpense: false, active: true },
  { id: 'usd', name: 'Software USD', isExpense: true, currency: 'USD', isCustom: true, origin: 'custom' },
  { id: 'rent2', name: 'Alquiler comercial', isExpense: true, active: true,
    dateBehavior: 'separate-due-date', origin: 'custom', isCustom: true },
  { id: 'rent', name: 'Alquiler mensual', isExpense: true, active: true,
    extraFieldIds: ['reference'], dateBehavior: 'due-date', origin: 'custom', isCustom: true },
  { id: 'buy', name: 'Compra divisas', isExpense: true, active: true },
  { id: 'sell', name: 'Venta divisas', isExpense: false, active: true },
  { id: 'fxincome', name: 'Ingreso divisas', isExpense: false, active: true },
  { id: 'credit', name: 'Resumen tarjeta 💳', isExpense: true, active: true },
  { id: 'freelance', name: 'Freelance', isExpense: false, active: true,
    extraFieldIds: ['reference', 'paymentMethod'], origin: 'custom', isCustom: true },
];

function TransactionHarness({ initialCategory = 'Transporte 🚌', initialReceiptCurrency = null,
  initialName = 'Taxi de regreso', initialAmount = '2500', initialDate = '2026-10-10',
  initialComment = 'Viaje', initialQuantity = '', initialRate = '', initialExpiration = '', onCategoryFlags = {}, edit = false }) {
  const [category, setCategory] = useState(initialCategory);
  const [customDetails, setCustomDetails] = useState({});
  const [expiration, setExpiration] = useState(initialExpiration);
  const [name, setName] = useState(initialName);
  const [amount, setAmount] = useState(initialAmount);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [rate, setRate] = useState(initialRate);
  const [flags, setFlags] = useState({
    credit: initialCategory.includes('Resumen tarjeta'),
    buy: initialCategory.includes('Compra divisas'),
    income: initialCategory.includes('Ingreso divisas'),
    sell: initialCategory.includes('Venta divisas'),
  });
  const [comment, setComment] = useState(initialComment);
  const [openManager, setOpenManager] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const noop = () => {};
  return (
    <>
      <TransactionForm
        initialReceiptCurrency={initialReceiptCurrency}
        name={name} setName={setName}
        amount={amount} setAmount={setAmount}
        comment={comment} setComment={setComment}
        category={category} setCategory={setCategory}
        customDetails={customDetails} setCustomDetails={setCustomDetails}
        selectedDate={selectedDate} setSelectedDate={setSelectedDate}
        selectedExpirationDate={expiration} setSelectedExpirationDate={setExpiration}
        selectedCloseDate='' setSelectedCloseDate={noop}
        currencyQuantity={quantity} setCurrencyQuantity={setQuantity}
        currencyExchangeRate={rate} setCurrencyExchangeRate={setRate}
        isCreditCardCategory={flags.credit}
        isBuyCurrenciesCategory={flags.buy}
        isCurrencyIncomeCategory={flags.income}
        isSellCurrenciesCategory={flags.sell}
        setIsCreditCardCategory={(v) => {setFlags(old => ({...old,credit:v}));onCategoryFlags.credit?.(v);}}
        setIsBuyCurrenciesCategory={(v) => {setFlags(old => ({...old,buy:v}));onCategoryFlags.buy?.(v);}}
        setIsCurrencyIncomeCategory={(v) => {setFlags(old => ({...old,income:v}));onCategoryFlags.income?.(v);}}
        setIsSellCurrenciesCategory={(v) => {setFlags(old => ({...old,sell:v}));onCategoryFlags.sell?.(v);}}
        setIsOpen={noop} setEdit={noop} edit={edit} expenseId={edit ? 'expense-test' : undefined}
        categories={categories}
        onManageCategories={() => setOpenManager(true)}
      />
      {openManager && (
        <div role='dialog' aria-label='Administrar categorías personales'>
          <button type='button' onClick={() => {
            setCategories((current) => [...current,
              { id: 'pets', name: 'Mascotas', isExpense: true, active: true }]);
            setCategory('Mascotas');
            setOpenManager(false);
          }}>Simular creación exitosa</button>
          <button type='button' onClick={() => setOpenManager(false)}>Volver sin crear</button>
        </div>
      )}
    </>
  );
}

test('the category picker offers a prominent action that opens the existing manager without losing the draft', () => {
  const credit = jest.fn();
  render(<TransactionHarness onCategoryFlags={{ credit }} />);
  const picker = screen.getByRole('combobox', { name: 'Categoría' });
  expect(screen.getByRole('option', { name: /Crear nueva categoría/ })).toHaveValue(CREATE_CATEGORY_OPTION);
  expect(picker).toHaveValue('Transporte 🚌');

  fireEvent.change(picker, { target: { value: CREATE_CATEGORY_OPTION } });

  expect(screen.getByRole('dialog', { name: 'Administrar categorías personales' })).toBeInTheDocument();
  expect(picker).toHaveValue('Transporte 🚌');
  expect(screen.getByDisplayValue('Taxi de regreso')).toBeInTheDocument();
  expect(credit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Volver sin crear' }));
  expect(picker).toHaveValue('Transporte 🚌');
});

test('a receipt scanner opens within the existing transaction form and has the same themed surface',()=>{
  render(<TransactionHarness/>);
  const trigger=screen.getByRole('button',{name:'Escanear ticket con cámara o foto'});
  expect(trigger).toHaveAttribute('aria-expanded','false');
  expect(trigger.closest('div')).toHaveClass('dark:bg-slate-800');
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded','true');
  expect(screen.getByRole('region',{name:'Escanear ticket con IA local'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Abrir cámara para sacar foto'})).toBeInTheDocument();
});

test('the add button follows the complete form instead of covering amount fields on narrow screens', () => {
  render(<TransactionHarness />);
  const submit = screen.getByRole('button', {name:'Añadir'});
  expect(submit).not.toHaveClass('sticky');
  expect(submit).toHaveClass('min-h-[44px]');
  expect(submit.closest('form').lastElementChild).toBe(submit);
});

test('a quick-captured USD purchase cannot be silently submitted as an ARS expense', async () => {
  render(<TransactionHarness initialReceiptCurrency='USD' />);
  fireEvent.click(screen.getByRole('button', {name:'Añadir'}));
  expect((await screen.findAllByText(/El ticket indica USD, pero la categoría seleccionada guarda en ARS/)).length).toBeGreaterThan(0);
});

test('a created personal category can be selected immediately after returning to the draft', () => {
  render(<TransactionHarness />);
  const picker = screen.getByRole('combobox', { name: 'Categoría' });
  fireEvent.change(picker, { target: { value: CREATE_CATEGORY_OPTION } });
  fireEvent.click(screen.getByRole('button', { name: 'Simular creación exitosa' }));
  expect(picker).toHaveValue('Mascotas');
  expect(screen.getByDisplayValue('Taxi de regreso')).toBeInTheDocument();
  expect(screen.queryByRole('dialog', { name: 'Administrar categorías personales' })).not.toBeInTheDocument();
});

test('the create-category action does not become a persisted form category with no previous selection', () => {
  render(<TransactionHarness initialCategory='' />);
  const picker = screen.getByRole('combobox', { name: 'Categoría' });
  expect(picker).toHaveValue('');
  fireEvent.change(picker, { target: { value: CREATE_CATEGORY_OPTION } });
  expect(picker).toHaveValue('');
  expect(screen.getByRole('dialog', { name: 'Administrar categorías personales' })).toBeInTheDocument();
});

test('renders only the configured safe inputs when selecting a private category', () => {
  render(<TransactionHarness initialCategory='Freelance' />);
  const section = screen.getByRole('region', { name: 'Datos adicionales de la categoría' });
  expect(section).toHaveTextContent('Referencia / ID de operación');
  expect(section).toHaveTextContent('Medio de pago');
  expect(screen.queryByLabelText('Número de comprobante')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Referencia / ID de operación'), { target: { value: 'OP-800' } });
  fireEvent.change(screen.getByLabelText('Medio de pago'), { target: { value: 'transferencia' } });
  expect(screen.getByLabelText('Referencia / ID de operación')).toHaveValue('OP-800');
  expect(screen.getByLabelText('Medio de pago')).toHaveValue('transferencia');
});

test('switching categories removes stale custom metadata from the transaction draft', () => {
  render(<TransactionHarness initialCategory='Freelance' />);
  const ref = screen.getByLabelText('Referencia / ID de operación');
  fireEvent.change(ref, { target: { value: 'OP-800' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Categoría' }), { target: { value: 'Salario 💲' } });
  expect(screen.queryByLabelText('Referencia / ID de operación')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Categoría' }), { target: { value: 'Freelance' } });
  expect(screen.getByLabelText('Referencia / ID de operación')).toHaveValue('');
});

test('a due-date personal category reuses the standard date picker and shows reminder guidance', () => {
  render(<TransactionHarness initialCategory='Alquiler mensual' />);
  expect(screen.getByLabelText('Fecha de vencimiento')).toHaveAttribute('type', 'date');
  expect(screen.getByText(/Esta categoría usa la fecha como vencimiento/)).toBeInTheDocument();
  expect(screen.getByText(/avisará con 5 días de anticipación/)).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Datos adicionales de la categoría' })).toBeInTheDocument();
});

test('a regular custom category still shows the original transaction date field', () => {
  render(<TransactionHarness initialCategory='Freelance' />);
  expect(screen.getByLabelText('Fecha')).toHaveAttribute('type', 'date');
  expect(screen.queryByText(/Esta categoría usa la fecha como vencimiento/)).not.toBeInTheDocument();
});

test('separate deadline custom category displays TWO distinct date fields and a plain explanation', () => {
  render(<TransactionHarness initialCategory='Alquiler comercial' />);
  expect(screen.getByLabelText('Fecha de transacción')).toHaveAttribute('type', 'date');
  const optional = screen.getByLabelText('Fecha de vencimiento (opcional)');
  expect(optional).toHaveAttribute('type', 'date');
  expect(optional).toHaveValue('');
  fireEvent.change(optional, { target: { value: '2026-10-20' } });
  expect(optional).toHaveValue('2026-10-20');
  expect(screen.getByText(/La fecha de la transacción se mantiene/)).toBeInTheDocument();
});

test('expiration from a custom category is cleared when switching to an ordinary category', () => {
  render(<TransactionHarness initialCategory='Alquiler comercial' />);
  fireEvent.change(screen.getByLabelText('Fecha de vencimiento (opcional)'), {
    target: { value: '2026-10-20' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Categoría' }), {
    target: { value: 'Freelance' },
  });
  expect(screen.queryByLabelText('Fecha de vencimiento (opcional)')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Categoría' }), {
    target: { value: 'Alquiler comercial' },
  });
  expect(screen.getByLabelText('Fecha de vencimiento (opcional)')).toHaveValue('');
});

test('USD custom expenses use their own currency and do not show exchange-rate input', () => {
  render(<TransactionHarness initialCategory='Software USD' />);
  expect(screen.getByText('Monto (USD)')).toBeInTheDocument();
  expect(screen.getByText(/sin cotización ni venta de divisas/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Cotización de venta')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Cantidad a vender')).not.toBeInTheDocument();
});

test('legacy ARS categories keep ARS amount field', () => {
  render(<TransactionHarness initialCategory='Transporte 🚌' />);
  expect(screen.getByText('Monto (ARS)')).toBeInTheDocument();
});

test('Hogar enables a separate optional expiration picker with a five-day notification explanation', () => {
  render(<TransactionHarness initialCategory='Hogar 🏡' />);
  expect(screen.getByLabelText('Fecha de transacción')).toHaveValue('2026-10-10');
  const expiration = screen.getByLabelText('Fecha de vencimiento (opcional)');
  expect(expiration).not.toBeRequired();
  expect(expiration).toHaveValue('');
  expect(screen.getByText(/Para expensas, alquiler u otros gastos del hogar/)).toBeInTheDocument();
  expect(screen.getByText(/LTC te avisará 5 días antes/)).toBeInTheDocument();
  fireEvent.change(expiration, { target: { value: '2026-10-20' } });
  expect(expiration).toHaveValue('2026-10-20');
  expect(screen.getByLabelText('Fecha de transacción')).toHaveValue('2026-10-10');
  fireEvent.change(expiration, { target: { value: '' } });
  expect(expiration).toHaveValue('');
});

test('a regular transaction continues without a due-date picker', () => {
  render(<TransactionHarness initialCategory='Transporte 🚌' />);
  expect(screen.queryByLabelText('Fecha de vencimiento (opcional)')).not.toBeInTheDocument();
});


test('transaction description accepts long multiline Unicode, leading symbols and markup-like text without truncation', async () => {
  storeDataAction.mockClear();
  render(<TransactionHarness />);
  const description = screen.getByRole('textbox', { name: 'Descripción (opcional)' });
  const note = '# Ñandú / café 💳 — cuenta (ARS/USD) & descuentos <detalle>\n'
    + 'Producto: $12.345,67; #factura@dominio.com\n'
    + 'Reintegro & comisión: ' + 'áéíóú 😃 !? / [x] '.repeat(90);
  expect(note.length).toBeGreaterThan(1000);
  expect(description).not.toHaveAttribute('maxLength');
  fireEvent.change(description, { target: { value: note } });
  expect(description).toHaveValue(note);
  fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
  await waitFor(() => expect(storeDataAction).toHaveBeenCalledWith(expect.objectContaining({ comment: note })));
  expect(screen.queryByText('Ingrese una descripción de transacción válida')).not.toBeInTheDocument();
});

test('optional description does not block saving a financial transaction', async () => {
  storeDataAction.mockClear();
  render(<TransactionHarness initialComment='' />);
  const description = screen.getByRole('textbox', { name: 'Descripción (opcional)' });
  expect(description).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
  await waitFor(() => expect(storeDataAction).toHaveBeenCalledWith(expect.objectContaining({comment:''})));
  expect(screen.queryByText(/La descripción debe/)).not.toBeInTheDocument();
});

test('pre-filled edit and Markdown-style controlled values do not require typing each field', async()=>{
  const {updateDataAction}=require('../actionCreators/databaseActions');
  updateDataAction.mockClear();
  render(<TransactionHarness edit initialName='🧾 Café Ñandú #123'
    initialAmount='1.234,56' initialDate='2026-11-19' initialComment='Notas multilinea\nCon emoji 💳' />);
  fireEvent.click(screen.getByRole('button',{name:'Guardar'}));
  await waitFor(()=>expect(updateDataAction).toHaveBeenCalledWith(
    expect.objectContaining({
      name:'🧾 Café Ñandú #123',amount:1234.56,
      comment:'Notas multilinea\nCon emoji 💳',selectedDate:'2026-11-19',
    }),'expense-test'));
});

test('shows actionable field summary rather than silently refusing invalid submissions',async()=>{
  storeDataAction.mockClear();
  render(<TransactionHarness initialName=' ' initialAmount='0' initialDate='' initialComment='' />);
  fireEvent.click(screen.getByRole('button',{name:'Añadir'}));
  expect(await screen.findByText(/No se pudo guardar: Revisá/)).toHaveTextContent(/nombre|monto|fecha/);
  expect(storeDataAction).not.toHaveBeenCalled();
});

test('ARS decimals typed with comma and thousands separators are persisted as numeric amounts',async()=>{
  storeDataAction.mockClear();
  render(<TransactionHarness initialAmount='' />);
  fireEvent.change(screen.getByLabelText('Monto (ARS)'),{target:{value:'1.234,56'}});
  fireEvent.click(screen.getByRole('button',{name:'Añadir'}));
  await waitFor(()=>expect(storeDataAction).toHaveBeenCalledWith(
    expect.objectContaining({amount:1234.56})));
});

test('FX sale derives the ARS amount and accepts decimal quantities and exchange rates',async()=>{
  storeDataAction.mockClear();
  render(<TransactionHarness initialCategory='Venta divisas' initialQuantity='12,50' initialRate='1.400,20' />);
  expect(screen.getByLabelText('Monto')).toHaveValue('17502.5');
  fireEvent.click(screen.getByRole('button',{name:'Añadir'}));
  await waitFor(()=>expect(storeDataAction).toHaveBeenCalledWith(
    expect.objectContaining({currencyQuantity:12.5,currencyExchangeRate:1400.2,amount:17502.5})));
});

test('changing from FX sale to regular expense unregisters obsolete mandatory FX fields',async()=>{
  storeDataAction.mockClear();
  render(<TransactionHarness initialCategory='Venta divisas' initialQuantity='' initialRate='' />);
  fireEvent.change(screen.getByRole('combobox',{name:'Categoría'}),{target:{value:'Transporte 🚌'}});
  fireEvent.click(screen.getByRole('button',{name:'Añadir'}));
  await waitFor(()=>expect(storeDataAction).toHaveBeenCalledWith(
    expect.objectContaining({category:'Transporte 🚌',amount:2500})));
});

test('card statement needs a due date but not an invented closing date',async()=>{
  storeDataAction.mockClear();
  render(<TransactionHarness initialCategory='Resumen tarjeta 💳' initialExpiration='2026-12-10' />);
  expect(screen.getByLabelText('Fecha de cierre (opcional)')).toHaveValue('');
  fireEvent.click(screen.getByRole('button',{name:'Añadir'}));
  await waitFor(()=>expect(storeDataAction).toHaveBeenCalledWith(
    expect.objectContaining({category:'Resumen tarjeta 💳', selectedExpirationDate:'2026-12-10'})));
});
test('card statement shows a clear error when the payment due date is missing',async()=>{
  storeDataAction.mockClear();
  render(<TransactionHarness initialCategory='Resumen tarjeta 💳' initialExpiration='' />);
  fireEvent.click(screen.getByRole('button',{name:'Añadir'}));
  expect(await screen.findByText(/No se pudo guardar: Revisá/)).toHaveTextContent('vencimiento');
  expect(storeDataAction).not.toHaveBeenCalled();
});
