import { filterTransactions } from './transactionSearch';
import { sortTransactions } from './transactionSort';
import { visibleTransactionBatch } from './transactionsPagination';

/** Period scoping remains owned by the Redux Firestore selector. Here we apply
 * only the user-selected in-page search/category/type filters. */
export const selectScopedTransactions = (docs = [], categories = [], { query = '', category = '', type = 'all' } = {}) =>
  filterTransactions(docs || [], { query, category, type, categories: categories || [] });

/** Ordering and pagination affect rendered cards only, not filtered KPIs,
 * Lita, PDF/Excel/CSV exports, charts or currency-specific summaries. */
export const selectTransactionCards = (filteredDocs = [], { sortBy = 'date', sortDirection = 'desc', count } = {}) =>
  visibleTransactionBatch(sortTransactions(filteredDocs, sortBy, sortDirection), count);
