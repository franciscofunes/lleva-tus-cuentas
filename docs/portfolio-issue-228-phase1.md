# Portfolio UX #228 — Phase 1: actual Transactions components, not look-alike CSS

Transactions is LTC$'s single financial UI reference. The user explicitly rejected differing per-page visual systems. [Shared UI contract](financial-ui-contract.md).

## Better Design source audit

Code-level inspection of the original `src/pages/Portfolio.js` against `Dashboard.js` and `Banks.js` found:
- An unlabeled `+` on phones for **Agregar posición**, alongside separate ad hoc shortcuts and privacy controls instead of `FinancialHeaderActions`.
- `Portfolio de un vistazo` (tools/export and KPIs), then balances, then charts **before** the user's primary activity (positions), even though Transactions has hero → summary → activity → secondary tools.
- Portfolio position cards had an independent transparent/nested surface, an eye-catching green verify action, and all NAV/interest/activity/audit metadata exposed on first scan. This competed with the position name, currency and balance.

## Applied in PR for #228

1. Portfolio now imports and renders the **same** `FinancialHeaderActions` used by Transactions and Banks. It passes only `currentSection='portfolio'`, primary text/callback, privacy state and the **same SVG icons**. There is exactly one visible primary action at 390px; other destinations are inside shared `Más`.
2. Inside the same outer `QuickAccessCard` and `CollapsibleSection` surfaces: mobile order is **Resumen por moneda → Posiciones → Composición del portfolio → Portfolio de un vistazo**. On desktop, an activity-first `lg:grid-cols-3` gives Posiciones `lg:col-span-2 lg:row-span-2`, while summary and chart are the narrow side column. The overview panel follows the primary workspace. Exports and Lita remain available.
3. Position cards use the exact `FINANCIAL_ITEM_SURFACE_STYLES` token used by Transactions; never maintain an independently styled root. The 44px drag handle, institution, name, category, native-currency balance, quoted annual rate, liquidity and projected monthly estimate remain in first scan.
4. Secondary details (daily estimate, maturity tracking, FCI ticker/NAV/one-year/monthly data, cash-flow classification, review flags and user-reported gains) are **conditionally mounted** per position, with the shared `FINANCIAL_RECORD_DISCLOSURE_STYLES` control, keyboard focus, `aria-expanded`, `aria-controls`, and independently toggleable state. No data discarded, no new persistence schema.
5. A violet outline for **Verificar saldo / Actualizar cuotaparte** makes that per-card action subordinate to the page-level Add action and semantically distinct from actual financial gains. Confirmation/edit/delete dialogs and ARS/USD/EUR/USDT support remain unchanged.
6. Existing markdown importer, PDF/Excel/export actions, position reorder with keyboard, NAV verified calculation, privacy, rates and maturity dates remain in the original page flow.

## Financial invariants

- Existing calculations and subscriptions are **untouched**. No Firestore rules or data writes added.
- ARS and USD stay separated; no artificial conversion or summation, including other supported currencies.
- A withdrawal or capital transfer is not an investment loss. Account-history user-tagged earnings and reconciliations are not audited returns.
- NAV updates are valuations, not realized profit. User-entered realized earnings and published FCI monthly returns remain labeled as they were. Simulated annual/monthly rates are projections, not bank-posted gains.

## Verification and remaining work

- `Portfolio.visual.test.js` exercises an actual mounted Portfolio with **synthetic** USD remunerated account and ARS FCI, shared header, first-read ordering, progressive NAV disclosure, privacy, keyboard drag handle, edit/delete and write isolation.
- Cross-page `BrandAssets.test.js` requires the same shared shortcut implementation rather than per-page icon copies; existing tests remain.
- Required: GitHub Jest/production build/documentation checks, preview matching exact SHA; **authenticated screenshots of /transacciones, /bancos and /portfolio side by side at 390/1440/1728 px in light/dark**. Source-only rules do not constitute visual approval.
- Further scope under #228: consider reducing form density and deep PortfolioDetail/FCI analytics only after authenticating and reviewing evidence; no bespoke layout system. Then #229 Lita.

This phase is a bounded reuse-first redesign, not a claim that the entire Portfolio issue is closed.
