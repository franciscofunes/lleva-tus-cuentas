# Browser AI SDK feasibility — LTC$ (2026-10-24)

## Which SDK?

This evaluation concerns **@browser-ai** (https://www.browser-ai.dev), the community providers for the **Vercel AI SDK** allowing local in-browser model inference with `@browser-ai/core`, `@browser-ai/transformers-js` and `@browser-ai/web-llm`. This is NOT the similarly named `browser-use-sdk` for controlling a cloud browser. LTC currently runs a **Create React App / React Scripts 5** client with **no `ai` or `@browser-ai/*` dependency**. The CI uses Node 20. Browser AI v3 integrates with AI SDK 7 / Node >=22, while v2 is documented for AI SDK 6. Upgrading dependencies just for experimental functionality would expand the risk and production bundle; do not do it without a measured, isolated spike.

Primary sources:
- Browser AI providers / compatibility: https://www.browser-ai.dev/docs/ai-sdk-v6/getting-started
- Browser AI AI SDK 7 / Node 22: https://www.browser-ai.dev/docs/ai-sdk-v7/getting-started
- Provider documentation: https://ai-sdk.dev/providers/community-providers/browser-ai
- Chrome hardware/device requirements: https://developer.chrome.com/docs/ai/get-started
- Browser Prompt API availability: https://developer.chrome.com/docs/ai/prompt-api

## Recommended usages, ranked

### P1 — Suggest categories in the existing **PDF statement review** (best bounded pilot)

The existing `CardStatementPdfReview` already extracts purchases server-side, makes a conservative, deterministic `guessCategory` suggestion, lets the owner change `suggestedCategory` from available user category names, and marks imported PDF purchases `countedInCashFlow:false`. When rules produce `Sin categorizar`, provide an **opt-in `Sugerir categorías en este dispositivo`** action that processes *merchant descriptions only* and proposes categories **from the user-defined allow-list** (no free-form category creation). Never send amount, balance, account number, card digits, PDF bytes, user ID or financial history to a model. No writes until user reviews the proposals and performs the existing guarded save. Include an explicit banner stating which local engine is in use and never claim local processing if a remote fallback is active.

- Feature detection before rendering/running: actual `LanguageModel.availability()` or provider availability, not user agent sniffing. When unsupported, retain the existing deterministic regex categorizer, and do not offer a broken action.
- User consent for model download, bounded 20-50 merchant rows at a time, timeouts/cancellation, memory limits. Evaluation fixtures need ambiguous Argentine merchants, Spanish descriptors and custom categories, and explicit false-positive/unknown cases.
- Rollout by feature flag/off by default until desktop browsers and model variants pass tests. Treat all generated text as untrusted; validate against the preexisting category list. Never infer monetary values.
- The Chrome browser-native Prompt API foundation model is **not currently available on Android or iOS** per Chrome's docs. Desktop Chrome has significant hardware and storage requirements. This is a **desktop pilot only**, not a mobile-only feature.

### P2 — Browser-only natural-language **transaction search and category suggestions**

The existing Transactions filters and search should remain deterministic. Local AI could turn phrases such as 'consumos del supermercado de septiembre en pesos' into **proposed** existing filter state, with an explicit review/apply step. Never generate, delete, categorize or modify financial rows as a side effect. Prefer a strict parser first; add the model only when intent parsing requires it. This needs a robust confidence, date and currency validation contract.

### P3 — Lita offline low-stakes language assistance

Use local models to rewrite user-entered free-text notes or summarize *non-financial general help*, with the user's consent and zero external requests; continue to use the existing Lita cloud assistant for supported rich tasks. Model size, warm-up and latency make local general financial analysis unsuitable as a default on mobile; give a clear capability/availability fallback. Avoid creating an alternate chat or another UI style.

## Options and compatibility

| Option | Strength | Constraints |
| --- | --- | --- |
| `@browser-ai/core` (native Chrome/Edge) | Local, no separate model embedded in LTC bundle | Native Prompt API is browser/hardware dependent; Chrome built-in generative model currently desktop only |
| `@browser-ai/transformers-js` | Possible WebGPU / WASM fallback, open models | Model downloading and client CPU/GPU/memory use; benchmark Android before release |
| `@browser-ai/web-llm` | Custom client-only language models | Potentially large downloads, WebGPU availability and memory pressure |
| Existing deterministic `guessCategory` | Fast, stable and universal | Rule coverage for new merchants is limited |
| Remote Lita AI | Broad capability and compatible with mobile | Private financial details require explicit data-handling controls, inference cost and provider availability |

## Explicit decision for this PR

**No AI runtime is added to the production app yet.** Implement the actual, verified banking privacy regression first. A follow-up opt-in technical spike should measure availability on desktop (Chrome/Edge), Android fallback, cold/warm latency, download size, Spanish category quality, and total impact on LTC's React production build. Choose a pinned Browser AI / AI SDK version compatible with the stack only after passing those checks. Keep category edits reversible. Gate usage behind user consent.

An in-browser generative model is not a browser *automation* agent; Browser Use, Playwright and computer-use tools are a different architecture. Do not provide a Browser AI model unrestricted access to banking or personal authentication workflows.
