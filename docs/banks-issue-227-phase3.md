# Banks UX #227 — Phase 3: safe imported-statement association

**Design authority:** Transacciones. This phase refactors the imported PDF *pending association* experience inside the signed-in `/bancos` page without creating another banking UI language, expense, consumption, PDF or account balance.

## What changed

- The large, always-expanded `unlinked.map` JSX in `src/pages/Banks.js` is now a small reusable `PendingStatementLinkCard`. The rendered card uses **the exact** `FINANCIAL_ITEM_SURFACE_STYLES`, shared eyebrow typography and `FINANCIAL_RECORD_DISCLOSURE_STYLES` from Transacciones. Do not duplicate these Tailwind tokens in individual banking pages.
- First scan: institution, card brand, imported statement period, close/due dates, *separate* ARS and USD totals (masked when the account's privacy toggle is off), and a labeled **Revisar vínculo** control. Expanded options, linked PDF line items, matching hints and bank/card selection are mounted only on demand.
- An automatically proposed matching card is **never auto-selected or saved**: the owner explicitly clicks **Usar sugerencia** or chooses a bank and a card. Choosing another bank clears the old card. Archived banks are excluded. Card options are constrained to the chosen bank.
- Review is an explicit intermediate action; the existing shared `GenericModal` opens a focused 44px confirmation with the **imported period / brand** and the **selected bank / nickname / last four digits**. Cancel and Escape leave the selection intact; the owner must select **Confirmar vínculo** to submit.
- A synchronous in-flight ref guards double submissions before React can rerender the disabled state. The callback awaits the actual `saveStatementBankLink(uid, expenseId, bankId, cardId)` write; on Firestore failures, keep the confirmation and selection, show a safe error with retry, and do **not** expose raw Firestore paths/codes.
- The only mutation is the existing, separately stored **bankStatementLinks** association. No calls to `storeDataAction`, `saveReviewedStatement`, or `saveManualCardCharge` happen in the pending association flow. Correcting or unlinking existing associations remains owned by `StatementLinkEditor`.

## Accounting invariants

1. Imported PDF ARS and USD totals remain separate; there is no implicit FX conversion.
2. Manual card consumptions and imported PDF line items are not double-counted as Transactions expenses.
3. Closing date and real due date from the imported statement remain unchanged.
4. Privacy masking suppresses rendered totals and the drilldown until the user reveals banking values; association can be reviewed without showing amounts.
5. All links continue to be owner-scoped in Firestore. No new collection, index, permission or schema changes.

## Automated verification

- `PendingStatementLinkCard.test.js`: shared visual surface and progressive first-scan disclosure; suggestion requires click; cancel/no write; confirms selected card; 1-write double-click guard; denied Firestore write with retry and safe error; bank-change resets card; archived bank unavailable; ARS/USD redacted on the privacy toggle.
- `Banks.test.js`: actual Banks page with **synthetic imported PDF**, explicit suggestion/review/confirmation and exactly one link write under the authenticated synthetic UID; assert that no expense, PDF or card-consumption write occurred.
- Both suites run in the required Card Statement GitHub Actions workflow together with production build and documentation checks.

## Authenticated UX release gate (pending)

Actual signed-in screenshot comparisons of `/bancos` at **390/1440/1728px in light/dark**, keyboard/Escape/focus behavior with the real modal, PDF parsing of a synthetic statement, and matching Firestore subscription update **still need authenticated browser verification**. Code-level review and green Jest do not count as rendered screenshots. Use the existing [cross-page QA guide](financial-ui-visual-qa.md) with an isolated nonproduction account. Keep issue #227 open until the real QA gates are satisfied.
