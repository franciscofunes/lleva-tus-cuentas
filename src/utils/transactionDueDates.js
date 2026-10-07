const normalizeCategoryName = (value = '') =>
	String(value)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();

const PUBLIC_SERVICE_HINTS = [
	'servicio publico',
	'servicios publicos',
	'luz',
	'electricidad',
	'gas',
	'agua',
	'internet',
	'telefono',
	'telefonia',
];

export const getCategoryDefinition = (categoryName, categories = []) =>
	(categories || []).find((item) => item?.name === categoryName) || null;

export const isPublicServiceCategory = (categoryName) => {
	const normalized = normalizeCategoryName(categoryName);
	return PUBLIC_SERVICE_HINTS.some((hint) => normalized.includes(hint));
};

export const usesSelectedDateAsDueDate = (categoryName, categories = []) => {
	const definition = getCategoryDefinition(categoryName, categories);
	const behavior = String(definition?.dateBehavior || '').toLowerCase();

	if (['due-date', 'due_date', 'duedate', 'vencimiento'].includes(behavior)) {
		return true;
	}

	return isPublicServiceCategory(categoryName);
};

export const getNotificationSettings = (categoryName, categories = []) => {
	const definition = getCategoryDefinition(categoryName, categories);
	const dueDateCategory = usesSelectedDateAsDueDate(categoryName, categories);
	const configuredLeadDays = Number(definition?.notificationLeadDays);
	const leadDays = Number.isFinite(configuredLeadDays)
		? Math.max(0, Math.min(60, configuredLeadDays))
		: 5;

	return {
		enabled:
			typeof definition?.notificationsEnabled === 'boolean'
				? definition.notificationsEnabled
				: dueDateCategory,
		leadDays,
	};
};

export const resolveTransactionDueDate = ({
	category,
	categories = [],
	selectedDate,
	selectedExpirationDate,
}) => {
	if (String(category || '').includes('Resumen tarjeta')) {
		return selectedExpirationDate || '';
	}

	return usesSelectedDateAsDueDate(category, categories) ? selectedDate || '' : '';
};
