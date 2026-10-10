import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AvatarDropdown from './AvatarDropdown';
import NotificationsDropdown from './NotificationsDropdown';
import { getPopoverMotion, getPopoverTap, popoverMotion, popoverTapTransition } from '../shared/animations/popoverMotion';

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) => selector({
    database: { paymentData: { subscription: 'test' }, isPaymentDataLoading: false, categories: [] },
    auth: { user: null },
  }),
}));

jest.mock('../actionCreators/databaseActions', () => ({
  getPaymentDataAction: jest.fn(),
}));

jest.mock('../services/notificationService', () => ({
  backfillExpenseNotifications: jest.fn().mockResolvedValue(undefined),
  markNotificationRead: jest.fn().mockResolvedValue(undefined),
  pruneExpiredNotifications: jest.fn().mockResolvedValue(undefined),
  setNotificationPaymentState: jest.fn().mockResolvedValue(undefined),
  subscribeNotifications: jest.fn(() => jest.fn()),
}));

beforeAll(() => {
  // framer-motion's reduced-motion listener is not provided by jsdom.
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false, media: query, onchange: null,
      addListener: jest.fn(), removeListener: jest.fn(),
      addEventListener: jest.fn(), removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });
  }
});

test('avatar and bell use exactly the floating actions motion with a reduced-motion alternative', () => {
  expect(getPopoverMotion(false)).toBe(popoverMotion);
  expect(getPopoverMotion(false)).toEqual({
    initial: { opacity: 0, y: 8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 6, scale: 0.98 },
    transition: { duration: 0.16, ease: 'easeOut' },
  });
  expect(getPopoverTap(false)).toEqual({ scale: 0.95 });
  expect(popoverTapTransition).toEqual({ type: 'spring', stiffness: 420, damping: 28 });
  expect(getPopoverTap(true)).toBeUndefined();
  expect(getPopoverMotion(true).transition.duration).toBe(0);
});

test('account popover opens and closes using the existing button and Escape', async () => {
  render(
    <MemoryRouter>
      <AvatarDropdown user={{ displayName: 'Usuario de prueba', email: 'user@example.com' }}
        handleLogout={jest.fn()} />
    </MemoryRouter>
  );
  const trigger = screen.getByRole('button', { name: 'Abrir menú de cuenta' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('menu', { name: 'Menú de cuenta' })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await waitFor(() => expect(screen.queryByRole('menu', { name: 'Menú de cuenta' })).not.toBeInTheDocument());
});

test('notification popover opens, closes on outside pointer, and stays accessible', async () => {
  render(<MemoryRouter><NotificationsDropdown /></MemoryRouter>);
  const trigger = screen.getByRole('button', { name: 'Notificaciones' });
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('menu', { name: 'Notificaciones' })).toBeInTheDocument();
  fireEvent.pointerDown(document.body);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await waitFor(() => expect(screen.queryByRole('menu', { name: 'Notificaciones' })).not.toBeInTheDocument());
});
