import {
	getNotificationSettings,
	isPublicServiceCategory,
	resolveTransactionDueDate,
	usesSelectedDateAsDueDate,
} from './transactionDueDates';

describe('transaction due-date helpers', () => {
	test('uses category metadata to turn selectedDate into a due date', () => {
		const categories = [
			{
				name: 'Expensas',
				dateBehavior: 'due-date',
				notificationsEnabled: true,
				notificationLeadDays: 3,
			},
		];

		expect(usesSelectedDateAsDueDate('Expensas', categories)).toBe(true);
		expect(getNotificationSettings('Expensas', categories)).toEqual({
			enabled: true,
			leadDays: 3,
		});
	});

	test('recognizes public-service categories without matching unrelated words', () => {
		expect(isPublicServiceCategory('Servicios públicos')).toBe(true);
		expect(isPublicServiceCategory('Gas')).toBe(true);
		expect(isPublicServiceCategory('Internet hogar')).toBe(true);
		expect(isPublicServiceCategory('Gastronomía')).toBe(false);
	});

	test('uses the credit-card expiration date as its reminder date', () => {
		expect(
			resolveTransactionDueDate({
				category: 'Resumen tarjeta 💳',
				selectedDate: '2026-10-01',
				selectedExpirationDate: '2026-10-13',
			})
		).toBe('2026-10-13');
	});

	test('uses selectedDate for due-date categories', () => {
		expect(
			resolveTransactionDueDate({
				category: 'Servicios públicos',
				selectedDate: '2026-10-20',
				selectedExpirationDate: '',
			})
		).toBe('2026-10-20');
	});
});
