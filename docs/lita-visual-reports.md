# LTC host support for Lita visual reports

Lita now builds accurate local Canvas PNG reports from the preexisting authenticated, bounded `lita:forecast:request` contract. There is no new expense query and no Firestore write. In Banks, Lita uses `monthlyCardSpending.byCurrency` historical statement aggregates, not individual PDF purchases.

## Opt-in runonweb decorative image

The iframe can send `lita:illustration:request` with **only** a random requestId. The host validates exact iframe source + origin, authenticated user, allowed section (Transactions/Banks), requestId syntax and visible financial values. It dynamically imports `localLitaIllustration` which invokes `runonweb/image` with a **constant generic abstract artwork prompt** (no monetary amounts or user data).

`scripts/build-browser-ocr.cjs` emits an additional image-model ESM entry, without shipping its code or model weights into initial LTC/OCR bundles. The image is generated on the user's GPU with Bonsai Image 4B binary (~3.4 GB first-time download); unsupported WebGPU and devices exposing <8 GB device memory are refused. A progress event returns only requestId and integer progress; the result is a generated PNG Blob, which Lita composites into the Canvas report. Never transfer raw images, financial values or prompts from Lita to the model.

Normal deterministic reporting does NOT depend on WebGPU or runonweb. No custom AI credentials, remote image API or new Firestore collection is needed.

## QA

Run the browser suite including `src/utils/localLitaIllustration.test.js` and production build. CI tests the model integration with a virtual mock only; actual weights/GPU runtime require manual desktop smoke test. Maintain exact postMessage origin/source guards. Roll out the host before Lita.
