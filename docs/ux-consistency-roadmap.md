# LTC UX consistency roadmap — Transactions, Banks, Portfolio & Lita

**Purpose:** apply one repeatable UX quality bar to every authenticated financial page without rewriting existing money/Firestore behavior for cosmetic reasons. Use the current shared LTC components, tokens, loading skeletons, collapsible header hierarchy and meaningful empty/error states. All stages require mobile (390px), desktop (1440px and 1728px), light/dark, accessible control sizes and real preview verification.

## Order of work

| Stage | Issue | Surface | Deliverable |
| --- | --- | --- | --- |
| 1. Finished foundations | [#221](https://github.com/franciscofunes/lleva-tus-cuentas/issues/221), [#223](https://github.com/franciscofunes/lleva-tus-cuentas/issues/223) | Transactions | Activity-first dashboard and unified period/search filters |
| 2. Compact records | [#225](https://github.com/franciscofunes/lleva-tus-cuentas/issues/225) | Transactions | Scan-friendly transaction cards, conditional secondary details and lazy summary drilldown |
| 3. Transaction regression evidence | [#226](https://github.com/franciscofunes/lleva-tus-cuentas/issues/226) | Transactions | Authenticated responsive screenshots, financial flow E2E tests and resolved accessibility gaps |
| 4. Account and credit-card UX | [#227](https://github.com/franciscofunes/lleva-tus-cuentas/issues/227) | Bancos | Bank/account/card structure, spending-limit indicators, statement/import flows and consistent actions |
| 5. Investment/analytics UX | [#228](https://github.com/franciscofunes/lleva-tus-cuentas/issues/228) | Portfolio | Asset-specific details (FCI, remunerated, fixed deposits), metrics, portfolio tools and responsive layout |
| 6. Conversational UX | [#229](https://github.com/franciscofunes/lleva-tus-cuentas/issues/229) | Lita chat | Cross-app embed, chat history, keyboard/mobile viewport, streaming/status/error states and natural Spanish |

Lita is split between the LTC iframe host and [the separate Lita Assistant repo](https://github.com/franciscofunes/lita-assitant); if the chat app itself needs edits, review and PR each repository independently. Keep any cross-origin handshake changes deliberately scoped and tested.

## Definition of done per surface

1. Review actual signed-in page (not a public login screen) and document the user's first task, information priority, states, and mobile friction.
2. Prefer shared tokens/components to divergent one-off surfaces. Explicit dark-mode colors, 44×44px controls, visible keyboard focus, long-text wrapping, and consistent titles/collapsibles.
3. Retain data semantics: ARS ≠ USD; FX conversions ≠ expenses; account transfers/portfolio withdrawals ≠ losses; card statements and linked purchases must not double count. User-reported earnings are not audited returns.
4. Add focused regression tests and build/CI checks; compare the exact deployed head SHA. Verify 390/1440/1728px screenshots in both light/dark under actual authentication.
5. Document what was verified and clearly separate unresolved manual QA from automated coverage. Every stage should have a trackable issue, reviewable PR and precise release notes.

Changes affecting shared surfaces need at least one cross-page regression check against the other modules before merge.
