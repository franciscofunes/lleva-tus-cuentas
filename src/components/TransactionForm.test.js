import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
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
jest.mock('./CardStatementPdfReview', () => () => null);
jest.mock('./InfoTooltip', () => () => null);

const initialCategories = [
  { id: 'transport', name: 'Transporte 🚌', isExpense: true, active: true },
  { id: 'salary', name: 'Salario 💲', isExpense: false, active: true },
  { id: 'freelance', name: 'Freelance', isExpense: false, active: true,
    extraFieldIds: ['reference', 'paymentMethod'], origin: 'custom', isCustom: true },
];

function TransactionHarness({ initialCategory = 'Transporte 🚌', onCategoryFlags = {} }) {
  const [category, setCategory] = useState(initialCategory);
  const [customDetails, setCustomDetails] = useState({});
  const [name, setName] = useState('Taxi de regreso');
  const [openManager, setOpenManager] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const noop = () => {};
  return (
    <>
      <TransactionForm
        name={name} setName={setName}
        amount='2500' setAmount={noop}
        comment='Viaje' setComment={noop}
        category={category} setCategory={setCategory}
        customDetails={customDetails} setCustomDetails={setCustomDetails}
        selectedDate='2026-10-10' setSelectedDate={noop}
        selectedExpirationDate='' setSelectedExpirationDate={noop}
        selectedCloseDate='' setSelectedCloseDate={noop}
        currencyQuantity='' setCurrencyQuantity={noop}
        currencyExchangeRate='' setCurrencyExchangeRate={noop}
        isCreditCardCategory={false}
        isBuyCurrenciesCategory={false}
        isCurrencyIncomeCategory={false}
        isSellCurrenciesCategory={false}
        setIsCreditCardCategory={onCategoryFlags.credit || noop}
        setIsBuyCurrenciesCategory={onCategoryFlags.buy || noop}
        setIsCurrencyIncomeCategory={onCategoryFlags.income || noop}
        setIsSellCurrenciesCategory={onCategoryFlags.sell || noop}
        setIsOpen={noop} setEdit={noop}
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
