# Transactions UX and accessibility audit — 2026-10-19

**Scope:** `/transacciones` (Transacciones), its transaction cards, search/period controls, and shared dialog. **Method:** audited current React source with Better Design's confirmation-dialog UX principles, content/comprehension checks, hierarchy/touch-target principles, and accessibility code-review rules. No production personal records were accessed.

## Findings and remediation

| Priority | Finding & evidence | Action in this PR | Verification |
| --- | --- | --- | --- |
| P1 | Native `window.confirm` in `Card.js` breaks LTC's dialog consistency and is hard to control for mobile/keyboard users. | Move the delete request to `Dashboard.js`; show a branded `DeleteTransactionDialog` using `GenericModal`. Name the selected movement and irreversibility, offer Cancel and Delete, lock duplicate submissions, keep dialog on server failure, and show an inline retry message. | `Card.test.js`, `DeleteTransactionDialog.test.js` |
| P1 | Generic modal used to handle Escape without keeping Tab inside the active dialog or returning focus to the originating action. Nested category-manager dialogs may coexist with the edit form. | Trap Tab within **topmost** dialog, handle Escape there only, restore prior focus when it closes, keep screen-reader names and body scroll lock. | `GenericModal.test.js` and deletion-dialog tests |
| P1 | Several interactive controls were below LTC's 44px touch target guideline: search clear (36px), date picker (42px), category management (36px), hero quick actions (variable). | Raise hit areas to a minimum of 44px and add visible keyboard focus styles on main actions. | Source checks; **manual touch testing required** |
| P2 | Transaction name was prefixed with “Nombre:” in each already-labeled card; a missing comment rendered an empty “Descripción:” row. | Use a semantic h3 as the primary transaction identity and omit empty descriptions; retain full category, dates, FX and custom fields. | `Card.test.js` |
| P2 | Empty selected periods had guidance but no direct recovery action within the empty state. | Add a clearly labeled “Ver todo el historial” control only when a narrower period is selected. | Source review; **period navigation smoke test required** |
| P2 | Filter summary text was forcibly truncated and the clear affordance too small. | Let filter summary wrap and enlarge the clear action. | `SearchBar.test.js`; **mobile geometry unverified** |
| P2 | First-view comprehension check highlighted too many simultaneously available actions and supporting sentences. | Retain user's functional widgets and settings without removing features in this repair PR; propose progressive disclosure/hierarchy follow-up below. | Needs authenticated responsive render, not source-only approval |

## Design decision

- **Reuse existing LTC modal, rather than importing a new UI kit.** Gain: consistent violet/slate aesthetic, fewer dependencies, reusable keyboard fixes. Cost: changes to shared modal behavior must be regression tested in editing and category management.
- **Require confirmation for a permanent Firestore delete.** Gain: no accidental irreversible deletion. Cost: one extra tap compared with an undo toast. Firestore deletes are not currently reversible.
- **Limit this change set to focused repairs and polish.** Gain: retains ARS/USD accounting, card statements, reminders, category semantics, current layout/preferences. Cost: the broader design reorganization remains open until real visual evidence is available.

## Follow-up work (not claimed complete)

1. Authenticated visual review at 390, 1440 and 1728px, light/dark and mobile keyboard. Compare before/after screenshots and use Better Design spacing capture in each viewport; source review alone is **not visual approval**.
2. Consider reducing first-view action density through scoped progressive disclosure, **without** concealing the add-transaction action or silently resetting saved collapsible preferences. Validate against users who need frequent search and exports.
3. Audit transaction-card readability for long names, very large ARS/USD numbers, expired services and linked credit-card statement details.
4. Verify linked bank/PDF statement and notification behavior when permanently deleting a transaction. Do not add cascading deletion without an explicit financial data contract and regression tests.
5. Smoke-test all transaction filter periods, keyboard routing, Lita, PDF/XLSX exports, new/edit transaction and nested custom-category modal after deployment.

## Commands and release gate

```bash
CI=true npm test -- --watch=false --runInBand src/components/Card.test.js src/components/DeleteTransactionDialog.test.js src/components/GenericModal.test.js src/components/SearchBar.test.js src/components/ExpenseFilter.test.js
npm run build
```

**Release gate:** GitHub CI green, deployed preview verified, no unexpected content/amount changes, full keyboard and dark/light mobile review. The review here records source findings and implemented changes; it is not a certificate of deployed visual quality.
