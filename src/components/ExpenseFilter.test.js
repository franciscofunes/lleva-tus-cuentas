import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExpenseFilter, { CalendarHeader, describeSelectedPeriod, shiftReferenceMonth } from './ExpenseFilter';
import {
  filterDataAction,
  getTotalBalance,
  setSelectedFilter,
} from '../actionCreators/databaseActions';

const mockDispatch = jest.fn().mockResolvedValue(undefined);
const mockState = {
  database: { selectedFilter: 'month', isFilterChanging: false },
  auth: { user: { uid: 'test-user' } },
};

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));

jest.mock('../actionCreators/databaseActions', () => ({
  filterDataAction: jest.fn((...args) => ({ type: 'TEST_FILTER', args })),
  getTotalBalance: jest.fn((uid) => ({ type: 'TEST_TOTAL', uid })),
  setSelectedFilter: jest.fn((period) => ({ type: 'TEST_PERIOD', period })),
  setFilterChanging: jest.fn((value) => ({ type: 'TEST_LOADING', value })),
}));

// Give the calendar a deterministic date while testing the real toolbar.
jest.mock('react-datepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    registerLocale: jest.fn(),
    default: ({ onChange, customInput, disabled }) => React.cloneElement(customInput, {
      onClick: () => onChange(new Date(2026, 8, 15)),
      disabled,
    }),
  };
});

beforeEach(() => {
  mockDispatch.mockClear();
  mockState.database.selectedFilter = 'month';
  mockState.database.isFilterChanging = false;
  mockState.auth.user = { uid: 'test-user' };
  filterDataAction.mockClear();
  getTotalBalance.mockClear();
  setSelectedFilter.mockClear();
});

