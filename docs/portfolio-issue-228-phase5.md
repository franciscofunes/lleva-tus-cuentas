# Portfolio #228 — mobile CASH and stacked-widget refinement (phase 5)

## Evidence and scope

On 2026-11-05, the user supplied a **dark-mode Android Chrome screenshot**
showing the lower part of the `/portfolio` page. The screenshot identified:

1. A category **Cash** position with stored zero annual rate displayed as
   `0% TNA` plus `0/month projected`, even though it represents liquid
   principal rather than a yield-bearing product.
2. The **Gráficos** and **Herramientas y métricas** cards touching one another
   at the end of the mobile workspace. Source inspection confirmed the tool
   card was placed directly after the grid without a top gutter. The orange
   marker was supplied in the screenshot; it is not treated as an app color.
3. The position link and local disclosure both said **Ver detalles**, although
   one navigates to the full asset page and the other expands metadata.

Do **not** commit the user's screenshot, which contains personal financial
amounts, to the repository or a public test artifact.

## Implementation

- Cash positions with no reported annual yield (missing or 0) show
  **Disponibilidad / Efectivo sin rendimiento** and retain the liquidity label,
  balance and `Verificar saldo` action. No `0% TNA` or artificial projected
  monthly interest occupies the first scan. A cash asset with an explicitly
  positive annual rate is left on the existing entered-rate path; the category
  does not rewrite any saved rate.
- The shared **FinancialOverviewPanel** stays unchanged; its Portfolio caller
  now provides a standard `mt-5` gutter after the final grid item. This works
  in both light/dark themes and does not override shared card tokens.
- Navigation to `/portfolio/:id` says **Abrir ficha**, while the existing
  shared `Ver detalles / Ocultar detalles` disclosure remains intact. Both
  actions keep their accessible names and keyboard/touch behavior.

## Verification and open QA

- `Portfolio.visual.test.js` checks synthetic Cash, no invented yield,
  accessible navigation/disclosure and the structural widget gutter.
- Existing Portfolio detail and cross-page regressions must remain green;
  Firestore records, currencies, capital flows and accounting are untouched.
- **A structural margin test is not pixel geometry verification.** The user's
  image is one authenticated mobile/dark observation, not the entire QA matrix.
  Verify Android 390px, desktop 1440/1728px and both themes with an approved
  synthetic signed-in session, as tracked by `financial-ui-visual-qa.md`.
