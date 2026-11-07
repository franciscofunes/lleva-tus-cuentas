# Optional purchase capture — cards and cash flow

## User job

The owner primarily pays by credit card to preserve liquidity until the statement is due, but sometimes pays cash, debit or transfer. They need a low-friction record of **when a purchase happened**, without forcing them to photograph every receipt, keep every card voucher or manually match every purchase later. An emailed invoice, paper voucher, handwritten amount or no document at all must be equally valid inputs.

## Accounting invariants

1. Credit card purchase = purchase/commitment in `bankCardCharges`, `countedInCashFlow:false`; not an immediate `expenses` write.
2. Cash/debit/transfer = draft in existing Transactions form, then explicit reviewed expense write only after category selection.
3. A statement PDF's `cardStatements/{sha}/items` describes purchases; its linked `Resumen tarjeta` expense is the existing cash-flow/payment accounting path. The same economic purchase must not appear twice in a spending view.
4. Never convert native ARS/USD or fabricate an FX transaction. A bare `$` remains currency-unverified.
5. Receipt, coupon, invoice, invoice number and installment count are optional, and scanned images or raw OCR text are not stored. Never require receipts to continue.

## Phase 1 — implemented in this PR

- Reuse the existing Transactions `ScreenshotImportShortcut`, `GenericModal`, `ReceiptOcrImport`, theme tokens and current bank card/charge service. No new global design system or new page.
- An optional fast-capture form selects payment method, card (only for credit), merchant, date, amount and currency; includes optional coupon/invoice reference and note. Card references are retained in the existing `note` field to avoid a Firestore rules migration in this slice.
- Cash/debit/transfer continues in the existing category-aware Transactions editor. Credit card saves to `bankCardCharges` only after explicit confirmation. One in-flight guard prevents double tap submissions.
- Improve thermal receipt / card-voucher OCR parsing for abbreviated dates, non-fiscal headings, explicit operation/coupon references and unambiguous labeled amounts.

## Phase 2 — global **Mis consumos** view

- Show `bankCardCharges` from all cards in a single searchable cross-bank view, preserving Transactions-first layout, common typography, shared financial surfaces and light/dark states.
- Optional merchant/category suggestions (not required to capture a purchase); user correction and category-based spend analytics without counting the eventual statement again.
- Display statement cycle projections by card with actual closing/due dates when available; estimates always labeled as estimates. Installments must show the total commitment separately from each month's installment.
- If reference numbers need searching or matching, add validated optional structured `documentType/documentNumber` fields with owner-scoped Firestore rules, tests and a backward-compatible migration plan.

## Phase 3 — reconciliation of statement items

- Suggest links between manually captured `bankCardCharges` and parsed `cardStatements/{sha}/items` by card, native currency, amount, merchant, date tolerance, installment and optional reference.
- Explain the evidence and let the owner confirm or dismiss ambiguous matches. Allow missing receipts, statement-only purchases, duplicate identical purchases, refunds and partial postings. Match cardinality may be one-to-many for installment schedules.
- Two receipts may describe **one** purchase (e.g. payment voucher + itemized ticket). Distinguish multiple documents from multiple purchases. Preserve a hypothetical discrepancy such as paid cash `10,000.00` vs itemized total `10,000.53` for explicit review; never silently choose the larger number.
- Keep cash-flow KPIs and economic-spend KPIs separate. Existing approved summaries and their historical `expenses` records remain intact.

## Privacy, design and rollout

- No forced camera permission or permanent image storage. Optional future attachments must get separate explicit approval and retention controls.
- Use the repo's `docs/financial-ui-contract.md` and Transactions style as the canonical source. Do not introduce a new card, typography, modal or disclosure pattern merely for capture.
- Firestore write tests, per-field OCR regression tests, privacy masking, mobile keyboard/zoom, dark and light themes, and actual Android device validation precede any production-readiness claim.
