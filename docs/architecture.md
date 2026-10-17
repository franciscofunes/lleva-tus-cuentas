# LTC architecture and data flows

This document describes the implementation on `main`, not a proposal. **LTC owns user-facing records and persistence; Lita owns AI chat processing and authenticated digital-card-PDF parsing.** See [the Lita server architecture](https://github.com/franciscofunes/lita-assitant/blob/main/docs/architecture.md) for its internal processing.

## 1. Components and trust boundaries

~~~mermaid
flowchart TB
    User["User / browser"] --> Router["LTC routes and components"]
    Router --> Redux["Redux actions and reducers"]
    Router --> Services["Client services"]
    Redux --> Services
    Services --> Auth["Firebase Auth SDK"]
    Services --> FS[("Cloud Firestore / users/{uid}")]
    Router --> Panel["LitaAssitantPanel iframe host"]
    Panel -- "postMessage: context / history" --> Lita["Lita / Chat.tsx"]
    Lita -- "POST /api/chat + context" --> Chat["Chat API: scope + output checks"]
    Chat --> Providers["AI provider pool"]
    Services -- "PDF + Firebase ID token" --> Analyzer["Lita PDF analyze endpoint"]
    Analyzer --> Verify["JWT verification"]
    Verify --> Extract["PDF.js parser + strict reconciliation"]
    Extract -- "structured preview" --> Services
    Services -- "explicit review / save" --> FS
~~~

The parent verifies the iframe's **origin and window source** when handling messages; the iframe has a configured parent-origin allowlist. The financial context passed to chat is *data*, not trusted instructions. Unlike the authenticated PDF endpoint, `/api/chat` does not itself perform Firebase JWT verification; do not assume it can write to Firestore.

## 2. Browser routes and state

- Public: `/`, `/ingresar`, `/registrarse`, `/recupero`.
- Protected: `/transacciones`, `/portfolio`, `/portfolio/:positionId`, plus subscription/payment routes.
- Routing: `src/index.js` and `ProtectedRoute`; layout and navigation: `Navbar`.
- Transactions: `Dashboard` + `TransactionForm`, `ExpenseFilter`, `FinancialOverviewPanel`. Redux holds loaded transaction/category/filter data, while form controls hold the in-progress draft.
- Portfolio: `Portfolio` and `PortfolioDetail` use subscriptions in `portfolioService`; snapshots and reconciliations are separate records from current position balances.

## 3. Per-user Firestore document structure

~~~mermaid
flowchart LR
    Root["users/{uid}"] --> Expenses["expenses/{expenseId}<br/>financial movements"]
    Root --> Categories["customCategories/{categoryId}<br/>private category metadata"]
    Root --> Positions["portfolioPositions/{positionId}"]
    Root --> Snapshots["portfolioSnapshots/{snapshotId}"]
    Root --> Recs["portfolioReconciliations/{reconciliationId}"]
    Root --> Chats["litaChats/{threadId}"]
    Root --> Reminders["notifications/{notificationId}"]
    Root --> Statements["cardStatements/{pdfSha256}"]
    Statements --> Items["items/{index}<br/>statement purchases"]
~~~

**Important relationships and invariants:**

| Record | Purpose | Important rule |
| --- | --- | --- |
| `expenses` | ARS/USD movements; financial/category/date fields, optional `customDetails` | Amounts, operations and currencies must not be inferred from metadata alone |
| `customCategories` | Per-user names, expense/income flag, archived state, immutable `extraFieldIds` | At most three identifiers from an LTC-controlled catalog |
| `portfolioPositions` | Current investment/account positions | Keep currencies separate and distinguish principal from returns |
| `portfolioSnapshots` | Historical observations | Snapshots are observations, **not** automatically earnings |
| `portfolioReconciliations` | Period reconciliation status / linked transaction | `registerReconciliationTransaction` runs a Firestore transaction to avoid duplicate registration |
| `litaChats` | User's conversation history | Saved by LTC client, not the stateless Lita chat function |
| `cardStatements` + `items` | Reviewed PDF data and purchase lines | Statement ID is the PDF SHA-256; purchase lines are **not** new `expenses` documents |
| `notifications` | Pending/paid and dismissed reminders | Service/category due-date interpretation comes from `transactionDueDates` |

The shared category catalog is separate from private custom categories. The client merges them for display. Existing categories and historical transactions must continue to work when optional fields are absent. Configuration of new optional fields belongs to the category; values belong to the transaction.

## 4. Transaction and notification lifecycle

~~~mermaid
sequenceDiagram
    actor User
    participant UI as TransactionForm
    participant Rules as Date and metadata helpers
    participant DB as Firestore
    participant N as Notification sync
    User->>UI: Choose category and enter fields
    UI->>Rules: Validate allowed customDetails
    UI->>Rules: Resolve dueDate + lead days
    Rules-->>UI: Sanitized draft
    UI->>DB: Create or update users/{uid}/expenses
    DB-->>UI: Document ID / success
    UI->>N: Sync notification for this expense
    N->>DB: Update or delete users/{uid}/notifications
    UI-->>User: Success or actionable error
~~~

The specialized credit-card statement form uses `selectedCloseDate` and `selectedExpirationDate`. Older service categories can treat `selectedDate` as due date according to `transactionDueDates`. The service-template work that changes this interpretation for *new configured personal categories* is **not part of this main-branch design until merged**. Any change here must cover category changes, expired reminders, previously paid bills, and legacy records.

## 5. Digital Visa statement review

~~~mermaid
sequenceDiagram
    actor User
    participant LTC as LTC browser
    participant Auth as Firebase Auth
    participant API as Lita PDF API
    participant Parser as Digital PDF parser
    participant DB as Firestore
    User->>LTC: Select PDF in card statement form
    LTC->>Auth: getIdToken()
    Auth-->>LTC: Firebase ID token
    LTC->>API: POST multipart PDF + Bearer token
    API->>API: Check Origin, token, size and signature
    API->>Parser: Extract PDF and reconcile ARS / USD
    Parser-->>API: Verified structured statement
    API-->>LTC: Review-only JSON or error
    User->>LTC: Explicitly approve prefill and save
    LTC->>DB: Save or update one expense
    LTC->>DB: Save reviewed statement and items
    DB-->>LTC: Saved
~~~

- Only supported digital Visa layouts are accepted; this is **not OCR** and does not send the PDF to a chat model.
- Size limit: **4 MiB**; server validates signature and supports its documented page/layout limits.
- Default file handling is volatile Lita server memory. Optional temporary Edge Store mode belongs to Lita and is **opt-in**.
- A card's payment can be a single `expenses` entry; imported purchases remain statement details. Reconciliation rejects unexplained discrepancies by currency and avoids inventing currency conversion.
- A user-authenticated batch saves detail under their own UID, with SHA-256 duplicate protection. This requires live Firestore rules in addition to code.

## 6. Lita context and persisted conversation

~~~mermaid
sequenceDiagram
    participant LTC as LTC host
    participant FS as User Firestore
    participant Iframe as Lita iframe
    participant API as Lita chat API
    participant AI as Provider
    LTC->>FS: Subscribe to users/{uid}/litaChats
    LTC->>Iframe: postMessage context + theme + history
    Iframe->>API: Send recent messages + financial context
    API->>API: Check scope and sanitize context
    API->>AI: Request bounded financial answer
    AI-->>API: Generated text
    API->>API: Validate final text
    API-->>Iframe: Response
    Iframe->>LTC: postMessage history updates
    LTC->>FS: Save user-owned thread
~~~

The assistant does not have general internet browsing or automatic authority to apply portfolio changes. Its suggestions require manual financial verification. A user's instruction inside a copied export must not override the server's financial-domain controls.

## 7. Currency, accounting and security decisions

1. **Currency isolation:** No ARS + USD summation without an explicit rate and timestamp. Dashboard charts and exported records should state their scopes.
2. **Cash flow versus return:** Contributions, transfers, redemptions and exchanges move assets; they are not inherently gains or losses. Reported earnings do not certify performance.
3. **User data isolation:** Firestore paths include `uid`; enforce ownership in deployed **Security Rules**. Repo `firestore.rules.*` files are *fragments*, not the full active ruleset.
4. **External calls:** `usdQuotesService` fetches public indicative dollar rates without submitting user financial data. Lita requests may send financial context to configured third-party AI providers, so validate data policies before enabling one.
5. **No secret leakage:** Browser `REACT_APP_*` values are public build-time configuration. AI/Edge Store keys belong exclusively to server-side Vercel variables.
6. **Safe release order:** Publish and test additive Firestore rule changes **before** enabling frontend data shape changes. Never replace unrelated live matches or broaden access to all users.

## 8. Key source references

- `src/actionCreators/databaseActions.js`: transaction writes, category reads, notification sync.
- `src/services/portfolioService.js`: positions, snapshots, reconciliations.
- `src/services/cardStatementService.js`: file analysis call, review verification and item persistence.
- `src/services/litaChatService.js` / `src/components/LitaAssitantPanel.js`: history and iframe protocol.
- `src/utils/categoryExtraFields.js` / `src/utils/transactionDueDates.js`: category configuration, due-date semantics.
- `src/services/notificationService.js`: notification lifecycle.

Continue with [local development and release](development.md) or the [Lita internals](https://github.com/franciscofunes/lita-assitant/blob/main/docs/architecture.md).

## Legacy standalone Lita widget: signed proxy

The optional older `LitaAssistant.js` now authenticates to the server-side Lita advice route rather than calling OpenAI from the browser. It obtains the current Firebase ID token and POSTs a bounded financial question to `/api/ltc/advice`; Lita verifies the token, checks the LTC Origin, and delegates to the existing financial chat provider pipeline. The regular embedded Lita iframe and signed statement PDF endpoint are not changed. No provider credentials or ChatGPT secrets belong in `REACT_APP_*` variables.


## Optional transaction location and geographic insights

Expenses can optionally store `location:{label,source,latitude?,longitude?}`, independent of their category. A manual label has no coordinates and cannot appear on the map; no geocoding occurs. `navigator.geolocation.getCurrentPosition()` is called **only** when a user explicitly selects «Usar ubicación actual» and after browser consent on HTTPS. Coordinates are rounded to three decimals before storing. No background tracking, GPS accuracy/history, or automatic location migration.

The transaction chart selector adds an opt-in OpenStreetMap-based map, spending by weekday and spending by merchant-name. The map requests OSM tiles only after explicit user action and displays attribution; no transaction amounts or names are sent to the map provider. Use a commercial or self-hosted tile service if OSM's public tile limits become relevant. Financial insights exclude card-statement totals, FX conversions and income to prevent double counting, and offer separate ARS/USD views.

**Deployment dependency:** This repository does not publish live Firebase rules. Merge the additive `firestore.rules.transactionLocation` function into the **existing owner-scoped** Firestore expenses match, and include `location` in any allowed-fields list. Test create/update/delete and other-user rejection before merging the feature for production. Existing location-less documents remain valid.
