# LTC Components — Scoped Agent Rules

These apply to every component in this directory. Follow the repo-wide [AGENTS.md](../../AGENTS.md) and [UI guidelines](../../docs/ui-design-guidelines.md).

## Visual hierarchy and dark mode
- For transaction cards, use an opaque card surface: `bg-white dark:bg-slate-800`, with `border-slate-200 dark:border-slate-700`.
- Nested transaction information may use `bg-slate-50 dark:bg-slate-900/70`; do not use semitransparent light overlays as the card background.
- Primary text `text-slate-900 dark:text-slate-50`; secondary text `text-slate-700 dark:text-slate-200`; muted text `text-slate-600 dark:text-slate-300`.
- LTC labels use violet with contrast: `text-violet-700 dark:text-violet-200`. Expense amounts retain red/rose and incoming amounts green/emerald. Do not use color alone to explain the sign or currency.
- Use coherent rounded corners, 44px action buttons, visible focus rings and wrapping for long values.
- The card component uses `ltc-transaction-card` plus an `html.dark` fallback in `src/index.css`. If you change a card background, update/test both rules.

## Conditional transaction content: preserve without exception
`Card.js` renders more than ordinary expenses. Retain all existing conditions and actions when changing styling:
- Credit-card summaries: closing date, due date and `CardStatementDetails` with its linked items.
- Foreign-currency purchase/sale/income fields: quantity, exchange rate and proper ARS/USD labels.
- Services: category-controlled due-date behavior, payment state and paid-at/due-at dates.
- Custom categories: `displayTransactionCustomDetails` and safe long text.
- Edit/delete handlers and the data populated in editing forms.

Update `Card.test.js` alongside card changes, including dark theme classes and conditional content checks. Do not alter saved monetary values, categories or Firestore rules for a style-only request.

## Date semantics for personal categories

All transactions retain the required `selectedDate`. Do not confuse that with a deadline.
- Existing `dateBehavior: 'due-date'` categories are **legacy**: they interpret `selectedDate` as the due date. Preserve historical records.
- New `dateBehavior: 'separate-due-date'` categories retain the transaction date and can supply a **separate optional** `selectedExpirationDate` (already supported by the transaction model).
- `resolveTransactionDueDate` must derive `dueDate` from `selectedExpirationDate` for the new behavior, and from `selectedDate` for the legacy behavior.
- No expiration entered means no reminder. Never silently copy the transaction date to the expiration field.
- Credit-card summaries continue using their existing dedicated closing/expiration controls.
- Confirm dates are distinct on the form, transaction card, saved data, and dark-mode mobile UI; do not merge or rename these fields without a deliberate migration.

## Custom category editing (safe rename)
- Never rewrite users' `expenses` collection or rename the canonical `category.name` merely to edit a label.
- Only personal categories can edit `displayName`; keep the original `name`, type, extra field selection, expiration behavior and document ID immutable.
- Render `displayName || name` for user-facing labels; retain `name` as the option value / Firestore financial classification.
- Verify search, filters, charts, exports and historical transaction editor all display the new label without changing the underlying category.
- Update `docs/custom-category-editing.md`, scoped Firestore rules and regression tests when editing category behavior.

## Progressive disclosure for transaction cards (issue #225)
- Preserve the first-scan movement name, full native-currency amount/sign, category, transaction date or due date, any separate/card-statement due date, and visible paid state.
- Comments, additional fields, currency-purchase quantity/rate, card closing date, paid-at details and card-statement PDF consumption drilldowns belong in a per-card labeled disclosure with `aria-expanded` and `aria-controls`. Mount PDF drilldown only when expanded to avoid unnecessary Firestore work.
- Hide custom fields and linked PDF details in privacy mode, including when a disclosure remains open. Do not hide or modify monetary data in Firestore, exports or reporting scope.
- Individual cards must expand independently; keep edit/delete actions visible with accessible 44px targets and recheck all conditional categories after any styling changes.

## Bank consumptions and confirmation dialogs (issue #227)
- Keep the add-bank primary action labeled at phone widths; don't replace it with an unlabelled plus glyph.
- Removing a manual bank card consumption must always show `DeleteBankChargeDialog` before any deletion write. Only the owning user's `deleteManualCardCharge(uid, id)` is allowed after explicit confirmation. Never cascade into statement PDFs, linked imports or a Transactions record.
- Hide the amount in the confirmation while bank privacy is active, including after errors. Keep keyboard focus trapping, Escape, 44px targets, pending double-tap lock and retry-on-failure tests.
- Reuse the existing `QuickAccessCard`, `CollapsibleSection`, `FINANCIAL_ITEM_SURFACE_STYLES` and semantic ARS/USD labels; don't change Firestore rules for this UI.
