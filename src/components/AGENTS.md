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

## Mandatory cross-page style reuse
- `FinancialHeaderActions` owns the shared Transacciones/Bancos/Portfolio primary action, privacy toggle and secondary “Más” nav. Don't recreate its JSX separately on a financial page.
- `FINANCIAL_RECORD_DISCLOSURE_STYLES` is the shared control treatment for record details, with opaque nested `dark:bg-slate-900/70` and full 44px hit targets. Compare directly against Transactions `Card.js` before styling bank or portfolio records. See [UI contract](../../docs/financial-ui-contract.md).

## Portfolio #228 first scan
- SortablePortfolioPositionCard uses FINANCIAL_ITEM_SURFACE_STYLES (the actual Transactions surface). Preserve 44px drag handle and existing sortable/keyboard functions.
- Reuse FINANCIAL_RECORD_DISCLOSURE_STYLES with aria-expanded and conditional mounting for the secondary position metrics; keep primary balance/rate and native currency visible with privacy applied. Don't flatten different asset kinds into one mathematical model.

## Lita host and iframe boundary (#229)
- Use shared CollapsibleHeading typography, opaque LTC surfaces and 44px controls in LitaAssitantPanel. Preserve visualViewport keyboard correction, iframe identity and origin/source verification.
- Pass privacyHidden from every page: no balances, history or historic queries may cross while hidden. The sibling Lita iframe handles this status explicitly.
- Before acknowledging a conversation deletion, await deleteLitaChat(uid,id); never report success optimistically. Document the LTC-first deployment order in [Lita UX](../../docs/lita-ux-229.md).

## Portfolio Detail #228
- `src/pages/PortfolioDetail.js` renders **actual** `QuickAccessCard` and `CollapsibleSection` from Transactions; its historic records reuse `FINANCIAL_ITEM_SURFACE_STYLES`, no custom wrapper lookalike.
- In account detail, mask CBU, alias, account number, routing and SWIFT in the DOM until the user explicitly shows each. Expose copy only when shown and remask on section close or position change. Use ≥44px targets and visible focus; preserve FCI NAV vs realized gains.

## Pending imported bank statements (#227)
`PendingStatementLinkCard` must reuse shared Transactions `FINANCIAL_ITEM_SURFACE_STYLES`/`FINANCIAL_RECORD_DISCLOSURE_STYLES` and `GenericModal`. Auto-matching is a suggestion ONLY; require user selection and explicit confirmation, an in-flight ref guard and a confirmed owner-scoped `saveStatementBankLink`. Do not import another PDF or create a Transactions expense as a side effect. Preserve ARS/USD separation, true close/due dates, privacy masking and retryable Firestore errors. See [Banks phase 3](../../docs/banks-issue-227-phase3.md).
