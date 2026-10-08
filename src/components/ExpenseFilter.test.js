import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExpenseFilter, { describeSelectedPeriod } from './ExpenseFilter';
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
    mockState.database.isFilterChanging = false;
    mockState.auth.user = null;
    rerender(<ExpenseFilter />);
    expect(screen.getByRole('button', { name: 'Todo' })).toBeDisabled();
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
