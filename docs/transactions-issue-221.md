# Issue #221 — Transactions UX follow-up

**Date:** 2026-10-20 · **Scope:** `/transacciones` authenticated React route. Source: [issue #221](https://github.com/franciscofunes/lleva-tus-cuentas/issues/221), [previous audit](transactions-ux-audit-2026-10.md).

## Decision and trade-off

| Direction | Gain | Cost | Decision |
| --- | --- | --- | --- |
| Make analytics and charts first | Exposes visual exploration immediately | Pushes movement review below the fold on phones | Not selected |
| Make movement review first | Easier entry, clearer search/edit/delete, straightforward reading order | A second scroll to charts/export tools | **Selected:** most users come here to manage individual movements |
| Remove other module links | Reduces clutter | Breaks habitual Portfolio/Bancos shortcuts | Not selected; links retained in a native “Más” disclosure |

The established slate/violet LTC design system, icons, all existing financial calculations and user-owned Firestore data remain unchanged.

## Implemented

1. **Reading order:** hero → period's bimonetary summary → transaction search/list → charts → analytics/export panel. The record list spans the right two columns on desktop, with summary/charts on the left; on mobile, actual DOM order puts records ahead of optional visualizations.
2. **Primary vs secondary:** “Agregar movimiento” has an always-visible readable label at phone sizes. A privacy control is visible but secondary. Portfolio/Bancos shortcuts remain in the accessible native “Más” disclosure.
3. **Progressive disclosure:** the charts are closed by default **only for first-time/new preference records**. Existing per-user saved `collapsedSections` are applied afterward and override the default. Category management is available inside expanded search/filter controls instead of occupying the always-visible list header.
4. **Card hierarchy:** transaction name and precise, native-currency amount appear together as first-scan anchors; labels and metadata remain below. Long names and numerical values wrap instead of being truncated. Signs and ARS/USD unit rules were not changed.
5. **Complex card summary deletion:** the confirmation explicitly warns that linked `cardStatements` are **not cascaded** when the parent `expenses` document is deleted. No implicit deletion of PDF records or purchased-item subcollections was introduced.
6. **Accessibility:** 44px touch target on the linked card-statement detail disclosure, no regressions intended to the shared confirmation and nested modal Escape/focus behavior.
7. **Integrity tests:** `transactionsPageView` formalizes the boundary between full-period filtered records and list-only sorting/pagination; tests cover ARS/native USD, scope used by export/Lita/KPIs, nested modals and deletion workflow, responsive source order and preference loading. The CI workflow includes new tests.

## Firestore deletion policy verified in source and regression tests

`deleteCardAction(docId)` deletes `users/{uid}/expenses/{docId}`, attempts to delete `users/{uid}/notifications/{docId}`, and updates the local Redux list. Notification cleanup is best effort: an insufficient-permissions error can leave an orphaned reminder while the original movement stays deleted. Separate `users/{uid}/cardStatements` records and their nested `items` are not touched. The statement reader looks them up through the original `expenseId` and therefore the statement might become inaccessible from the normal transaction card after parent deletion. There is **no transactional cascade**. The UX now warns on card-summary deletion; a future migration/reconciliation must explicitly define orphan archival vs deletion before changing data.

## Verification matrix

| Scenario | Automated coverage | Browser review required |
| --- | --- | --- |
| Header primary action, overflow, privacy | `TransactionsHeaderActions.test.js` | 390px in light/dark |
| Filter scope vs list sort/pagination; ARS vs USD | `transactionsPageView.test.js`, existing export and bimonetary tests | Live period switching and export files |
| Responsive content order, persisted collapse choices | `Dashboard.ux.test.js` source contract | 390, 1440, 1728px geometry |
| Long names, native currency, service and card variants | `Card.test.js`, `CardStatementDetails.test.js` | Mobile clipping, tooltip, PDF details |
| Edit + nested category modal | `GenericModal.test.js`, `TransactionForm.test.js` | Keyboard/real mobile screen |
| Delete, warning, notification cleanup | `DeleteTransactionDialog.test.js`, `databaseActions.delete.test.js` | Firestore-permission error + retry |

### Authenticated visual evidence — outstanding

**Collapsed mobile spacing follow-up (2026-11-07):** A user-provided Android dark-mode screenshot showed about twice the usual gap between the closed *Resumen ARS y USD* and *Transacciones* panels. Source inspection confirms the Transactions grid applies `gap-5`, while the summary also had `mb-5`. Removed only the redundant summary margin. The activity-to-charts spacing, chart-to-tools spacing, shared panel surfaces and all collapse preferences remain unchanged. A `Dashboard.ux.test.js` regression guards the single grid-gap contract. The same screenshot showed the search placeholder cut off mid-word on Android; its hint is now concise while the accessible field label and search behavior remain intact, covered by `SearchBar.test.js`. The supplied screenshot shows the original defects, not post-change visual QA.


Better Design's source and copy review is **not** a measurement of authenticated screen geometry. A live screenshot at 390/1440/1728 px and light/dark is still required for strict issue acceptance. Current tools do not expose an authenticated session or a trusted browser capture of user-owned records. Do **not** claim screenshot approval, runtime browser behavior or production release based only on code and unit tests. If someone with preview access captures the six states, perform Better Design's measured DOM spacing pass, inspect currency wrapping, chart/record locations, focus, preview deployment SHA and PDF drilldown, then close #221.

### CI / browser smoke checklist

```bash
CI=true npm test -- --watch=false --runInBand src/components/Card.test.js src/components/SearchBar.test.js src/components/TransactionsHeaderActions.test.js src/components/GenericModal.test.js src/components/DeleteTransactionDialog.test.js src/components/CardStatementDetails.test.js src/utils/transactionsPageView.test.js src/pages/Dashboard.ux.test.js src/actionCreators/databaseActions.delete.test.js
npm run build
```

- Compare before/after 390/1440/1728px screenshots in light and dark, including empty results, long numbers and PDF-linked cards.
- Confirm keyboard Tab/Shift+Tab/Escape through nested category modal and preservation of unsaved transaction form state.
- Verify statement imports, ARS/USD isolation, all filter periods, Lita context, PDF/XLSX/CSV exports and mobile results.
- Confirm protected production route `/transacciones` is visible only after user authentication. Never seed real user records for test screenshots.

### Runtime TypeError follow-up (2026-11-10)

After the first per-card containment PR, the owner still reported an inaccessible Transactions page. A production Vercel deployment of that commit was confirmed, but its server-side logs do not capture the browser-side React exception; the owner has not yet supplied a new post-deploy stack or a sanitized real-data fixture. **Do not represent this follow-up as an authenticated reproduction or a verified production repair.**

Regression tests reproduce `TypeError: Cannot convert object to primitive value` when malformed historical/imported numeric or date fields enter Transactions search, ARS/USD summaries, or Lita context before individual cards mount. These view-only readers now reject unsupported object values, keep invalid amounts out of totals and avoid inventing dates. Per-widget boundaries keep other sections available if a child renderer fails. Route diagnostics expose only a fixed error family, never original error messages or financial data. No persisted expenses, category classification, FX semantics or Firestore rules are rewritten.

After deployment, test with the owner's authenticated Android session: fresh load, period filtering, summary expansion, individual records, chart expansion, and the error screen's sanitized `code` if any failure remains. A green CI build alone is insufficient.
