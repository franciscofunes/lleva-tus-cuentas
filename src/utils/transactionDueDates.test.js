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

describe('personal category due-date option', () => {
  const custom = [
    { name: 'Alquiler oficina', isExpense: true, origin: 'custom', isCustom: true, dateBehavior: 'due-date' },
    { name: 'Papelería', isExpense: true, origin: 'custom', isCustom: true },
  ];

  test('uses the existing date field as due date for opted-in custom category and enables reminders', () => {
    expect(usesSelectedDateAsDueDate('Alquiler oficina', custom)).toBe(true);
    expect(resolveTransactionDueDate({
      category: 'Alquiler oficina', categories: custom,
      selectedDate: '2026-11-10', selectedExpirationDate: '',
    })).toBe('2026-11-10');
    expect(getNotificationSettings('Alquiler oficina', custom)).toEqual({ enabled: true, leadDays: 5 });
  });

  test('leaves ordinary new custom categories as transaction dates without reminders', () => {
    expect(usesSelectedDateAsDueDate('Papelería', custom)).toBe(false);
    expect(resolveTransactionDueDate({
      category: 'Papelería', categories: custom,
      selectedDate: '2026-11-10', selectedExpirationDate: '',
    })).toBe('');
    expect(getNotificationSettings('Papelería', custom).enabled).toBe(false);
  });

  test('credit card summaries continue using their dedicated expiration date', () => {
    expect(resolveTransactionDueDate({
      category: 'Resumen tarjeta 💳', categories: custom,
      selectedDate: '2026-10-20', selectedExpirationDate: '2026-11-15',
    })).toBe('2026-11-15');
  });
});
