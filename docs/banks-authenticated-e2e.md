# Banks #227 — synthetic end-to-end QA (PDF import, association, review and privacy)

## Coverage and safety boundaries

This track has **two different gates**. Never report the first as a verified signed-in browser run.

1. **CI deterministic integration**: `src/pages/Banks.pdfJourney.test.js` mounts actual Bancos, `CardStatementPdfReview`, `LinkedStatementCard` and `CardStatementDetails`. All Firestore subscriptions, the PDF analyzer and financial save functions use **in-memory synthetic test doubles**, with zero network credentials or actual writes. It exercises opening a card, selecting a PDF file, waiting for bank totals and reconciliation, submitting **one** Resumen tarjeta expense (ARS only, USD in separate metadata), storing statement metadata/two purchase rows, owner-scoped card linking, reading by currency/search and privacy remasking. It asserts exact write counts and real due date. Existing `cardStatementService.test.js` separately tests parser HTTP authorization, statement cents reconciliation, idempotence boundaries and write batching.
2. **Optional actual authenticated Chromium**: `e2e/banks.authenticated.spec.cjs` requires a **non-production preview/staging hostname**, a locally saved synthetic-user login and a locally configured synthetic-only dataset. It validates UI visibility, keyboard/mobile/theme matrix, ARS/USD search and remasking, pending-link review/cancel, existing-link correction/unlink cancel, PDF upload controls *without uploading*, and masked screenshots at 390/1440/1728px light/dark. The browser spec is **strictly read-only**. It **never uploads a PDF, presses a confirm/save button, creates a bank/expense, deletes anything or writes to Firestore**.

### 1. Synthetic staging data needed for actual Chromium

In an isolated Firebase **NON-PROD** project, create/test an authorized synthetic user with these *fictional* items (through LTC's existing UI or approved data seeding process):

- Bank: `LTC QA Banco Demo`, active.
- Card: `LTC QA Visa Demo`, Visa, attached to that bank.
- A linked Visa statement period `2026-10`, containing a synthetic imported purchase merchant `LTC QA Compra ARS` in ARS (and, ideally, at least one USD purchase).
- A second **unlinked** Visa statement period `2026-09` owned by that same user. This lets the real browser test association selection/confirmation **without** saving it.
- All entities are entirely synthetic, including names and financial amounts. Use this dedicated account only. The local JSON file has **no IDs, balances, credentials, PII or bank numbers**.

Create **`.qa-auth/banks-fixture.json`** under the repo root:

```json
{
  "bankName": "LTC QA Banco Demo",
  "cardName": "LTC QA Visa Demo",
  "linkedPeriod": "2026-10",
  "linkedMerchant": "LTC QA Compra ARS",
  "linkedCurrency": "ARS",
  "pendingPeriod": "2026-09"
}
```

`scripts/qa/banks-fixture.cjs` fails closed if the fixture is missing, has production-looking bank/merchant names, a date mismatch, extra personal data or forbidden currency. Missing statements are **test failures**, not a silently skipped certification. The file is **gitignored** via the existing `.qa-auth/` rule. Never commit screenshots, browser storageState, production data or the synthetic account's credentials.

### 2. Run deterministic CI checks

```sh
node --check e2e/banks.authenticated.spec.cjs
node --check scripts/qa/banks-fixture.cjs
node --test scripts/qa/banks-fixture.test.cjs
CI=true npm test -- --watch=false --runInBand src/pages/Banks.pdfJourney.test.js
```

All standard financial unit tests and the React build remain in `.github/workflows/card-statements.yml`.

### 3. Run real browser QA (manual, nonproduction only)

```sh
npm ci
npm install --no-save --package-lock=false @playwright/test@1.56.1
npx playwright install chromium
export LTC_QA_BASE_URL="https://YOUR-EXACT-NONPRODUCTION-VERCEL-PREVIEW.vercel.app"
node scripts/qa/prepare-auth.cjs
npx playwright test --config=playwright.config.cjs e2e/banks.authenticated.spec.cjs
```

The general `playwright.config.cjs` and `prepare-auth.cjs` validate preview/staging targets. **Do not use** `LTC_QA_ALLOW_PRODUCTION=yes`. The authenticated session is local only and must match this preview hostname. `e2e/banks.authenticated.spec.cjs` uses no user-provided production accounts, never issues app writes and requires exact seeded statements; check the fixture and seed data if tests fail.

Screenshots and test output stay under **`.qa-artifacts/playwright`**, gitignored. Masked amounts alone do not protect merchant names or account details: use synthetic data and inspect artifacts before sharing.

## Before closing #227

A green PR cannot certify live banking PDFs or Firestore authorization. Still perform: actual signed-in Playwright run with fixture; review six PNGs and geometry at 390/1440/1728px in light/dark; exercise focus trap, Tab, Escape, real Android keyboard; actual supported Santander / Banco Ciudad PDF against the staging parser endpoint and independent Firebase permission tests. Real PDF parsing and a *persisted* import→link flow are intentionally excluded from browser automation until a strictly authorized isolated write sandbox is available. Record evidence in #227 and keep that issue open until complete.