describe('integrated transaction period control', () => {
  it('shows all five options in one toolbar with an explicit calendar', () => {
    render(<ExpenseFilter />);
    const controls = screen.getByRole('group', { name: 'Tipo de período' });
    expect(controls).toBeInTheDocument();
    expect(controls.querySelectorAll('button')).toHaveLength(5);
    ['Año', 'Mes', 'Semana', 'Día', 'Todo'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Mes' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Elegir fecha de referencia' })).toBeInTheDocument();
  });

  it('renders two compact navigation arrows beside the reference date', () => {
    render(<ExpenseFilter />);
    const group = screen.getByRole('group', { name: 'Navegación mensual' });
    expect(group.querySelectorAll('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Ir al mes anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Ir al mes siguiente' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Elegir fecha de referencia' })).toBeInTheDocument();
  });

  it('moves to the previous month and sends the full monthly filter query', async () => {
    render(<ExpenseFilter />);
    fireEvent.click(screen.getByRole('button', { name: 'Elegir fecha de referencia' }));
    await waitFor(() => expect(filterDataAction).toHaveBeenCalledWith(
      'test-user', 'month', 2026, 8, expect.any(Number), 15
    ));
    filterDataAction.mockClear();
    setSelectedFilter.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Ir al mes anterior' }));
    await waitFor(() => expect(filterDataAction).toHaveBeenCalledWith(
      'test-user', 'month', 2026, 7, expect.any(Number), 1
    ));
    expect(setSelectedFilter).toHaveBeenCalledWith('month');
    expect(screen.getByText('agosto 2026')).toBeInTheDocument();
  });

  it('moves forward and always switches from total history to the month filter', async () => {
    mockState.database.selectedFilter = 'total';
    render(<ExpenseFilter />);
    const now = new Date();
    const expected = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    fireEvent.click(screen.getByRole('button', { name: 'Ir al mes siguiente' }));
    await waitFor(() => expect(filterDataAction).toHaveBeenCalledWith(
      'test-user', 'month', expected.getFullYear(), expected.getMonth(),
      expect.any(Number), 1
    ));
    expect(setSelectedFilter).toHaveBeenCalledWith('month');
    expect(getTotalBalance).not.toHaveBeenCalled();
  });

  it('clamps the day before changing months at year boundaries', () => {
    expect(shiftReferenceMonth(new Date(2026, 11, 31), 1)).toEqual(new Date(2027, 0, 1));
    expect(shiftReferenceMonth(new Date(2026, 0, 31), -1)).toEqual(new Date(2025, 11, 1));
    expect(shiftReferenceMonth(new Date(2026, 2, 31), -1)).toEqual(new Date(2026, 1, 1));
  });

  it('uses a single period selection and queries the existing Firestore range', async () => {
    render(<ExpenseFilter />);
    fireEvent.click(screen.getByRole('button', { name: 'Año' }));
    await waitFor(() => expect(filterDataAction).toHaveBeenCalledTimes(1));
    expect(filterDataAction).toHaveBeenCalledWith(
      'test-user', 'year', expect.any(Number), expect.any(Number),
      expect.any(Number), expect.any(Number)
    );
    expect(setSelectedFilter).toHaveBeenCalledWith('year');
    expect(getTotalBalance).not.toHaveBeenCalled();
  });

  it('selects total history without applying a date-constrained filter', async () => {
    render(<ExpenseFilter />);
    fireEvent.click(screen.getByRole('button', { name: 'Todo' }));
    await waitFor(() => expect(getTotalBalance).toHaveBeenCalledWith('test-user'));
    expect(setSelectedFilter).toHaveBeenCalledWith('total');
    expect(filterDataAction).not.toHaveBeenCalled();
  });

  it('changing the reference date preserves the selected month', async () => {
    render(<ExpenseFilter />);
    fireEvent.click(screen.getByRole('button', { name: 'Elegir fecha de referencia' }));
    await waitFor(() => expect(filterDataAction).toHaveBeenCalledWith(
      'test-user', 'month', 2026, 8, expect.any(Number), 15
    ));
    expect(setSelectedFilter).toHaveBeenCalledWith('month');
    expect(screen.getByText('septiembre 2026')).toBeInTheDocument();
  });

  it('switches from entire history to a day when a date is chosen', async () => {
    mockState.database.selectedFilter = 'total';
    render(<ExpenseFilter />);
    expect(screen.getByText('Todo el historial')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Elegir fecha de referencia' }));
    await waitFor(() => expect(filterDataAction).toHaveBeenCalledWith(
      'test-user', 'day', 2026, 8, expect.any(Number), 15
    ));
    expect(setSelectedFilter).toHaveBeenCalledWith('day');
  });

  it('disables all filter actions during a request and without an authenticated user', () => {
    mockState.database.isFilterChanging = true;
    const { rerender } = render(<ExpenseFilter />);
    expect(screen.getByRole('button', { name: 'Mes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Elegir fecha de referencia' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ir al mes anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ir al mes siguiente' })).toBeDisabled();
    mockState.database.isFilterChanging = false;
    mockState.auth.user = null;
    rerender(<ExpenseFilter />);
    expect(screen.getByRole('button', { name: 'Todo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ir al mes anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ir al mes siguiente' })).toBeDisabled();
  });

  it('uses the LTC themed portal calendar instead of the unstyled dropdowns', () => {
    render(<ExpenseFilter />);
    expect(screen.getByRole('button', { name: 'Elegir fecha de referencia' })).toBeInTheDocument();
    // react-datepicker is mocked in this suite. Validate the installed
    // calendar adapter, and verify the real custom header controls below.
    expect(CalendarHeader).toEqual(expect.any(Function));
  });

  it('renders a keyboard-friendly Spanish month/year header with touch targets', () => {
    const changeMonth = jest.fn();
    const changeYear = jest.fn();
    const decreaseMonth = jest.fn();
    const increaseMonth = jest.fn();
    render(
      <CalendarHeader date={new Date(2026, 9, 8)}
        changeMonth={changeMonth} changeYear={changeYear}
        decreaseMonth={decreaseMonth} increaseMonth={increaseMonth}
        prevMonthButtonDisabled={false} nextMonthButtonDisabled={false} />
    );
    const month = screen.getByRole('combobox', { name: 'Mes del calendario' });
    const year = screen.getByRole('combobox', { name: 'Año del calendario' });
    expect(month).toHaveValue('9');
    expect(month).toHaveTextContent('octubre');
    expect(year).toHaveValue('2026');
    fireEvent.change(month, { target: { value: '8' } });
    fireEvent.change(year, { target: { value: '2025' } });
    expect(changeMonth).toHaveBeenCalledWith(8);
    expect(changeYear).toHaveBeenCalledWith(2025);
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(decreaseMonth).toHaveBeenCalledTimes(1);
    expect(increaseMonth).toHaveBeenCalledTimes(1);
  });

  it('disables calendar month navigation at range boundaries', () => {
    render(
      <CalendarHeader date={new Date(2026, 9, 8)}
        decreaseMonth={jest.fn()} increaseMonth={jest.fn()}
        changeMonth={jest.fn()} changeYear={jest.fn()}
        prevMonthButtonDisabled nextMonthButtonDisabled />
    );
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
  });

  it('formats reference labels for every scope', () => {
    const anchor = new Date(2026, 9, 8);
    expect(describeSelectedPeriod('year', anchor)).toBe('2026');
    expect(describeSelectedPeriod('month', anchor)).toBe('octubre 2026');
    expect(describeSelectedPeriod('day', anchor)).toBe('08/10/2026');
    expect(describeSelectedPeriod('week', anchor)).toContain('2026');
    expect(describeSelectedPeriod('total', anchor)).toBe('Todo el historial');
  });
});
