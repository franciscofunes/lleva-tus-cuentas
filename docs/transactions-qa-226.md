# Issue #226 — Transactions authenticated QA and isolated journey tests

## What is automated in CI

`src/components/TransactionsQaJourney.test.js` mounts real SearchBar + Card and the actual transaction scope, bimonetary summary and export helpers with **synthetic-only fixture records**. It validates filtered result counts, individual filter chips, native USD vs ARS, FX purchase classification, list-only sort/pagination, privacy and explicit history expansion. Existing suites already cover conditional form date fields, Firestore mock actions, delete confirmations, category manager and PDF parsing.

This is **component integration / contract testing**, not live browser end-to-end and not Firestore rules deployment validation.

## Authenticated Chromium audit (opt-in, local-only)

Prerequisites: Node 20+, a Chromium-capable computer, an **isolated QA Firebase test user** in a QA/non-production project or an otherwise authorized test account with *synthetic* transactions. Never use personal bank data for test fixtures. No Firebase/admin credentials are checked in.

Run from the repo root:

```bash
npm ci
npm install --no-save --package-lock=false @playwright/test@1.56.1
npx playwright install chromium
export LTC_QA_BASE_URL="https://YOUR-VERCEL-PREVIEW-URL"
node scripts/qa/prepare-auth.cjs
npx playwright test --config=playwright.config.cjs
```

The browser launches interactively: sign in as the authorized QA user; return to the terminal and press Enter. The script saves browser cookies, local storage **and Firebase IndexedDB session data** with `indexedDB:true` to `.qa-auth/storage-state.json`. **That file contains reusable authentication information**: treat it like a password; it and `.qa-auth/browser-profile` are gitignored. Remove both when testing finishes. Do not paste either into chat, attach them to issues, upload them to CI or commit them.

QA screenshots and measurement JSON live in `.qa-artifacts/playwright`, ignored by Git, and are **not uploaded automatically**. They can contain names/categories/dates; amounts are masked with the page's native privacy control. Review/redact before sharing. Production sign-in is deliberately blocked by the auth preparation script.

The runner visits authenticated `/transacciones` and measures at **390, 1440 and 1728 px**, in both light/dark via the **actual LTC theme toggle**. It checks horizontal overflow, toolbar touch targets, real search/filter behavior and keyboard disclosure, then captures local screenshots. A missing category/PDF fixture must be recorded as a **coverage gap**, not counted as passing functional coverage. Browser checks are not part of public CI because they need authorized real sign-in; green Jest does not prove screenshot success.

## Remaining QA and release gate

| Case | Evidence needed | State |
| --- | --- | --- |
| Unit/contract financial scope | Jest, GitHub run log | automated |
| Chrome build/deployment | GitHub + Vercel matching SHA | automatic after PR |
| 390/1440/1728 responsive, light/dark | Local authenticated browser screenshot and geometry | **requires authorized sign-in** |
| Create/edit/delete financial movements | Isolated Firebase emulator or disposable QA project with test data, verify no other user records changed | **manual/E2E pending** |
| Statement PDF details + import | Synthetic PDF linked to synthetic card, assert no duplicate expense | **manual/E2E pending** |
| Lita context and scoped export | Verify live authenticated flow with controlled fixture, no sensitive text logged | **manual/E2E pending** |
| A11y and keyboard overlay | Screen reader/keyboard pass and mobile on-device viewport | **manual pending** |

Do not close #226 or merge a screenshot claim without actual session-backed evidence. If no authenticated fixture is available, leave visual/E2E criteria open and proceed to Banks #227 as a separate scoped issue, explicitly recording the gap.

## Carry-forward to other pages

The same Playwright capture framework can be extended for `/bancos`, `/portfolio` and Lita. Those modules have separate issues [#227](https://github.com/franciscofunes/lleva-tus-cuentas/issues/227), [#228](https://github.com/franciscofunes/lleva-tus-cuentas/issues/228), and [#229](https://github.com/franciscofunes/lleva-tus-cuentas/issues/229). Preserve native ARS/USD, privacy, and document ownership everywhere.

## Cross-page extension

The existing auth/bootstrap and Transactions read-only Playwright tests now share an opt-in browser runner with [financial visual QA](financial-ui-visual-qa.md): 18 theme/viewport/page screenshots, geometry, design token parity, first-scan order and Lita host smoke checks. It needs an **isolated, signed-in QA session**; CI only verifies its static policy/manifest tests. Run `npx playwright test --config=playwright.config.cjs e2e/financial-surfaces.authenticated.spec.cjs` after `prepare-auth.cjs` and keep all artifacts private.
