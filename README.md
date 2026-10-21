# Lleva Tus Cuentas (LTC)

**Personal finance, transactions, investments, and AI-assisted analysis — one account, separate currencies.**

[Open the app](https://llevatuscuentas.vercel.app/) · [Architecture](docs/architecture.md) · [Development](docs/development.md) · [Portfolio guide](docs/portfolio.md) · [Card statement import](docs/card-statement-pdf.md)

LTC is a responsive **React 18** single-page application hosted on **Vercel**. Users authenticate with **Firebase Authentication** and manage private financial records in **Cloud Firestore**. The companion **[Lita](https://github.com/franciscofunes/lita-assitant)** Next.js application, hosted on Vercel, provides contextual financial chat and server-side PDF statement analysis.

> **Financial integrity:** LTC tracks ARS and USD separately. A transfer, foreign-exchange sale, cash withdrawal, or portfolio balance change is not automatically an expense or realized investment loss. Estimates and reported earnings are not audited returns.

## At a glance

| Area | What you can do | Key implementation |
| --- | --- | --- |
| Transactions | Record, edit, categorize, search and filter money movements; navigate months; export XLSX/Markdown | `src/pages/Dashboard.js`, Redux and `users/{uid}/expenses` |
| Categories | Use shared categories or create private, archivable categories with editable tooltip descriptions and up to three **approved** optional fields | `CategoryManager`, `categoryExtraFields`, Firestore |
| Due dates | Track bill/card due dates, payment state and reminders | `transactionDueDates`, `notificationService` |
| Banks | Manage user-owned ARS/USD accounts, multiple cards and manually recorded balances and charges | `Banks`, `bankingService` |
| Spending guardrails | Track approximate open-cycle card consumption from bank screenshots + later purchases; color-coded personal limits, exact remaining/overage, historical PDF peak comparisons, in-app notices | `CardSpendingControls`, `cardBudgetProgress`, `cardSpendingInsights` |
| Screenshot Markdown | Upload screenshots to ChatGPT separately, review Markdown and link each snapshot/charge to the correct bank/card; prevent duplicate imports | `CardConsumptionMarkdownImporter`, `cardConsumptionMarkdown` |
| Global spending map | Explore ARS/USD incoming/outgoing located movements worldwide at multiple H3 resolutions and zoom 0–17 | `SpendingMapChart`, `geoSpendingMap` |
| Analytics & exports | Interactive charts, grouped spending metrics, scoped PDF/Excel/CSV/Markdown exports | Transactions and portfolio chart/export components |
| Portfolio | Manage ARS/USD positions, valuation snapshots and reconciliation records | `Portfolio`, `PortfolioDetail`, `portfolioService` |
| Card statements | Analyze supported **digital Visa PDFs**, review purchases and totals, attach details to one card-payment transaction | Lita PDF API + `cardStatementService` |
| Lita | Ask questions about portfolio/transactions using bounded context and per-user chat history | Cross-origin iframe, `postMessage`, Firestore chat threads |
| Exchange quotes | Show indicative public USD exchange quotes without sending financial balances | `usdQuotesService` |

The UI is intentionally Spanish-language; **engineering documentation is in English**. Features may require the corresponding live Firestore rules to have been applied before writes succeed.

## System overview

~~~mermaid
flowchart LR
    Person["Signed-in user"] --> LTC["LTC SPA<br/>React + Redux<br/>Vercel"]
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
5. **Control card spending:** in Bancos, link reviewed card-statement PDFs across all banks and import bank screenshots using the ChatGPT-generated Markdown format. Choose an owner-only ARS or USD ceiling, inspect exactly what is left before reaching it and compare your current approximate cycle against the highest historical PDF month. Semantically color-coded levels (green <70%, amber 70–<90%, orange 90–<100%, rose >=100%) do not override user-configured alert thresholds.
6. **Explore locations:** in Transactions → worldwide map, explicitly opt in to tiles; filter income/expense and ARS/USD and pan across countries or zoom H3 zones. Locations are only shown when coordinates exist in the saved transaction.
7. **Ask Lita:** open the assistant from Transactions or Portfolio → LTC passes the current bounded financial context to the embedded assistant → continue the conversation; LTC maintains chat history under the signed-in user's Firestore data.

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

- **Vercel** hosts the production SPA at `https://llevatuscuentas.vercel.app/`. `netlify.toml` remains legacy configuration, not the production deployment target.
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


## Card-spending alerts, privacy and PWA readiness

- The **selected budget** is a user-saved limit for each currency, not a credit limit or validated ability to pay. The visual margin panel immediately previews `max(limit - currentRegisteredSpend, 0)` or (once exceeded) `currentRegisteredSpend - limit`. Exact values are calculated in integer cents. **Unsaved previews** are labeled; only the saved amount controls notification events.
- **Color meaning:** emerald <70%, amber 70–<90%, orange 90–<100%, rose >=100% of personal limit. The separate **cyan** card is a *historical PDF reference*, never a green/red safety assessment. Accessibility uses labels and progressbar percentages, not color alone.
- **Current-cycle record:** per-card latest reviewed screenshot snapshot plus later manual purchases; both are incomplete unless the bank has been fully reconciled. Do not add reviewed PDF totals again. Historical high/low and suggested 90%-of-average reference come from linked reviewed PDF statements across banks; ARS/USD remain separate.
- **Notifications currently live:** bell alerts and optional browser notifications while LTC is open, with explicit permission. The existing `public/manifest.json` is PWA-ready but **does not implement background push**; it needs a service worker, device token/subscription, server-side sender and secure scheduled/event processing.
- **Recommended next stage:** Firebase Cloud Messaging (no charge for the messaging service) + owner-scoped subscriptions and an authenticated Lita server sender. For an email fallback consider Resend's free transactional tier (limits apply); SMS should be opt-in paid fallback, not default. See [External notifications / PWA options](docs/external-notifications.md). Nothing external is sent in this release, and email, SMS and closed-app push are **not** promised capabilities.

### More feature documentation

- [Banking, credit-card thresholds and imports](docs/banking-workspace.md)
- [Visual risk design and financial accessibility](docs/ui-design-guidelines.md)
- [Transactions UX audit (Better Design, October 2026)](docs/transactions-ux-audit-2026-10.md)
- [Transactions activity-first follow-up, issue #221](docs/transactions-issue-221.md)
- [Transactions compact cards, issue #225](docs/transactions-issue-225.md)
- [Authenticated Transactions QA: browser screenshots and safe flow verification](docs/transactions-qa-226.md) · [Cross-page UX roadmap: Transactions → Bancos → Portfolio → Lita](docs/ux-consistency-roadmap.md)
- [External notifications, PWA, Web Push and provider tradeoffs](docs/external-notifications.md)
- [Deployment and testing](docs/development.md)

## Contributing

Run `CI=true npm test -- --watch=false --runInBand` for regression coverage and `npm run build` before a PR. Update both code and documentation when changing accounting semantics, Firestore paths, cross-origin communication, or the Lita API contract. See [Development](docs/development.md) for targeted tests and operational checks.

## Standalone Lita advice widget (security)

The older `LitaAssistant` component now sends user questions to the authenticated Lita backend via `src/services/litaAdviceService.js` → `POST https://holalita.vercel.app/api/ltc/advice`, using the signed Firebase ID token from the current user's session. Lita owns all AI provider keys, enforces financial scope and returns sanitized financial answers. The legacy `/v1/completions` browser call and the retired `text-davinci-003` model have been removed. The main Lita iframe and existing PDF analyzer are unchanged.

**Deployment order:** deploy the companion [Lita backend](https://github.com/franciscofunes/lita-assitant) endpoint first, then LTC. Confirm Lita `FIREBASE_PROJECT_ID` matches LTC's `REACT_APP_PROJECT_ID`, and that the browser origin is allowed. After both deploy, **rotate the previously browser-exposed OpenAI key and delete `REACT_APP_OPENAI_API_KEY` from Vercel/Netlify environments**. No `REACT_APP_` key is secret in a client build.
