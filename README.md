# Lleva Tus Cuentas (LTC)

**Personal finance, transactions, investments, and AI-assisted analysis — one account, separate currencies.**

[Open the app](https://lleva-tus-cuentas.netlify.app/) · [Architecture](docs/architecture.md) · [Development](docs/development.md) · [Portfolio guide](docs/portfolio.md) · [Card statement import](docs/card-statement-pdf.md)

LTC is a responsive **React 18** single-page application hosted on **Netlify**. Users authenticate with **Firebase Authentication** and manage private financial records in **Cloud Firestore**. The companion **[Lita](https://github.com/franciscofunes/lita-assitant)** Next.js application, hosted on Vercel, provides contextual financial chat and server-side PDF statement analysis.

> **Financial integrity:** LTC tracks ARS and USD separately. A transfer, foreign-exchange sale, cash withdrawal, or portfolio balance change is not automatically an expense or realized investment loss. Estimates and reported earnings are not audited returns.

## At a glance

| Area | What you can do | Key implementation |
| --- | --- | --- |
| Transactions | Record, edit, categorize, search and filter money movements; navigate months; export XLSX/Markdown | `src/pages/Dashboard.js`, Redux and `users/{uid}/expenses` |
| Categories | Use shared categories or create private, archivable categories with editable tooltip descriptions and up to three **approved** optional fields | `CategoryManager`, `categoryExtraFields`, Firestore |
| Due dates | Track bill/card due dates, payment state and reminders | `transactionDueDates`, `notificationService` |
| Portfolio | Manage ARS/USD positions, valuation snapshots and reconciliation records | `Portfolio`, `PortfolioDetail`, `portfolioService` |
| Card statements | Analyze supported **digital Visa PDFs**, review purchases and totals, attach details to one card-payment transaction | Lita PDF API + `cardStatementService` |
| Lita | Ask questions about portfolio/transactions using bounded context and per-user chat history | Cross-origin iframe, `postMessage`, Firestore chat threads |
| Exchange quotes | Show indicative public USD exchange quotes without sending financial balances | `usdQuotesService` |

The UI is intentionally Spanish-language; **engineering documentation is in English**. Features may require the corresponding live Firestore rules to have been applied before writes succeed.

## System overview

~~~mermaid
flowchart LR
    Person["Signed-in user"] --> LTC["LTC SPA<br/>React + Redux<br/>Netlify"]
    LTC --> Auth["Firebase Authentication"]
    LTC --> Data[("Cloud Firestore<br/>users/{uid}")]
    LTC --> Widget["Lita iframe<br/>Next.js / Vercel"]
    Widget --> Chat["POST /api/chat"]
    Chat --> Pool["Configured AI providers"]
    LTC --> PDF["POST /api/card-statements/analyze"]
    PDF --> JWT["Verify Firebase ID token"]
    JWT --> Parser["Deterministic PDF parser"]
    Parser --> LTC
~~~

**Boundaries matter:** LTC performs authenticated Firestore reads/writes; Lita's PDF route verifies a Firebase ID token; Lita's general chat route validates its financial scope and context but is **not a Firestore write API**. The browser never receives provider API keys.

## Quick start

Requirements: Node.js, npm, a Firebase project with Authentication and Firestore, and the corresponding authorized development origins.

~~~bash
git clone https://github.com/franciscofunes/lleva-tus-cuentas.git
cd lleva-tus-cuentas
npm ci
npm start
~~~

Create **`.env.local`** (do not commit it) with the Firebase web configuration consumed by `src/shared/config/firebase/firebase.config.js`:

~~~dotenv
REACT_APP_API_KEY=your-firebase-web-api-key
REACT_APP_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_PROJECT_ID=your-project-id
REACT_APP_STORAGE_BUCKET=your-storage-bucket
REACT_APP_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_APP_ID=your-firebase-app-id
REACT_APP_MEASUREMENT_ID=your-measurement-id
~~~

The web API key is **not** an authorization boundary: enforce ownership in Firestore Security Rules and restrict Firebase Auth domains. Never put Lita provider credentials or Edge Store secrets in `REACT_APP_*` variables. To use Lita locally, run its server on **`http://localhost:3005`** (see the [Lita development guide](https://github.com/franciscofunes/lita-assitant/blob/main/docs/development.md)); the production LTC Lita URL is `https://holalita.vercel.app/`.

## Everyday workflows

1. **Record a movement:** sign in → Transactions → select a category → fill in the amount/date and any configured extra fields → save; the user's Firestore records update the current view.
2. **Review spending:** choose the period (year, month, week, day, all), apply search/categories and export the relevant view. Keep the active period explicit.
3. **Manage investments:** open Portfolio → create positions and verify balances → inspect snapshots, earnings and reconciliations. Recording a portfolio return is an explicit step, not a passive balance-delta assumption.
4. **Review a Visa PDF:** choose a card statement transaction → upload a supported digital PDF (up to **4 MiB**) → inspect the parsed totals/consumptions → explicitly confirm saving. The saved detail is **not** a separate expense for every purchase.
5. **Ask Lita:** open the assistant from Transactions or Portfolio → LTC passes the current bounded financial context to the embedded assistant → continue the conversation; LTC maintains chat history under the signed-in user's Firestore data.

## Repository layout

| Path | Responsibility |
| --- | --- |
| `src/pages/` | Transactions, portfolio, authentication and routed screens |
| `src/components/` | Forms, widgets, charts, assistant host and responsive UI |
| `src/actionCreators/` + `src/reducers/` | Redux state and transaction/auth actions |
| `src/services/` | Firestore-backed portfolio, categories, statements, notifications and chat history |
| `src/utils/` | Pure accounting/date/export/validation helpers with unit tests |
| `src/shared/config/firebase/` | Firebase client configuration |
| `firestore.rules.*` | **Rule fragments**; not a complete deployable production ruleset |
| `docs/` | [Architecture](docs/architecture.md), [development](docs/development.md), and feature-specific guides |

## Security and deployment

- **Netlify** serves the SPA; `netlify.toml` rewrites deep links to `index.html`.
- **Firestore** data is organized under `users/{uid}`. Security Rules, not client-side filtering, must enforce user isolation.
- **Firebase Rules are not automatically deployed** from this repository. Merge fragments into the *existing live ruleset*, validate with owner/non-owner tests, then publish via Firebase Console/CLI.
- **Personal category tooltip descriptions:** Category management supports an optional, editable `description` (max 500 characters) stored only in `users/{uid}/customCategories/{categoryId}`. Publish the updated `firestore.rules.customCategories` fragment **before releasing the new UI**, otherwise Firestore will reject description writes. The change does not modify shared categories, transaction comments, category identity, or existing expenses.
- Card PDFs are analyzed on **Lita**, not uploaded to a client-side AI provider. The Lita API authenticates the upload and rejects unsupported/irreconcilable layouts.
- Never commit real bank PDFs, transaction exports, account numbers, ID tokens, API keys or provider response logs containing private financial information.

### Documentation

- [Architecture and data flows](docs/architecture.md) — system diagram, Firestore layout, sequence diagrams, correctness boundaries.
- [Development, testing and release](docs/development.md) — local setup, security changes, CI and deployment checklist.
- [Portfolio model](docs/portfolio.md), [credit-card PDF import](docs/card-statement-pdf.md), [Lita chat history](docs/lita-chat-history.md).
- [Lita server README](https://github.com/franciscofunes/lita-assitant) — separate AI/PDF deployment and provider configuration.

**Status note:** documentation describes functionality in `main`. Draft or unmerged PRs (including service-specific field presets when applicable) should not be treated as released features.

## Contributing

Run `CI=true npm test -- --watch=false --runInBand` for regression coverage and `npm run build` before a PR. Update both code and documentation when changing accounting semantics, Firestore paths, cross-origin communication, or the Lita API contract. See [Development](docs/development.md) for targeted tests and operational checks.

## Standalone Lita advice widget (security)

The older `LitaAssistant` component now sends user questions to the authenticated Lita backend via `src/services/litaAdviceService.js` → `POST https://holalita.vercel.app/api/ltc/advice`, using the signed Firebase ID token from the current user's session. Lita owns all AI provider keys, enforces financial scope and returns sanitized financial answers. The legacy `/v1/completions` browser call and the retired `text-davinci-003` model have been removed. The main Lita iframe and existing PDF analyzer are unchanged.

**Deployment order:** deploy the companion [Lita backend](https://github.com/franciscofunes/lita-assitant) endpoint first, then LTC. Confirm Lita `FIREBASE_PROJECT_ID` matches LTC's `REACT_APP_PROJECT_ID`, and that the browser origin is allowed. After both deploy, **rotate the previously browser-exposed OpenAI key and delete `REACT_APP_OPENAI_API_KEY` from Vercel/Netlify environments**. No `REACT_APP_` key is secret in a client build.
