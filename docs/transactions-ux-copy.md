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

## Card budget guardrail wording

| State | Primary | Secondary |
| --- | --- | --- |
| No personal ceiling | Definí un tope para ver cuánto margen te queda | No inventar “disponible” |
| Under 70% | Todavía podés gastar | Antes de llegar a tu tope elegido |
| 70–<90% | Cuidá tu margen disponible | Atención: te estás acercando |
| 90–<100% | Te queda poco margen | El monto restante es aproximado |
| >=100% | Te pasaste del tope por ... | Ya superaste el límite que elegiste |
| Unsaved edit | Vista previa · sin guardar | La alerta real sigue usando el último tope guardado |
| Historical comparison | Comparación con tu récord histórico | Referencia informativa, no un tope aconsejado |
| Reference action | Usar referencia | Solo completa el campo; el usuario debe guardar |
| Missing PDF months | Todavía no hay resúmenes para comparar meses | Un período sin PDF no equivale a cero |

Never conflate visual 70/90/100% thresholds with the separately configurable notification threshold. Mark outside-site email/SMS/closed-app push as **not yet available**. Use Argentine Spanish throughout the consumer UI.
