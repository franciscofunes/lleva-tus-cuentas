import {
	getNotificationSettings,
	isPublicServiceCategory,
  isHomeCategory,
	resolveTransactionDueDate,
	usesSelectedDateAsDueDate,
	usesSeparateDueDate,
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

describe('new separate expiration date behavior', () => {
  const categories = [
    { name: 'Alquiler mensual', isExpense: true, dateBehavior: 'separate-due-date', origin: 'custom' },
    { name: 'Internet oficina', isExpense: true, dateBehavior: 'separate-due-date', origin: 'custom' },
    { name: 'Servicio heredado', isExpense: true, dateBehavior: 'due-date', origin: 'custom' },
  ];

  test('does not reinterpret mandatory transaction date as expiration', () => {
    expect(usesSeparateDueDate('Alquiler mensual', categories)).toBe(true);
    expect(usesSelectedDateAsDueDate('Alquiler mensual', categories)).toBe(false);
    expect(resolveTransactionDueDate({
      category: 'Alquiler mensual', categories,
      selectedDate: '2026-10-10', selectedExpirationDate: '2026-10-20',
    })).toBe('2026-10-20');
    expect(getNotificationSettings('Alquiler mensual', categories)).toEqual({ enabled: true, leadDays: 5 });
  });

  test('never generates a reminder when the optional due date is not provided', () => {
    expect(resolveTransactionDueDate({
      category: 'Alquiler mensual', categories,
      selectedDate: '2026-10-10', selectedExpirationDate: '',
    })).toBe('');
  });

  test('explicit separate-date setting wins over public-service names', () => {
    expect(usesSelectedDateAsDueDate('Internet oficina', categories)).toBe(false);
    expect(resolveTransactionDueDate({
      category: 'Internet oficina', categories,
      selectedDate: '2026-10-10', selectedExpirationDate: '2026-10-25',
    })).toBe('2026-10-25');
  });

  test('existing legacy categories continue using selectedDate as due date', () => {
    expect(usesSelectedDateAsDueDate('Servicio heredado', categories)).toBe(true);
    expect(resolveTransactionDueDate({
      category: 'Servicio heredado', categories,
      selectedDate: '2026-10-18', selectedExpirationDate: '2026-10-30',
    })).toBe('2026-10-18');
  });
});

describe('shared Hogar: optional expiration and the existing reminder pipeline', () => {
  const categories = [
    { id: 'home', name: 'Hogar 🏡', origin: 'shared', active: true, isExpense: true },
    { id: 'salary', name: 'Salario', origin: 'shared', isExpense: false },
    { id: 'custom-home', name: 'Hogar oficina', origin: 'custom', isCustom: true, isExpense: true },
  ];

  test('shared Hogar keeps the historical movement date separate from optional due dates', () => {
    expect(isHomeCategory('Hogar 🏡', categories)).toBe(true);
    expect(isHomeCategory('Hogar oficina', categories)).toBe(false);
    expect(usesSeparateDueDate('Hogar 🏡', categories)).toBe(true);
    expect(usesSelectedDateAsDueDate('Hogar 🏡', categories)).toBe(false);
    expect(resolveTransactionDueDate({
      category: 'Hogar 🏡', categories,
      selectedDate: '2026-10-19', selectedExpirationDate: '2026-10-25',
    })).toBe('2026-10-25');
    expect(getNotificationSettings('Hogar 🏡', categories)).toEqual({
      enabled: true, leadDays: 5,
    });
  });

  test('old Hogar transactions without a due date never acquire an alert implicitly', () => {
    expect(resolveTransactionDueDate({
      category: 'Hogar 🏡', categories,
      selectedDate: '2026-10-19', selectedExpirationDate: '',
    })).toBe('');
    expect(usesSeparateDueDate('Salario', categories)).toBe(false);
    expect(usesSeparateDueDate('Hogar oficina', categories)).toBe(false);
  });
});
