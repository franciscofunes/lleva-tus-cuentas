# Developing and releasing LTC

[README](../README.md) · [Architecture](architecture.md) · [Companion Lita](https://github.com/franciscofunes/lita-assitant)

## Prerequisites and local environment

- Node.js + npm (use the repository's lockfile); a Firebase project with **Authentication** and **Firestore** enabled; valid Auth authorized domains.
- Set the **Firebase client** `REACT_APP_API_KEY`, `REACT_APP_AUTH_DOMAIN`, `REACT_APP_PROJECT_ID`, `REACT_APP_STORAGE_BUCKET`, `REACT_APP_MESSAGING_SENDER_ID`, `REACT_APP_APP_ID` and `REACT_APP_MEASUREMENT_ID` variables in an **untracked** `.env.local`.
- Only client-safe Firebase web config belongs in `REACT_APP_*`. Do not add Firestore admin credentials, Lita AI provider keys, PDF file storage secrets or real financial data to source code.

~~~bash
npm ci
npm start
~~~

Default Create React App development port is 3000. The Lita iframe uses `http://localhost:3005` in development (`src/shared/constants/urls.const.js`). To run both locally, start Lita separately with `npm run dev -- -p 3005` in its repository and configure Lita's parent origin to allow `http://localhost:3000`.

## Commands

| Task | Command |
| --- | --- |
| Development server | `npm start` |
| Full tests without watch mode | `CI=true npm test -- --watch=false --runInBand` |
| Specific helper test | `CI=true npm test -- --watch=false --runInBand src/utils/categoryExtraFields.test.js` |
| Transaction form regression | `CI=true npm test -- --watch=false --runInBand src/components/TransactionForm.test.js` |
| Production compile | `npm run build` |

The targeted GitHub workflow is `.github/workflows/card-statements.yml`, which runs selected regression suites and builds LTC. **A green compile does not prove deployed Firestore permissions or the live Lita API work.**

## Code changes by responsibility

| If you change... | Review and test... |
| --- | --- |
| Transaction create/update | `databaseActions.js`, `TransactionForm.js`, date helpers, existing payment/reminder data, `TransactionForm.test.js` |
| Custom categories | `customCategoriesService.js`, `categoryExtraFields.js`, editable `description` (max 500), category owner-scoped rules, `CategoryManager.test.js` |
| Credit-card PDF review | `cardStatementService.js`, `CardStatementPdfReview.js`, Lita API contract, Firestore statements rules and idempotent retry |
| Portfolio math | `portfolioService.js`, `portfolioEarningsAudit.js`, snapshots, reconciliation transaction tests and ARS/USD separation |
| Lita chat | `LitaAssitantPanel.js`, `litaChatService.js`, parent and iframe origin checks, Lita `/api/chat` compatibility |
| Routing/mobile navigation | `src/index.js`, `AnimatedRoutes`, `Navbar`, deep-link Netlify redirect and Android viewport behavior |
| Exports | `transactionsExport.js` / `portfolioExport.js`, amount formatting, selected filters, downloaded file contents |

## Firestore rules are a separate deployment

~~~mermaid
flowchart TD
    Code["Change client data contract"] --> Rules["Update additive rule fragments"]
    Rules --> Export["Read currently deployed Firestore rules"]
    Export --> Merge["Merge into existing matches<br/>without widening ownership"]
    Merge --> Test{"Emulator / Rules test:<br/>owner allowed, other user denied?"}
    Test -- "No" --> Fix["Fix rule or client data shape"]
    Fix --> Test
    Test -- "Yes" --> Publish["Publish rules via Firebase Console / CLI"]
    Publish --> Preview["Check Netlify preview with authenticated test users"]
    Preview --> Main["Merge PR after CI and smoke checks"]
    Main --> Prod["Verify new main commit in Netlify production"]
~~~

The repository contains `firestore.rules.portfolio`, `firestore.rules.cardStatements`, `firestore.rules.customCategories` and `firestore.rules.customTransactionDetails` as **reference fragments**. They must **not** be pasted over the full live ruleset. Before UI release, confirm the actual Firestore project, path, allowed fields, ownership, create/update/delete paths, and optional legacy fields. Retest cross-user access, duplicate imports, and updates to existing transactions. The codebase does not automatically publish these rules.

## Pull request and release checklist

1. Branch from current `main`; keep the change focused and update the relevant docs.
2. Write tests for both ordinary and financial edge cases (month boundaries, currency, zero/empty values, duplicate requests, existing records).
3. Run relevant tests and `npm run build`; require GitHub checks and the **Netlify deploy preview** to finish successfully.
4. Review browser/network behavior using a test user; check light/dark themes, mobile form controls and keyboard overlays where relevant.
5. For schema changes, **publish verified Firestore rules before merging the UI**, or leave the PR in draft. Use synthetic data, never real statements. For category descriptions, verify that owners may create/edit/clear up to 500 characters, non-owners cannot write, and no arbitrary keys are permitted. Older documents without `description` remain valid.
6. Merge into `main`; verify the **actual Netlify production deployment commit**, not only a ready branch preview.
7. Smoke-test login, transaction create/edit, portfolio read, Lita iframe and authenticated PDF analysis (if changed).

## Troubleshooting

| Symptom | Investigate first |
| --- | --- |
| `Missing or insufficient permissions` | Active Firestore rules vs document path, UID, updated field allowlists and deployed project |
| Portfolio or Transactions does not load | Auth/session bootstrap, rejected Firestore query, browser console, route transitions and deployed Netlify commit |
| Lita loads but gives no response | Lita `/api/status`, parent origin, iframe `postMessage`, backend logs and provider configuration |
| PDF analysis fails | Lita `/api/card-statements/analyze` runtime logs (fixed error codes), Firebase project ID, authorized origin, actual PDF layout and reconciliation |
| Export downloads empty data | Active view filters, serialized records, XLSX/Markdown tests and browser download permission |
| Something works in preview but not production | Compare production commit vs preview commit; verify environment variables and correct deployment target |

**Privacy:** never paste ID tokens, whole transaction records, personal bank PDFs or environment secrets into issues, logs or test fixtures. Prefer synthetic fixtures and redacted reproduction steps.

Further reading: [Lita operations](https://github.com/franciscofunes/lita-assitant/blob/main/docs/development.md) and [this repository's architecture](architecture.md).
