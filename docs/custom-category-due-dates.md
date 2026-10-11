# Personal categories with due dates

LTC lets an authenticated user create a private category with an optional **Fecha de vencimiento** behavior. This is a category configuration, **not** an extra field and does **not** consume any of the three controlled `extraFieldIds` slots.

## Behavior

1. In **Transacciones → Gestionar categorías → Crear categoría**, enter a name and choose Gasto/Ingreso.
2. Check **Fecha de vencimiento** when the primary date of each transaction in this category should represent its due date.
3. LTC saves the immutable `dateBehavior: 'due-date'` field under `/users/{uid}/customCategories/{categoryId}`; unchecked categories omit it, preserving existing records.
4. The standard transaction date picker is labeled **Fecha de vencimiento** for that category. This option reuses **selectedDate**; it does not add a second independent date field. Card statement summaries keep their dedicated `selectedExpirationDate` logic.
5. When an expense is saved, `resolveTransactionDueDate` uses `selectedDate` as `dueDate`. By default `getNotificationSettings` enables reminders five days before the due date, using the current notifications pipeline. These records stay per-user.
6. The chosen behavior is fixed once the category exists. Archiving/reactivating it does not modify historical transaction data.

This option works for private categories without redefining shared/global categories or existing payment calculations. Do not use `operationDate` (controlled custom metadata) as a substitute: it has distinct meaning and does not drive reminders.

## Required Firestore rules change

**Deploy the category rules before using this option in production.** The current deployed rules may reject the new key if they allow only existing fields. Merge the relevant block from [`firestore.rules.customCategories`](../firestore.rules.customCategories) into your existing ruleset in Firebase Console; **do not replace** the whole existing ruleset, and keep other collection permissions untouched.

Within `match /users/{uid}/customCategories/{categoryId}`:

- Add `dateBehavior` to the allowed fields list.
- Require its value, if present, to be the exact literal `'due-date'`.
- Reject changes to `dateBehavior` on updates (the only permitted changes remain archive/reactivate and timestamp).

No Firestore schema migration, Storage, Cloud Functions, or paid Firebase plan is required.

## Validation matrix

- Checked and unchecked creation paths; new category shows "Con vencimiento" in its own list.
- Extra field selection still limited to three; due date is separate.
- Reload the page and select a newly created category; verify the date picker label and generated notification five days before the due date.
- Existing shared categories, currency transactions, card statements, and historical custom categories remain unchanged.
- Run `CategoryManager.test.js`, `customCategories.test.js`, `customCategoriesService.test.js`, `transactionDueDates.test.js`, `TransactionForm.test.js`, and production build.
