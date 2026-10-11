# Personal categories with an optional expiration date

Every LTC transaction already has a required **Fecha de transacción** (`selectedDate`). Adding **Fecha de vencimiento** to a new personal category introduces a **second, optional** date (`selectedExpirationDate`). The due date does not replace the transaction date or count toward the three controlled custom metadata fields.

## New categories (separate-due-date)

1. Go to **Transacciones → Gestionar categorías → Crear categoría**.
2. Select **Fecha de vencimiento** when that category needs an additional expiration date. This applies to expenses and incomes.
3. LTC saves the immutable configuration `dateBehavior: 'separate-due-date'` in `users/{uid}/customCategories/{categoryId}`.
4. When recording transactions in that category, LTC keeps the required **Fecha de transacción** and displays **Fecha de vencimiento (opcional)** separately.
5. LTC persists `selectedExpirationDate` only if entered and derives the existing `dueDate` from it. If there is no expiration date, no new notification is generated.
6. If populated, existing reminders default to **5 days before expiration**, respecting existing dismissal/payment logic. No new cloud service or billing plan is required.
7. Switching categories clears an unsaved expiration date so it cannot leak to another transaction type.

## Existing categories and historical records

- Categories created under the first version using `dateBehavior: 'due-date'` keep their old semantics: their `selectedDate` is the due date. Do not reinterpret their historical dates or automatically migrate them.
- Shared public-service categories still follow their existing `selectedDate` rules.
- Credit card summaries continue using their dedicated expiration and closing dates.
- Ordinary personal categories (no `dateBehavior`) retain only the standard required transaction date.
- Category configuration is immutable after creation; archiving/reactivation retains it.

## Firestore security: manual step

The custom category Firestore rule snippet in [`firestore.rules.customCategories`](../firestore.rules.customCategories) now permits only the literal values `'due-date'` (legacy) and `'separate-due-date'` (new). Both remain immutable. **Merge this change into the existing deployed ruleset before creating a new category of this type.** Do not replace unrelated rules, including Lita, portfolio, transactions or notifications.

The transaction model already supports the `selectedExpirationDate` and `dueDate` fields; review your deployed expenses rules for any stricter custom allowlist. No Firebase Storage, Functions or paid plan is needed.

## Regression checklist

- Normal category: only mandatory transaction date.
- New separate-due-date category: transaction date + optional expiration date, each persisting separately and displaying on card.
- No optional date: no due-date notification.
- Category switch: stale optional date is cleared.
- Legacy due-date category: continues using the original date as expiration.
- Credit card summaries, FX, payment statuses, custom category extra fields: unaffected.
- Verify mobile light and dark mode, CI, Netlify preview and deployed production commit.
