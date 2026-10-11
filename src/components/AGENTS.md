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
