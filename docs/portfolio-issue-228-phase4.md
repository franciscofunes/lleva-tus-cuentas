# Portfolio #228 — consistent published return semantics across list and editor

The previous phase fixed missing published FCI monthly values and color semantics
in `/portfolio/:positionId`. However, the `/portfolio` position list and FCI
editor still converted empty monthly values to `0` through `Number(...)`,
labelled partial compounded data as YTD and rendered negative rates in green.

## Changes

1. **One published-return calculation:** the detail page, list disclosures and
   FCI editor now use `summarizePublishedReturns`. Months with `null`, empty,
   whitespace or invalid values are missing. A reported `0` is real. Both
   simple and compound totals represent **only the months entered**. No changes
   are made to stored values, snapshots or Firestore rules.
2. **FCI first scan:** use published YTD (if reported), not a fabricated annual
   fixed rate or monthly interest projection. Clearly say NAV valuation does
   not mean realized gains. Fund performance of one year and compounded
   monthly results live under the existing shared progressive disclosure.
3. **Other assets:** show user-entered annual rates, and only show the
   approximate monthly interest when a valid annual rate exists. An absent
   rate displays `—` and an explicit no-projection message rather than `0%`.
4. **Semantic colors and privacy:** positive figures use emerald, negative
   rose, zero/missing neutral. Light/dark card tones contrast with their
   backgrounds. Hiding financial values masks percentages and removes
   sign-implied colors. The editor has separate contrast tokens because its
   surface is always dark.
5. **Input clarity:** the editor's asset type, native currency, tracking mode,
   annual rate and published YTD inputs have accessible names. Empty monthly
   fields use a “Sin dato” placeholder, and no calculated percentages appear
   until at least one valid month is entered.

## Automated QA

- `src/utils/portfolioPublishedReturns.test.js`: invalid/missing, explicit
  zero, arithmetic and sign conventions.
- `src/pages/Portfolio.visual.test.js`: FCI list/YTD, no fabricated monthly
  estimate, disclosure privacy, form month edits and color states.
- `src/pages/PortfolioDetail.test.js`: unchanged detail behavior with the
  shared summary helper.

## Remaining manual QA

This is source-level and component-test evidence. An authorized synthetic
signed-in session is still needed for the shared 390/1440/1728px light/dark
matrix and actual keyboard/mobile behavior; no personal portfolio data may
be used in screenshots. Follow `docs/financial-ui-visual-qa.md` before
closing issue #228.
