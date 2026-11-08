import { getCategoryExtraFields } from './categoryExtraFields';
import { sanitizeReceiptDetails } from './receiptDetails';

/** Suggest only configured fields. Category selection stays owned by the user. */
export function receiptCategorySuggestions(categoryDefinition, receiptDetails, merchant, date, paymentMethod) {
  const allowed = new Set(getCategoryExtraFields(categoryDefinition).map((field) => field.id));
  const document = sanitizeReceiptDetails(receiptDetails)?.documents?.[0];
  const candidates = {
    reference: document?.operationNumber || document?.authorizationCode || '',
    counterparty: merchant || '',
    paymentMethod: paymentMethod || '',
    receiptNumber: document?.number || document?.operationNumber || '',
    operationDate: date || document?.issuedAt || '',
  };
  return Object.fromEntries(Object.entries(candidates).filter(([key, value]) => allowed.has(key) && value));
}
