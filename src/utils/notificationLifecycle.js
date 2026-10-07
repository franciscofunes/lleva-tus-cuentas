export const MAX_OVERDUE_NOTIFICATION_DAYS = 10;
export const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const asLocalDate = (value) => {
	if (!value) return null;
	const date = new Date(`${value}T00:00:00`);
	return Number.isNaN(date.getTime()) ? null : date;
};

export const daysUntilDueDate = (value, now = new Date()) => {
	const due = asLocalDate(value);
	if (!due) return Number.POSITIVE_INFINITY;

	const today = new Date(now);
	today.setHours(0, 0, 0, 0);

	return Math.round((due.getTime() - today.getTime()) / DAY_IN_MS);
};

export const isExpiredReminder = (dueDate, now = new Date()) =>
	daysUntilDueDate(dueDate, now) < -MAX_OVERDUE_NOTIFICATION_DAYS;

export const isVisibleReminder = (
	dueDate,
	leadDays = 5,
	now = new Date()
) => {
	const days = daysUntilDueDate(dueDate, now);
	const normalizedLeadDays = Number.isFinite(Number(leadDays))
		? Number(leadDays)
		: 5;

	return (
		Number.isFinite(days) &&
		days >= -MAX_OVERDUE_NOTIFICATION_DAYS &&
		days <= normalizedLeadDays
	);
};
