# LTC$ Bank onboarding (Markdown)

The **+** action in the Banking page header opens the existing shared LTC$ modal. The Banking modal accepts either manually edited fields, or a typed `key: value` Markdown document via **Pegar Markdown → Comparar Markdown → Aplicar al formulario → Guardar banco**.

**Security:** never insert bank passwords, access tokens, CVV, or full card numbers. Full transaction histories should be imported only through their canonical dedicated flows, not the bank onboarding parser. Store the last four card digits only. Do not commit real banking identifiers, financial statements, or sensitive customer data to this public repository.

## Synthetic sample (not real account data)

```md
# LTC$ Bancos

- type: bank
  name: Banco de ejemplo

- type: account
  name: Caja de ahorro ARS
  typeAccount: caja_ahorro
  currency: ARS
  balance: 100.25
  alias: demo.alias
  cbu:
  accountNumber: 12345/6
  holder: Titular de prueba
  holderTaxId:
  branch:

- type: card
  nickname: Visa titular
  brand: Visa
  lastFour: 1234
  closingDay: 29
  dueDay: 11
  closingDate: 2026-10-29
  dueDate: 2026-11-11
  asOf: 2026-10-15
  lastStatementARS: 0.00
  lastStatementUSD: 0.00
  minimumPaymentARS:
  currentConsumptionARS: 900.25
  currentConsumptionUSD: 20.00
  availableLimitARS:
```

One bank per import. You can include zero to twenty accounts and cards. No default Santander, Ciudad or other banks are seeded. Unrecognized properties and multiple banks are rejected with line-oriented errors. Decimal values accept both `220356.40` and `220.356,40`; money without a known currency is not converted. All currencies remain separate.

## Firestore and data model

- `users/{uid}/banks/{bankId}`: owner-created bank identity. Bank name is editable.
- `users/{uid}/bankAccounts/{accountId}`: one currency per account, manual balance, optional alias/CBU, account number, holder, CUIT/CUIL and branch.
- `users/{uid}/bankCards/{cardId}`: brand, nickname, four-digit suffix, usual closing/due day, optional manually copied `statementSnapshot` (reference dates and ARS/USD amounts only).
- `users/{uid}/bankCardCharges` and existing `cardStatements` are **not written** by bank onboarding. Neither balances nor card reference snapshots create transaction expenses or reconcile statements.

The entire first-time import is a single Firestore batch, so a failed write does not create partial banks. To create a bank plus accounts/cards in that batch, the additive bank rules must use owner-scoped `existsAfter` checks for bank foreign keys. The rules in `firestore.rules.banks` also allowlist optional account identity fields and the strictly typed `statementSnapshot` map. Merge this fragment **inside existing document rules**, keeping all other LTC$ rules. Existing records and functions remain compatible.

The supported screenshot values are manually entered reference snapshots, not financial assertions, current published banking rates or automatically imported card purchases.
