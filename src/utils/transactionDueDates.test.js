import {
	getNotificationSettings,
  hasExplicitCategoryDueDate,
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

describe('controlled service due dates', () => {
  const categories = [
    { name: 'Servicio Telefonía', extraFieldIds: ['dueDate', 'serviceAccount', 'billingPeriod'] },
    { name: 'Internet' },
  ];
  test('configured service separates operation date and payable due date', () => {
    expect(hasExplicitCategoryDueDate('Servicio Telefonía', categories)).toBe(true);
    expect(usesSelectedDateAsDueDate('Servicio Telefonía', categories)).toBe(false);
    expect(resolveTransactionDueDate({
      category: 'Servicio Telefonía', categories,
      selectedDate: '2026-10-10', selectedExpirationDate: '2026-10-25',
    })).toBe('2026-10-25');
    expect(getNotificationSettings('Servicio Telefonía', categories))
      .toEqual({ enabled: true, leadDays: 5 });
  });

  test('empty due date does not create a reminder', () => {
    expect(resolveTransactionDueDate({
      category: 'Servicio Telefonía', categories,
      selectedDate: '2026-10-10', selectedExpirationDate: '',
    })).toBe('');
  });

  test('existing service categories without configured date still use the original behavior', () => {
    expect(usesSelectedDateAsDueDate('Internet', categories)).toBe(true);
    expect(resolveTransactionDueDate({
      category: 'Internet', categories, selectedDate: '2026-10-10', selectedExpirationDate: '',
    })).toBe('2026-10-10');
  });
});
