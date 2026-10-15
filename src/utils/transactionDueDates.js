import { CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR } from './customCategories';

const normalizeCategoryName = (value = '') =>
	String(value)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();

const PUBLIC_SERVICE_PATTERNS = [
	/\bservicios? publicos?\b/,
	/\bluz\b/,
	/\belectricidad\b/,
	/\bgas\b/,
	/\bagua\b/,
	/\binternet\b/,
	/\btelefono\b/,
	/\btelefonia\b/,
];

export const getCategoryDefinition = (categoryName, categories = []) =>
	(categories || []).find((item) => item?.name === categoryName) || null;

export const isPublicServiceCategory = (categoryName) => {
	const normalized = normalizeCategoryName(categoryName);
	return PUBLIC_SERVICE_PATTERNS.some((pattern) => pattern.test(normalized));
};

// The shared Hogar category covers household expenses (expensas, rent, etc.)
// and optionally uses a SECOND date for payment reminders. This must not
// reinterpret the historical transaction date or alter custom-category choices.
export const isHomeCategory = (categoryName, categories = []) => {
  const definition = getCategoryDefinition(categoryName, categories);
  if (definition?.origin === 'custom' || definition?.isCustom === true) return false;
  return /^hogar(?:\s|$)/.test(normalizeCategoryName(categoryName));
};

// Versioned custom-category setting: transaction date and expiration date
// are stored independently for new categories. Hogar shares the same existing
// model without adding fields or modifying the global category collection.
export const usesSeparateDueDate = (categoryName, categories = []) =>
  getCategoryDefinition(categoryName, categories)?.dateBehavior === CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR
  || isHomeCategory(categoryName, categories);

export const usesSelectedDateAsDueDate = (categoryName, categories = []) => {
	const definition = getCategoryDefinition(categoryName, categories);
	const behavior = String(definition?.dateBehavior || '').toLowerCase();

	// Explicit separate dates take precedence even if the user's category
	// name happens to contain words like "gas" or "internet".
	if (usesSeparateDueDate(categoryName, categories)) return false;

	if (['due-date', 'due_date', 'duedate', 'vencimiento'].includes(behavior)) {
		return true;
	}

	return isPublicServiceCategory(categoryName);
};

export const getNotificationSettings = (categoryName, categories = []) => {
	const definition = getCategoryDefinition(categoryName, categories);
	const dueDateCategory = usesSelectedDateAsDueDate(categoryName, categories) || usesSeparateDueDate(categoryName, categories);
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
	if (String(category || '').includes('Resumen tarjeta') || usesSeparateDueDate(category, categories)) {
		return selectedExpirationDate || '';
	}

	return usesSelectedDateAsDueDate(category, categories) ? selectedDate || '' : '';
};
