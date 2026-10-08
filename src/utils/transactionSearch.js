const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR')
    .trim()
    .replace(/\s+/g, ' ');

const dateSearchText = (value) => {
  if (!value) return '';
  let date = value;
  if (typeof value.toDate === 'function') {
    date = value.toDate();
  }
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return [day + '/' + month + '/' + year, year + '-' + month + '-' + day].join(' ');
  }
  const text = String(date);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? text + ' ' + iso[3] + '/' + iso[2] + '/' + iso[1] : text;
};

const amountSearchText = (value) => {
  if (value === undefined || value === null || value === '') return '';
  const raw = String(value);
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return raw;

  // Display both source and locale formats without changing transaction values.
  return raw + ' ' + numeric.toLocaleString('es-AR', {
    useGrouping: true,
    maximumFractionDigits: 6,
  }) + ' ' + numeric.toLocaleString('en-US', {
    useGrouping: true,
    maximumFractionDigits: 6,
  });
};

export const normalizeTransactionSearch = normalize;

export const filterTransactions = (transactions = [], options = {}) => {
  const {
    query = '',
    category = '',
    type = 'all',
    categories = [],
  } = options;
  const terms = normalize(query).split(' ').filter(Boolean);
  const selectedCategory = normalize(category);
  const expenses = new Set(
    categories.filter((item) => item?.isExpense === true).map((item) => normalize(item.name))
  );
  const incomes = new Set(
    categories.filter((item) => item?.isExpense === false).map((item) => normalize(item.name))
  );

  return (transactions || []).filter((item) => {
    const transactionCategory = normalize(item.category);
    if (selectedCategory && transactionCategory !== selectedCategory) return false;
    if (type === 'expense' && !expenses.has(transactionCategory)) return false;
    if (type === 'income' && !incomes.has(transactionCategory)) return false;
    if (!terms.length) return true;

    // Match all words regardless of their order or which field contains them.
    const searchable = normalize([
      item.expenseName,
      item.name,
      item.category,
      item.comment,
      item.importInstitution,
      item.importSource,
      dateSearchText(item.selectedDate),
      dateSearchText(item.selectedExpirationDate),
      dateSearchText(item.selectedCloseDate),
      dateSearchText(item.dueDate),
      amountSearchText(item.amount),
      amountSearchText(item.currencyQuantity),
      amountSearchText(item.currencyExchangeRate),
    ].join(' '));

    return terms.every((term) => searchable.includes(term));
  });
};
