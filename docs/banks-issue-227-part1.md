# Bancos UX — Mobile-first actions and safe consumption removal (#227, part 1)

## Why this first slice

After Transactions #221/#223/#225, Banks already uses shared `QuickAccessCard`, `CollapsibleSection`, `FinancialMetricCard` and the existing LTC dark-mode tokens. The source inspection showed three usability and safety regressions:

1. The only primary bank action showed an unlabeled **+** icon at phone widths (`hidden sm:inline`), unlike Transactions' clearly labeled action.
2. Manual card consumption deletion used a direct destructive call from a small 40px button, without a confirmation.
3. The CBU/CVU disclosure had a 40px hit target and no `aria-pressed` state; shortcut icons did not guarantee a 44px width.

## Implementation

- The hero action is always explicitly **Agregar banco**, stacked full-width on mobile; the secondary Transacciones/Portfolio/privacy actions flow below with 44px minimum control size. Reuses existing shared `QuickAccessCard` without altering its defaults on other pages.
- A manual card consumption uses a responsive, labeled `article` with long-merchant/amount wrapping, an opaque LTC card surface in both themes and an accessible **Eliminar** action (44px).
- The first deletion tap only opens **Eliminar consumo manual**, an accessible focus-managed `GenericModal` confirmation. It identifies the merchant and purchase date, masks the amount if banking privacy is enabled, and states that linked PDF statements and Transactions records remain untouched.
- Confirming calls `deleteManualCardCharge(uid, charge.id)` **exactly once**. A synchronous ref prevents duplicate requests; cancellation/Escape cannot close a pending deletion. Failures stay in the modal with a retry message. Success notifies the user and closes. No new Firestore writes/schema/rules.
- CBU/CVU reveal keeps a proper min-44px button with `aria-pressed`, an accessible account-specific label, and visible focus. Bank account numbers remain hidden until their existing explicit disclosure.

## Regression checks

- Dedicated `DeleteBankChargeDialog.test.js`: cancellation/no-write, double-tap guard, Escape lock, retry on denied writes, privacy, focus trap.
- `Banks.test.js`: primary action at phone size, shortcut targets, CBU reveal state, responsive record surface, cancellation, owner-scoped deletion, no side-effect on statement imports or Transactions.
- Both tests run in the existing GitHub Actions test/build workflow.

## Financial and security invariants

- Do not change spending limits, personal warning thresholds, ARS/USD balance summaries, purchase amounts, linked statement PDFs, due dates or Firestore ownership.
- Manual bank consumption is not an expense entry in Transactions. Deleting one card charge must never cascade into linked statement records or expenses.
- Merchant, date and card details come only from the signed-in owner's Firestore collections. The modal never logs or exports transaction records.
- Mask numeric amounts while the banking privacy toggle is off.

## Scope and next PRs

This is **phase 1** of Banks #227, not a claim that all bank UX is complete. Next: compact nested bank/account/card information architecture, spending-budget hierarchy and statement linking/import interactions, followed by signed-in 390/1440/1728px light/dark visual QA and isolated financial E2E. The same approach will later apply to Portfolio #228 and Lita #229.
