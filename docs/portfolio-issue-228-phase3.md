# Portfolio #228 — published FCI return clarity (phase 3)

## Scope and source-level findings

`/portfolio/:positionId` uses the shared Transactions `QuickAccessCard`,
`CollapsibleSection` and financial record surfaces. This phase corrects three
remaining presentation problems without changing Firestore records or trades:

1. Empty monthly published FCI return values (`''`, whitespace and `null`) were
   converted to numeric `0` by `Number(...)`, so missing months appeared as
   actual `0%` monthly returns. Only explicit finite numbers now render and
   enter the simple/compounded *published* return summaries. A genuine `0` is
   still displayed as `0.00%`.
2. Negative YTD, compounded returns and manually entered annual rates were
   rendered green. Signs and slate/emerald/rose light+dark contrast now convey
   zero, positive and negative values separately; unavailable rates show `—`.
3. Large money values in two-column mobile history/summary cards had
   `whitespace-nowrap` and could overflow at 360–390px. Values now wrap with
   `min-w-0`, `break-words` and tabular digits, without rounding/truncating data.

Positive/negative published rates remain **fund-published performance**, not
realized profits or reconciled interest. Monthly totals cover the subset of
months entered, not automatically the full year. Portfolio withdrawals remain
capital movements, not realized losses. ARS and USD stay native and separate.

## Regression coverage

- `src/utils/portfolioPublishedReturns.test.js`: null, empty, whitespace,
  invalid strings, genuine zero, negative and positive values.
- `src/pages/PortfolioDetail.test.js`: synthetic FCI rendering, negative YTD,
  missing-month empty state, exact simple/compounded values and mobile wrapping.
- Existing account privacy, history modal and filters must still pass.

## Remaining visual review gate

This is a **source-level UX fix**, not a completed live visual audit. A signed-in
synthetic QA account is required to capture `/transacciones`, `/portfolio` and
`/portfolio/:positionId` at 390px, 1440px and 1728px in both themes. Compare
the shared surfaces, data labels, sign colors and overflow before marking #228
visually complete. Do not use a personal portfolio's data in screenshots.
