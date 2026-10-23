# Financial UI — authenticated cross-page visual QA matrix

This is the repeatable **evidence gate** left open in issues [#226](https://github.com/franciscofunes/lleva-tus-cuentas/issues/226), [#227](https://github.com/franciscofunes/lleva-tus-cuentas/issues/227), [#228](https://github.com/franciscofunes/lleva-tus-cuentas/issues/228), and [#229](https://github.com/franciscofunes/lleva-tus-cuentas/issues/229).

**Transactions is the design reference**. Do not build separate per-page design systems or declare a UX change visually verified from source-only tests. The QA suite deliberately reuses the already approved **authenticated test account** workflow and existing Playwright config; it does not create new accounts, seed records or write to Firestore.

## What is now automated (with signed-in isolated data)

`e2e/financial-surfaces.authenticated.spec.cjs` covers:

| Surface | ID / reference | 390px | 1440px | 1728px |
| --- | --- | --- | --- | --- |
| Transacciones | `/transacciones`, `#transactions-list` | light + dark | light + dark | light + dark |
| Bancos | `/bancos`, `#bank-management` | light + dark | light + dark | light + dark |
| Portfolio | `/portfolio`, `#portfolio-positions` | light + dark | light + dark | light + dark |

That is **18 masked full-page screenshots** and 18 corresponding **geometry JSON files** per run. Failures are reported for nonvisible sections, document/body horizontal overflow, under-44px first-scan controls and absent primary actions.

The suite also validates:
- Transacciones' approved mobile **summary → activity → tools** DOM scan order across all 3 pages (including Banks' budgets and Portfolio's charts).
- Computed **hero, primary CTA and privacy-control design-token parity** across all pages, using Transacciones as a real rendered reference (at 1440px dark).
- On each page, open Lita via the actual floating menu, expand without replacing its iframe, capture a **masked 390px dark screenshot**, and close it. It does **not** send prompts or delete conversations. Its iframe content may be unavailable on a preview whose origin isn't allowed by Lita; treat that as a separate deployment/integration gap, not as a verified cross-origin flow.

All screenshots go in `.qa-artifacts/playwright`, which is **gitignored** and should remain **local only**. Masking numeric amounts cannot guarantee categories, account names or conversation snippets are non-sensitive; use a synthetic-only QA user and inspect artifacts before sharing.

## Running the suite

```bash
npm ci
npm install --no-save --package-lock=false @playwright/test@1.56.1
npx playwright install chromium

# A staging/preview deployment, never your personal production account.
export LTC_QA_BASE_URL="https://YOUR-UNIQUE-VERCEL-PREVIEW.vercel.app"
node scripts/qa/prepare-auth.cjs

# New shared visual matrix only
npx playwright test --config=playwright.config.cjs e2e/financial-surfaces.authenticated.spec.cjs

# Existing Transactions functional/read-only checks as well
npx playwright test --config=playwright.config.cjs
```

`prepare-auth.cjs` opens a browser for interactive sign-in with an isolated synthetic QA identity. It stores cookies and IndexedDB under `.qa-auth/`, never committed or uploaded. **Treat this as a password.** Run a new `prepare-auth.cjs` whenever the preview hostname changes. Use a QA / non-production Firebase project or a specifically authorized, isolated account; never photograph real financial histories.

Both `prepare-auth.cjs` **and** `playwright.config.cjs` reject known LTC production hosts, HTTP nonlocal origins, credentials in URLs and malformed origins. An explicit `LTC_QA_ALLOW_PRODUCTION=yes` override remains for strictly authorized controlled testing; it is neither used by the suite nor recommended for ordinary runs.

The 18 screenshots and geometry are evidence **only after the suite runs with a real signed-in isolated session**; green GitHub Actions only syntax-checks the suite and executes its fixture-free manifest/security tests.

## CI without private browser state

```bash
node --check e2e/financial-surfaces.authenticated.spec.cjs
node --test scripts/qa/target-policy.test.cjs scripts/qa/financial-surfaces.test.cjs
```

The `Card statement import checks` GitHub job runs these guardrail tests and its existing React/Jest + production compilation on changes to `scripts/qa/**` or `e2e/**`. CI deliberately does **not** fetch Firebase tokens, screenshots or a real account.

## How to evaluate the artifacts

For each surface and viewport/theme, open the PNG alongside the others and inspect:
- Same hero/action hierarchy, shared slate/violet theme and realistic text wrapping.
- 390px order of financial summary before records/activity before optional tools, with no horizontal scrolling.
- Keyboard focus styles, non-clipped buttons and same title/section rhythm. Full-page views cannot simulate a **physical Android keyboard**.
- Whether Lita's host modal shows the same theme, close/expand actions remain reachable and actual iframe loads once its allowed origins are configured.
- The JSON contains geometric positions and computed color/radius samples; **no monetary values**.

Record screenshots and any failures on the corresponding issue after running the suite. **Do not close #226/#227/#228/#229** until authenticated visual evidence, real mobile keyboard checks, accessibility and relevant feature-specific functional journeys have been reviewed.

## Untested by this PR

Create/edit/delete financial movements, FCI NAV reconciliation, imported bank PDF linking, AI provider health, iframe origin configuration, Firestore rules denials and actual Android virtual keyboard behavior are **not** exercised by a read-only screenshot suite. They remain tracked manually or by their existing isolated component tests.

See [Transactions QA #226](transactions-qa-226.md), [UI design contract](financial-ui-contract.md) and [UX roadmap](ux-consistency-roadmap.md).
