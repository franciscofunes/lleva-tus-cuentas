import {
	MAX_OVERDUE_NOTIFICATION_DAYS,
	daysUntilDueDate,
	isExpiredReminder,
	isVisibleReminder,
} from './notificationLifecycle';

describe('notification lifecycle', () => {
	const now = new Date('2026-10-07T12:00:00');

	test('shows reminders inside the configured lead window', () => {
		expect(isVisibleReminder('2026-10-12', 5, now)).toBe(true);
		expect(isVisibleReminder('2026-10-13', 5, now)).toBe(false);
	});

	test('keeps overdue reminders visible for at most 10 days', () => {
		expect(MAX_OVERDUE_NOTIFICATION_DAYS).toBe(10);
		expect(isVisibleReminder('2026-09-27', 5, now)).toBe(true);
		expect(isVisibleReminder('2026-09-26', 5, now)).toBe(false);
	});

	test('marks very old reminders as expired', () => {
		expect(isExpiredReminder('2022-12-07', now)).toBe(true);
		expect(isExpiredReminder('2026-10-01', now)).toBe(false);
	});

	test('calculates local-day distance without including the clock time', () => {
		expect(daysUntilDueDate('2026-10-07', now)).toBe(0);
		expect(daysUntilDueDate('2026-10-08', now)).toBe(1);
		expect(daysUntilDueDate('2026-10-06', now)).toBe(-1);
	});
});
