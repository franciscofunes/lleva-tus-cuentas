# Purchase receipt capture — structured evidence (November 2026)

## User intent

Most purchases are paid by credit card but only the resulting statement payment counts as
cash flow in Transactions. Small cash/debit/transfers become individual expenses.
No receipt, invoice, photograph, voucher or manual receipt number is mandatory.

## Implemented pipeline

1. Tesseract's private on-device recognition attempts single-block page segmentation
   first and sparse-text segmentation if amount/date/merchant evidence is incomplete.
2. `receiptOcr.js` extracts conservative `merchant`, labeled `amount`, `date`, document
   references, `items` and warnings. A bare `$` is not enough to infer ARS vs USD.
3. `ReceiptOcrImport` forwards suggested financial fields and bounded receipt evidence.
   The user edits the resulting form and explicitly saves.
4. `TransactionForm` maps to common fields and then **only** the extra fields configured
   by the selected personal category (`receiptNumber`, `counterparty`, `reference`,
   `operationDate`). When a legacy category interprets its date as a due date,
   the purchase's issuance date remains in the receipt and never replaces that due date.
5. `QuickPurchaseCapture` writes credit purchases only to `bankCardCharges` with
   `countedInCashFlow: false`, and cash/debit/transfer only forward the draft to Transactions.

## Persisted shape

Optional field on both an expense and a manually registered credit-card charge:

```json
{
  "receiptDetails": {
    "documents": [{
      "type": "non_fiscal",
      "number": "",
      "operationNumber": "1-72",
      "authorizationCode": "",
      "issuedAt": "2026-11-07"
    }],
    "items": [{
      "description": "MILA CARNE OFERTA",
      "quantity": 2.015,
      "unitPrice": 8950,
      "total": 18034
    }]
  }
}
```

Type enum: `invoice`, `non_fiscal`, `coupon`, `ticket`, `receipt`, `unknown`.
`documents` is limited to 3, `items` to 30. Identifiers are references from the
source document, **not** unique database keys or guaranteed tax invoice numbers.
Some documents show a receipt or authorization reference but no item breakdown;
the absence of products is valid. No image pixels, card PAN, or raw OCR transcript
are persisted. Photos of two documents for the same purchase do not create another
financial transaction; OCR references merge into the current draft.

## Firestore rule migration — REQUIRED BEFORE frontend deployment

LTC's rules are owner-managed additive snippets (not a deployed `firestore.rules`).
The PR cannot deploy or inspect the owner's complete live ruleset. Before shipping:

1. In the **existing** `/users/{uid}/expenses/{expenseId}` match, integrate
   `firestore.rules.receiptDetails` alongside the existing `customDetails`, currency,
   notifications and ownership guards. Add `receiptDetails` to a strict key allowlist.
2. Update the **existing** `/users/{uid}/bankCardCharges/{chargeId}` match using
   `firestore.rules.banks` (the helper `ltcValidBankReceiptDetails` plus the optional
   `category`/`receiptDetails` keys), while retaining the strict `source: manual`,
   `countedInCashFlow: false`, card ownership and no-update constraints.
3. Confirm create/edit with metadata and legacy documents without metadata through
   Firebase Emulator or a dedicated throwaway owner test account. A production
   `permission-denied` on either collection means the rules migration was skipped.
4. Only then deploy the corresponding frontend PR. Do not broaden wildcard owner paths.

## Accounting and UX boundaries

- Bank statement item imports remain read-only details of their existing payment;
  no scanned charge auto-matches, mutates or duplicates a statement item.
- Imported statement-to-manual-charge reconciliation is a **separate future phase**;
  this change makes receipt metadata available for it but does not claim matching.
- Native USD amounts retain USD: no invented exchange rate or ARS conversion.
- The OCR parser deliberately refuses conflicting labeled totals; users enter the
  correct amount in the ordinary input. A non-fiscal ticket is not a tax invoice.
- The optional receipt editor uses the existing Transactions/Bank form surfaces,
  full-size mobile tap targets and the same dark/light colors.

## QA

`CI=true npm test -- --watch=false --runInBand src/utils/receiptOcr.test.js
src/utils/receiptDetails.test.js src/components/QuickPurchaseCapture.test.js
src/components/TransactionForm.test.js src/utils/bankingModel.test.js
src/components/Card.test.js`

Run the full Jest suite and `npm run build`, then manually verify a real Android
photo and both themes at 390px and desktop. Test a fiscal invoice, thermal
non-fiscal ticket, card coupon, multiple documents for one purchase, a photo
with unreadable total and manual entry without any photo. Synthetic OCR text
fixtures cannot prove real image OCR accuracy on a specific Android device.
