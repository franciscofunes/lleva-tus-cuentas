# Local screenshot OCR — Banks and Portfolio

## Scope

LTC can read **PNG, JPG, or WEBP screenshots** with [`runonweb/ocr`](https://github.com/midudev/runonweb.ai), using PP-OCRv6 Small (~31 MB), WebGPU where available and WebAssembly otherwise. The model downloads into the browser on demand after an explicit action; screenshot pixels and detected text are not sent to Lita, Firestore or another inference API. The browser may request public model weights from Hugging Face/CDN; it must not send the screenshot itself.

`runonweb` and the `@browser-ai` AI SDK feasibility study are different projects. This PR uses only `runonweb/ocr`, not the Vercel AI SDK or a general-purpose in-browser LLM.

## Banks: existing review and financial contract

`CardConsumptionMarkdownImporter` offers **Desde captura** and **Pegar Markdown**. Both converge on the existing `parseCardConsumptionMarkdown` validator, explicit bank/card assignment, duplicate checks and `importReviewedCardConsumptionMarkdown` confirmation. A screenshot creates one reviewed **snapshot** (current card consumption) or one **charge** (individual purchase) at a time. For screenshots with multiple individual purchases, import separately or use the existing batch Markdown path (10 records maximum).

- The OCR adapter pre-fills only *unambiguous*, explicitly labeled `Consumos ARS/USD` and an explicitly labeled consultation date. A single dated merchant row with an explicit currency may also suggest one charge; multiple rows are never silently collapsed into one. Anything missing, ambiguous or error-prone is left blank for owner correction. Plain balances or card payments are never inferred as purchases.
- Current consumption is a card snapshot, not an `expenses` transaction. Approved individual charges remain `countedInCashFlow:false`. The existing deduplication, no-double-counting and native-currency rules are unchanged.
- All suggested amounts, dates, banks and cards are editable or chosen by the owner and must pass the original parser. The owner sees the original OCR text on demand and explicitly confirms before any Firestore write.
- Privacy mode hides the entire financial import/review UI and blocks new recognition and confirmation. Close/reopen resets ephemeral screenshot state.

## Portfolio: existing Markdown comparison

The **new/edit position** modal includes the same local screenshot reader above its editable source-text field. Exact supported labels such as `Saldo actual`, `Cuotapartes`, `Valor cuotaparte`, `Tasa anual` and `Vencimiento` become explicitly labeled suggestions for the existing `parsePortfolioMarkdown` comparison. Source text remains visible for owner verification; unmatched fields are ignored.

The owner selects individual changes and clicks **Aplicar campos seleccionados** to update only the unsaved form draft; a separate **Guardar posición** persists the reviewed form. Balance changes never become earnings or withdrawals, no exchange rates are invented, and native currencies remain distinct. Privacy mode hides screenshot content and import proposals. No new Firestore fields or rules are required.

## Build compatibility

`runonweb@0.1.0` publishes TypeScript sources in its ESM exports. This cannot be parsed directly by LTC's Create React App 5 / Webpack configuration. `npm run prepare:browser-ai` uses a pinned `esbuild` dev dependency to bundle **only `runonweb/ocr`** to ignored `src/generated/browser-ai/` artifacts. `prebuild` and `pretest` regenerate them. `LocalScreenshotOcr` imports the resulting module dynamically; it is not part of the initial dashboard bundle. The generated files should not be committed.

## QA and boundaries

- Test cold model download progress, cached/warm loading, WebGPU and WebAssembly on the production HTTPS preview. The SDK's own published timing figures were measured on a laptop, not an LTC user Android device.
- Test narrow widths (360/390 px), 1440/1728 desktop and both `html.dark` themes. Verify focus, 44px targets, disabled/error/progress states, privacy reveal/hide and no horizontal overflow.
- Use synthetic screenshots first, then explicit owner-supplied bank/portfolio screenshots. Check Argentine `1.234,56` separators, ARS/USD independently, OCR errors (`0/O`, `1/I`, decimal mark), date conversion, multi-card ambiguity and retries.
- Reject images other than PNG/JPEG/WEBP or larger than 8 MiB. Never persist the file, extracted raw text or credentials, and never log private OCR output. If the SDK fails or a browser cannot run it, the original manual/Markdown import path remains available.
- All browser AI output is **untrusted suggestion text**. It cannot call a bank, update balances automatically, change categories or create a transaction without owner review.
