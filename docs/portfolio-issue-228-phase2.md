# Portfolio Detail UX #228 — Phase 2: shared LTC detail surfaces and explicit bank identifier privacy

The user explicitly chose Transactions as the **design source of truth**. The signed-in `/portfolio/:positionId` detail page still had a separate `DetailSection` renderer with its own spacing, a missing consistent h1 for non-FCI accounts, 36px history edit/delete buttons, 40px filters/copy controls and **CBU/alias/account numbers visible as soon as the "Datos de cuenta" panel opened**.

## Applied

1. Removed the custom `DetailSection` wrapper. All **five** detailed sections now render the existing `CollapsibleSection` component (same `CollapsibleHeading`, surface, controls and ARIA as Transactions/Bancos/Portfolio). No special-case new card or heading component.
2. Added existing `QuickAccessCard` as one concise detail hero with a real `h1` for **FCI and non-FCI** assets, institution and native currency. Its explicit back link uses the 44px secondary-action style. Removed duplicate FCI-only h1.
3. FCI valuations and account activity records reuse **the exact `FINANCIAL_ITEM_SURFACE_STYLES`** token from Transactions. Mobile and desktop historical edit/delete controls use matching 44px slate/rose action styles with keyboard focus. Period filters, history filters, month close and registration controls are at least 44px high.
4. "Datos de cuenta" is closed on first visit. CBU, alias, account number, routing and SWIFT values are **not mounted into the DOM** until explicitly revealed field by field. Use shared `FINANCIAL_RECORD_DISCLOSURE_STYLES`, `aria-pressed`, explicit "Mostrar/Ocultar" labels; "Copiar" only appears once revealed and is 44px. Closing the account section or navigating to a different position hides all revealed identifiers. Previously saved expanded/collapsed preferences do not override individual field masking.
5. All changes are presentation-only. No changes to Firestore collections, account subscriptions, portfolio financial formulas, NAV/FCI valuation, reconciliations or transaction registration. A capital withdrawal remains a movement, **not a loss**. Reported earnings remain unverified unless classified.

## Verified by automated tests

- `PortfolioDetail.test.js` mounts the actual page with **synthetic account data** and validates Transactions' shared hero/collapsible patterns, first-hidden CBU/alias/account numbers, reveal and re-hide, copy gate, 44px action targets, history capital filters, no delete mutation until explicit confirmation and **FCI NAV vs realized interest** messaging.
- Existing editing/deletion modal tests still run. This test file is now in GitHub Actions' financial suite (which runs the full existing unit tests and React production build).
- Better Design copy/interaction review: concise first-read h1/description and primary back link passed comprehension; large touch targets and explicit disclosure align with reviewed interaction guidance.

## Manual release gate

Actual signed-in screenshots of `/portfolio/:positionId` at 390/1440/1728 light/dark, real Android keyboard, contrast, screen reader and long institution/CVU strings remain outstanding. The shared [cross-page Playwright matrix](financial-ui-visual-qa.md) covers the **top-level** financial pages, not the asset detail journey. Do not mark the #228 UX issue closed until those tests and the account identifier flows are reviewed in an isolated QA account.

This phase is a bounded, code-level consistency and privacy refinement; it is **not** screenshot certification.
