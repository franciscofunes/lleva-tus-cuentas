# Transacciones: spending-first content guidelines

## Purpose
Explain the current user's **recorded transactions** with a clear distinction from the Portfolio and Bancos workspaces. Prefer everyday Argentinian Spanish (e.g. *gastás*, *plata*, *ingresa*) without overstating what the financial data proves.

## Hero and content hierarchy
- Hero: **Tus movimientos, bajo control** / **Gastos e ingresos**. Its description speaks about spending, incoming funds and movement in ARS and USD, not the balance of investments.
- Tools: **Herramientas y estadísticas** / **Tus movimientos en números**, retaining export/copy actions and card counts.
- KPIs: **Transacciones**, **Categorías utilizadas**, **Vencimientos registrados**.
- Currency summary: **Resumen por moneda** / **Ingresos y gastos en ARS y USD**. Explain that income/expenses and conversions are shown by currency and Portfolio holdings appear separately.

## Correctness
- `buildTransactionOverview().dueCount` counts transactions having a due date in the current data set, **including past dates**. Do not label it "Próximos vencimientos" unless the calculation changes accordingly.
- The ARS/USD summary includes currency conversions and a separate current Portfolio reference. Do not imply an aggregate of holdings with cash-flow or currency conversion of ARS and USD.
- This is a **copy-only** change: preserve all existing financial math, filters, data permissions, export contracts, navigation actions and responsive card layouts.
- Text is centralized in `src/shared/constants/transactionsPageCopy.js`; keep its tests aligned when making future copy updates.
