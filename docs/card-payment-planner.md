# Planificador de pago de tarjetas (Bancos)

The **Planificar pago de tarjetas** panel in `/bancos` is a **read-only,
client-side simulation**. It does not call bank, wallet or FX APIs; it does
not transfer money, pay card statements, alter Firestore balances, or create
transactions. It is intentionally separate from the Transactions ledger.

## Workflow

1. Reveal balances using the existing Bancos privacy control.
2. Select one or more cards already recorded in Bancos, or add manual rows.
   Registered cards prefill amounts from the most recent linked PDF statement,
   then fall back to the *manual* home-banking statement snapshot. Review all
   amounts for payments or adjustments made since the snapshot.
3. Enter each card's ARS and USD amounts **separately**. Enter only an eligible
   `DB RG 5617 (30%)` perception in the explicit field; generic `taxesArs`
   from a PDF can include unrelated taxes and is **never** auto-deducted.
4. Select the ARS account to fund the card payments, the USD account used to
   pay USD-native statement amounts, and the USD wallet/account used to sell
   currency. Alternatively, enter balances manually. Every account balance is
   a manual reference and can be overridden for this simulation only.
5. Enter the **actual wallet sell quote**, ARS received per USD. No live-rate
   integration is implied. Opt into the separate USD payment and RG 5617
   deduction only after checking the bank's conditions and deadline.
6. Review the USD sale estimate, the remaining ARS gap and any uncovered USD
   balance. A shortage in the USD payment account prevents applying the tax
   deduction. If the same recorded USD account is selected for the payment and
   the sale, the planner reserves the USD card payment before checking whether
   enough USD remain to sell.

## Monetary invariants

- Use integer cents and round **up** the USD amount to sell to whole cents.
- Do not infer a bank's payable ARS amount for unpaid USD from a wallet quote.
- Deduct an eligible perception only after explicit confirmation and only if
  all USD balances in the plan are covered in their own currency.
- Never treat the wallet FX sale as card spending, income, or a second expense;
  the card expense/PDF accounting contract remains unchanged.
- Preserve native currency, existing imported PDF totals, due dates and the
  user's saved bank balances. A planner draft is not persisted.
- When the Bancos privacy toggle is off, hide the planner's real inputs,
  statement amounts and computed numbers **from the DOM**, not just visually.

## Synthetic regression example

Card A ARS 150,000.45 / USD 100.20 with eligible RG 5617 ARS 30,000.11;
Card B ARS 50,000.81 / USD 0; available ARS 20,000.53 and USD 500;
wallet sell quote ARS 1,500.57/USD.

The ARS gap after the tax deduction is **ARS 150,000.62**, so the sale
estimate is **USD 99.97**. Without the deduction, it is **USD 119.96**.
These fictitious values are fixtures in unit/component tests, not user data.

## Validation

- `CI=true npm test -- --watch=false --runInBand src/utils/cardPaymentPlanner.test.js src/components/CardPaymentPlanner.test.js src/pages/Banks.test.js`
- `npm run build`
- Confirm 390px mobile and desktop layout, light/dark theme, privacy, the
  shared Transactions/Bancos component hierarchy and account source labels.

Future iterations could parse the *specific* RG 5617 line from verified PDFs
and support multi-account ARS allocations, with explicit user review. Avoid
assuming the aggregate `taxesArs` field is entirely deductible.
