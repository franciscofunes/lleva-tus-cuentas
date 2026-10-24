# Issue #242 — Optional local category suggestions (phase 1 / native-browser pilot)

**Status: implemented behind an opt-in feature flag, NOT a Browser AI SDK dependency and NOT cross-browser certified.**

## What is shipped

- `src/services/localCategorySuggestions.js` is a minimal adapter to the browser's native **Prompt API** (`window.LanguageModel`). This is the *underlying browser capability* used by `@browser-ai/core`, not a claim that an `@browser-ai/*` package is installed. We avoid upgrading CRA React Scripts 5 / Node 20 to AI SDK v7/Node 22 and avoid introducing large model packages into the production bundle.
- For an imported statement still in review, when **Revisar y categorizar consumos** is expanded and privacy is visible, the feature optionally suggests pre-existing expense categories for rows that deterministic rules leave `Sin categorizar`. Only up to **12 descriptors** and **30 pre-existing category labels** are included in the single local prompt. Merchant strings containing email/URL, long digit sequences, or more than 80 characters are skipped.
- An explicit **Sugerir categorías en este dispositivo** button requests a local model session (and may trigger a large first-time browser model download); availability is checked without downloading anything. Results are validated against an exact allow-list of existing categories, expected item indexes, and duplicate prevention. Model answers **NEVER** create categories or change the draft automatically.
- Each offer has a 44px **Aplicar sugerencia** control; only a click changes that one field in the *unsaved* draft. The user can change it using the existing `select`, and normal PDF review/save validation remains unchanged. Amounts, currency, payments, due dates, fees, taxes, PDF content, hash, analytics flags and income/expense calculations are untouched.
- Privacy hiding, component unmount, new PDFs and cancel abort pending inference and suppress stale results. There is **NO cloud fallback and no server endpoint for inference**. No financial information is passed to a remote LLM. Local model provider or browser may download model weights, per its own policies.

## Enabling

In local development, the pilot is enabled automatically. In preview/staging builds set **`REACT_APP_LTC_LOCAL_AI_CATEGORIES=true`** at *build time*, then redeploy; leave it unset in production. The button is displayed only if the PDF has an unresolved safe merchant and the global banking amounts are visible. Browsers without `LanguageModel` show the deterministic manual controls and an informative availability message, not an AI button.

Requirements: HTTPS (or localhost), a desktop Chrome/Edge with a supported native Prompt API, enough hardware/storage, and possibly an initial model download initiated by the user. Chrome's documentation says native foundation-model Prompt API is not available on Android/iOS at the time of this pilot. On mobile or unsupported devices, all standard import/category flows remain functional.

## Regression gates and gaps

- `localCategorySuggestions.test.js`: eligibility, no financial identifiers/amounts in prompt, invalid/malicious category proposals, duplicates, unsupported browsers and aborted model runs.
- `CardStatementPdfReview.test.js`: feature off by default, explicit proposal/accept sequence, original ARS/USD totals unchanged, unavailable status, redaction and cancellation when masking privacy mid-run.
- Existing `Banks.pdfJourney.test.js`: one ARS summary expense only, USD separate, no extra charges, exact due date and privacy controls.
- CI test + build/doc check. **No real model inference benchmark or authenticated non-production browser test has been run yet.** Before enabling beyond preview, measure download size/time, warm/cold response, RAM usage, Android fallback, Spanish category suggestion quality and 30–50 synthetic Argentine merchant examples; consult issue #242.

## SDK follow-up

Official `@browser-ai/core@2` supports **AI SDK v6**, and v3 targets **AI SDK v7 requiring Node >=22**. The next optional phase may replace this isolated native adapter with `@browser-ai/core@2` and a pinned AI SDK v6 **only after** lockfile/build compatibility and performance are proven. Do not silently change to server fallback. The feature flag, allow-list and explicit per-item approvals remain mandatory. A `Transformers.js` WebGPU/WASM path should be evaluated separately if mobile support becomes a priority.

Official references:
- https://www.browser-ai.dev/docs/ai-sdk-v6/getting-started
- https://www.browser-ai.dev/docs/ai-sdk-v7/getting-started
- https://developer.chrome.com/docs/ai/prompt-api

# Why no automatic saving?

This is a financial UI. AI text can be inaccurate or instruction-injected through merchant descriptions. Generated categories remain **untrusted proposals**. The final authority is the owner's selection, and the existing full-statement cents reconciliation remains independent of any AI result.
