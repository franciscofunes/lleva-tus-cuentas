# Local screenshot OCR — Transactions, Banks and Portfolio

## Scope

LTC can read **PNG, JPG, or WEBP screenshots** with [`runonweb/ocr`](https://github.com/midudev/runonweb.ai), using PP-OCRv6 Small (~31 MB), WebGPU where available and WebAssembly otherwise. The model downloads into the browser on demand after an explicit action; screenshot pixels and detected text are not sent to Lita, Firestore or another inference API. The browser may request public model weights from Hugging Face/CDN; it must not send the screenshot itself.

`runonweb` and the `@browser-ai` AI SDK feasibility study are different projects. This PR uses only `runonweb/ocr`, not the Vercel AI SDK or a general-purpose in-browser LLM.

## Transactions: camera and receipt review

Open `/transacciones` → **Transacciones** → **Escanear ticket de compra** → **Escanear ticket**. The new transaction form opens with **Escanear ticket con cámara o foto** expanded. Alternatively, use **Agregar movimiento** and expand the same control.

- Tap **Abrir cámara para sacar foto** to request browser camera permission **at that moment only**. Confirm the framing and tap **Tomar foto**; the video track stops immediately after capture or closing. On browsers without `getUserMedia`, the button opens the native photo capture picker (`capture="environment"`). The gallery picker always remains available, including on permission denial.
- Read the photo locally. Android defaults to the **Tiny (~6 MB) / WASM** model, which uses less memory; users can explicitly switch to **Small (~31 MB)** for improved accuracy. Desktop defaults to Small. All OCR outputs may contain mistakes.
- The receipt parser proposes only a plausible merchant, a **unique explicitly labeled total** (not subtotal, tax, change or several competing totals), and a recognizable issue date. Missing or ambiguous values stay empty. The category is **never inferred**; a bare `$` does not prove ARS vs USD. The user must choose the correct expense category and native currency.
- Check detected values against the photo, choose fields, and click **Aplicar campos seleccionados**. This changes an **unsaved form draft only**. Confirm the exact ARS/USD currency, amount and date before clicking **Crear transacción**. If the chosen category currency contradicts the receipt, the form blocks application and requests another category. No Firestore schema/rules changes and no camera image or OCR transcript persists.
- Hiding financial values removes photo and text from the review UI and stops the camera. The app does **not** request camera access on page load.

## Banks: existing review and financial contract

**Finding the feature:** open `/bancos`, expand **Mis bancos**, and use the visible **Importar captura de consumos → Importar captura** shortcut above the list of banks. You need at least one registered card; the importer asks which bank/card receives the reviewed data. You no longer need to expand an individual bank and card to discover the feature. The original per-card entry remains available.

`CardConsumptionMarkdownImporter` offers **Desde captura** and **Pegar Markdown**. Both converge on the existing `parseCardConsumptionMarkdown` validator, explicit bank/card assignment, duplicate checks and `importReviewedCardConsumptionMarkdown` confirmation. A screenshot creates one reviewed **snapshot** (current card consumption) or one **charge** (individual purchase) at a time. For screenshots with multiple individual purchases, import separately or use the existing batch Markdown path (10 records maximum).

- The OCR adapter pre-fills only *unambiguous*, explicitly labeled `Consumos ARS/USD` and an explicitly labeled consultation date. A single dated merchant row with an explicit currency may also suggest one charge; multiple rows are never silently collapsed into one. Anything missing, ambiguous or error-prone is left blank for owner correction. Plain balances or card payments are never inferred as purchases.
- Current consumption is a card snapshot, not an `expenses` transaction. Approved individual charges remain `countedInCashFlow:false`. The existing deduplication, no-double-counting and native-currency rules are unchanged.
- All suggested amounts, dates, banks and cards are editable or chosen by the owner and must pass the original parser. The owner sees the original OCR text on demand and explicitly confirms before any Firestore write.
- Privacy mode hides the entire financial import/review UI and blocks new recognition and confirmation. Close/reopen resets ephemeral screenshot state.

## Portfolio: existing Markdown comparison

**Finding the feature:** open `/portfolio`, expand **Posiciones**, then use **Importar captura de inversión**. Choose an existing position or **Nueva posición** and click **Importar captura**; the existing editor opens with the OCR reader already expanded. This does not save data until you explicitly review, apply, and save the position. The original edit-form Markdown entry remains available.

The **new/edit position** modal includes the same local screenshot reader above its editable source-text field. Exact supported labels such as `Saldo actual`, `Cuotapartes`, `Valor cuotaparte`, `Tasa anual` and `Vencimiento` become explicitly labeled suggestions for the existing `parsePortfolioMarkdown` comparison. Source text remains visible for owner verification; unmatched fields are ignored.

The owner selects individual changes and clicks **Aplicar campos seleccionados** to update only the unsaved form draft; a separate **Guardar posición** persists the reviewed form. Balance changes never become earnings or withdrawals, no exchange rates are invented, and native currencies remain distinct. Privacy mode hides screenshot content and import proposals. No new Firestore fields or rules are required.

For a **fixed-term deposit** screenshot, the OCR normalizer recognizes explicitly labeled **Moneda**, **Vencimiento** (including two-digit years), **Fecha de valor**, **Tasa de interés nominal** and **Tasa de interés efectiva**. It deliberately ignores **Intereses devengados** and **Intereses totales** as realized earnings or capital: accrued/projected interest is not a cash receipt or balance update. The owner still reviews every suggested field.

## Build compatibility

`runonweb@0.1.0` publishes TypeScript sources in its ESM exports. This cannot be parsed directly by LTC's Create React App 5 / Webpack configuration. `npm run prepare:browser-ai` uses a pinned `esbuild` dev dependency to bundle **only `runonweb/ocr`** to ignored `src/generated/browser-ai/` artifacts. `prebuild` and `pretest` regenerate them. `LocalScreenshotOcr` imports the resulting module dynamically; it is not part of the initial dashboard bundle. The generated files should not be committed.

**Android compatibility fix (v2):** runonweb 0.1.0 hardcodes the ONNX Runtime WASM asset URL for **v1.30.0**, while its dependency range installs a newer JS runtime (e.g. **v1.31.1**). Its previous CDN workaround still required the user's Android browser/network to access jsDelivr, and could fail on restricted networks. The build now copies the *exact installed* WASM binaries into generated `/public/ocr-runtime/` assets and replaces the SDK hardcoded URL with the **same-origin** `/ocr-runtime/` path. Vercel/Netlify serve them from the deployment itself. Never commit generated binaries; `prepare:browser-ai` runs before tests and builds and the regression check asserts their signatures, sizes and generated path. The detector/recognizer ONNX model weights and dictionary still download from Hugging Face only after opt-in, and remain cached by the browser.

**Diagnosing mobile reports:** the panel explicitly identifies **Lector local v2**, so a screenshot that still says "aprox. 31 megabytes" / "No se pudo analizar" comes from an older loaded tab. Reload the page or close/reopen that tab after deployment before testing again. Error messages display safe categories without filenames, transcripts or backend URLs: `OCR-NET` = weights/dictionary network download, `OCR-MOTOR` = ONNX/WASM init, `OCR-MEM` = memory, `OCR-IMG` = image decode/inference, `OCR-TEXT` = no recognizable text, `OCR-INIT` = other setup error. If it still fails, record only the code, phone/browser model and whether Tiny was selected; do not collect private financial screenshots or raw errors. This workaround improves reliability but **does not prove** success on a real Android device without an actual on-device test.

## QA and boundaries

- Test cold model download progress, cached/warm loading, WebGPU and WebAssembly on the production HTTPS preview. The SDK's own published timing figures were measured on a laptop, not an LTC user Android device.
- Test narrow widths (360/390 px), 1440/1728 desktop and both `html.dark` themes. Verify focus, 44px targets, disabled/error/progress states, privacy reveal/hide and no horizontal overflow.
- Use synthetic screenshots first, then explicit owner-supplied bank/portfolio screenshots. Check Argentine `1.234,56` separators, ARS/USD independently, OCR errors (`0/O`, `1/I`, decimal mark), date conversion, multi-card ambiguity and retries.
- Reject images other than PNG/JPEG/WEBP or larger than 8 MiB. Never persist the file, extracted raw text or credentials, and never log private OCR output. If the SDK fails or a browser cannot run it, the original manual/Markdown import path remains available.
- All browser AI output is **untrusted suggestion text**. It cannot call a bank, update balances automatically, change categories or create a transaction without owner review.
