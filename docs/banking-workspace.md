# LTC$ Banking workspace

The new `/bancos` authenticated route is a manual financial registry that complements **Transacciones** (accounting movements) and **Portfolio** (investments). It never connects to any bank's online banking and does not request banking passwords, complete credit-card numbers, or CVV.

## Domain and Firestore structure

```mermaid
flowchart LR
  User["Authenticated Firebase user"] --> B["users/uid/banks"]
  B --> A["users/uid/bankAccounts"]
  B --> C["users/uid/bankCards"]
  C --> M["users/uid/bankCardCharges"]
  C --> L["users/uid/bankStatementLinks"]
  L --> E["users/uid/expenses (Resumen tarjeta)"]
  E --> S["users/uid/cardStatements"]
  S --> I["cardStatements/id/items"]
```

- `banks`: owner-created institutions with user-entered names and Firestore-generated IDs. No default banks are seeded, and any institution can be added manually. Existing legacy IDs such as `santander` and `ciudad` remain valid.
- `bankAccounts`: account nickname, type, ARS or USD, manually entered current balance, optional alias and CBU/CVU. CBU is masked in the UI unless explicitly revealed.
- `bankCards`: bank ID, nickname, brand, **last four digits only**, usual closing day and due day. Actual closing/due dates are saved **per statement**, not inferred from these days.
- `bankCardCharges`: explicitly created manual purchases (amount, currency, merchant, date, installments) with `countedInCashFlow: false`. They are **NOT** inserted into `expenses`.
- `bankStatementLinks`: one document per existing expense ID, containing only bank ID, card ID and last update. This avoids rewriting previous expenses or altering the canonical category schema. Firestore rules verify that the expense belongs to the user and is a `Resumen tarjeta`, and the card belongs to the selected bank.
- Existing PDF details under `cardStatements/{fileSha256}/items` remain canonical; the banking UI reads existing statements. Users may link a previously imported statement without reimporting or double counting.

## Credit-card statement workflow

1. From **Bancos**, create the bank profile and the appropriate Visa/Mastercard/etc. card.
2. Expand the card and select **Importar resumen PDF**. This reuses the existing `CardStatementPdfReview` analyzer for currently supported PDFs (Visa Santander and Banco Ciudad). Review its extracted data and category suggestions, then explicitly confirm.
3. The application checks the PDF SHA-256 against existing imported statements. If already present, reuse its existing expense; otherwise create exactly one `Resumen tarjeta` transaction with its ARS amount, and save the detailed imported statement using `saveReviewedStatement`. The selected bank/card are recorded via `bankStatementLinks`. Purchase details remain excluded from cash-flow totals.
4. From **Transacciones**, a `Resumen tarjeta` form also offers **Banco y tarjeta**, with the same relationship. Legacy summaries can be linked later from the **Resúmenes importados sin vincular** section.

A manually entered purchase and a statement PDF may describe the same real-world purchase. Do not aggregate their amounts: display them as separate sources to be reviewed and reconciled in a future release.

Never add all ARS and USD into one total without an explicit FX rate; do not treat purchases or credit-card payments as investment losses.

## Deployment and security

**The repository fragments are not deployed automatically.** Merge `firestore.rules.banks` **inside the existing** `match /databases/{database}/documents`, keeping all other Firestore rules. Verify in the Rules Playground or Emulator:

- owner create/list/read/update of bank profiles, accounts, cards and charges succeeds;
- another signed-in user or an unauthenticated user is denied;
- attempted writes containing PAN, CVV, authentication secrets or unexpected fields are denied;
- a link to a different user's expense, a non-statement category, a missing card, or a card from another bank is denied;
- bank charges cannot mark themselves as counted in cash flow;
- direct card/charge deletion is disabled as specified, except manually created charges.

The existing card-statement rules must already be deployed and allow the approved PDF analysis workflow. No new Firebase Functions and no paid Firebase features are required.

Release order: publish/test the revised additive rules, verify CI and a Vercel preview, then merge and confirm the production commit. Vercel does not deploy Firestore rules automatically. Until rules are deployed, the banking page will show a Firestore permission error rather than silently omitting data.

## Future enhancements

- Bank-account balance history: never infer earnings or income merely from a changing balance.
- Reconciliation UI to match manual purchases against imported statement items without duplicating either.
- More issuer and PDF format adapters.
- Financial data export via the shared LTC$ PDF/Excel/CSV module once account and card reports are ready.

## Better card and existing-PDF linking UX

The **Vincular resúmenes a tarjetas** section is an action-oriented, optionally collapsible list (expanded by default), not an analytics report. A pending PDF remains an existing card-statement expense and is never reimported simply because the user links it. An exact normalized bank + unique matching card brand can propose a card, but the user must explicitly choose **Usar sugerencia** and **Confirmar asociación**. If the institution or brand is ambiguous, the user chooses manually. A bank-card details view links to the outstanding queue. The existing owner-scoped `bankStatementLinks` Firestore security and single-source-of-truth expense behavior remain unchanged.

## Correcting or removing an incorrect card-statement association

A statement already linked to a bank/card has a **Corregir vínculo** action on its
card in `/bancos`. Its mobile-friendly dialog displays the current bank and card,
allows selecting another bank and one of its cards, and offers **Desvincular
resumen** with an explicit second confirmation. The save action is disabled
until both a valid new bank/card are selected and the destination differs.

- `reassignStatementBankLink(uid, expenseId, bankId, cardId)` verifies the
  signed-in owner, target bank, card ownership and an existing `Resumen tarjeta`
  expense, then updates **only** the existing
  `users/{uid}/bankStatementLinks/{expenseId}` document. An `update()` never
  recreates a link removed from a second device.
- `unlinkStatementBank(uid, expenseId)` verifies owner/document and deletes
  **only** that link. Real-time subscriptions automatically remove the PDF from
  the old card. The PDF/expense then appears in the existing pending-association
  queue, where the user can explicitly associate it again.
- Neither action touches `expenses`, `cardStatements`, or nested PDF `items`,
  nor inserts `bankCardCharges`; no duplicate spending can be generated.
- Firebase's additive `firestore.rules.banks` already has validated
  `create, update` and owner-only `delete` for `bankStatementLinks`.
  Ensure that fragment is actually published in the active Firebase project;
  **do not** add a permissive second match or replace unrelated rules.
- QA: move a PDF to a different bank/card; move within one bank; verify
  both old/new card lists; unlink and find it in the pending queue; attempt
  cross-user writes, invalid card/bank pairs, missing links, and error handling.
