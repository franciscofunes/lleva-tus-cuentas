// Keep mobile route transitions responsive even with multi-year histories.
// Only the rendered cards are batched; summaries, filters and exports still
// consume the complete filtered result set.
export const TRANSACTION_PAGE_SIZE = 40;

export const visibleTransactionBatch = (transactions = [], limit = TRANSACTION_PAGE_SIZE) => {
  if (!Array.isArray(transactions)) return [];
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : TRANSACTION_PAGE_SIZE;
  return transactions.slice(0, safeLimit);
};
