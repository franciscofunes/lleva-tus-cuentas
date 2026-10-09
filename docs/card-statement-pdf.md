# Credit card PDF import — LTC

## How to use
1. Sign in, open Transacciones and edit an existing **Resumen tarjeta** expense, or create a new one.
2. Upload a digital Visa statement PDF (4 MiB or smaller) using the mobile-friendly **Seleccionar archivo PDF** button, or drag and drop a file on desktop. Android document providers with no PDF MIME type are accepted when the filename ends in `.pdf`; the server validates the actual file signature.
3. The authenticated LITA API analyzes the file in volatile memory, optionally stores it as a **temporary** Edge Store object when both server-side keys are configured, reconciles statement totals and returns structured data only.
4. Inspect close/due dates, totals in ARS and USD, purchases, installments and suggested categories.
5. Click the **explicit** pre-fill button if you want to update the transaction values.
6. Save the statement once. The detail is saved as a per-user Firestore subcollection, never as additional expense transactions.
7. Use **Ver consumos del resumen** in the transaction card to expand the saved detail.

Existing card payments remain single expense transactions. The PDF does not automatically create a duplicate expense or convert USD to ARS.

## Firestore rules: REQUIRED before enabling upload on production
Merge the owner-only matches in firestore.rules.cardStatements into the live Firestore rules under match /databases/{database}/documents, preserving all existing LTC rules. Do not replace the whole production ruleset with the fragment.
Deploy rules through the Firebase Console / CLI and test that:
- User A can create/read their own statement and purchase details.
- User B cannot create/read/update/delete User A's records.
- Documents without countedInCashFlow:false cannot be written.
- A statement cannot point to an unrelated or missing expense.
- Batched parent and item writes succeed (existsAfter check).

Only after deployed rules can the app persist the approved information. The companion LITA PR provides API-side ID-token verification; a successful Netlify build by itself does not verify this integration.

## Duplicates and retry
The SHA-256 digest of the PDF is the statement document ID inside users/{uid}/cardStatements. The same document cannot be attached to a different expense. If the expense save succeeds but the detail batch fails, the open form retains the created expense ID; retry updates it instead of creating another expense.

## Security and privacy
Never add Edge Store keys to REACT_APP_* env vars. The client sends a Firebase ID token to LITA, and does not store the PDF or its full card identifiers. The API derives UID from the validated token and holds the file only temporarily. This feature is NOT an OCR engine and does not send PDFs to external LLMs. Unsupported PDFs are declined rather than guessed.

## QA
- Mobile Android narrow viewport + desktop + dark/light mode.
- Existing statement edit vs create, 83-item review, category dropdown, import duplicate, failed upload and retry.
- Correct source amounts in both currencies; single ARS transaction entry, separate USD statement total.
- No duplicate transaction entries after retry and no cross-user reads.
- The linked details can be reopened from Transacciones.
- Rule deployment + real credentialed Edge Store upload/delete must be tested before merging to production.


## Second bank: Banco Ciudad Visa Gold
The 2-page digital Banco Ciudad PDF is now recognized in addition to Santander Visa. LTC shows **consumos**, **administrative fees**, and **IVA** separately: they reconcile to the ARS statement total, but no line item is added again as a transaction. The original purchase installment number is preserved.

Important: Update **the live Firestore rules** before testing Banco Ciudad writes. In `firestore.rules.cardStatements`, `feesArs` is an **optional validated decimal string**, not required for old Santander records. Add it to the statement `hasOnly` allowlist and verify that the rule permits the optional field. This repository fragment does not deploy rules automatically. All reads/writes remain within the authenticated user's subcollections.

For the supplied Banco Ciudad PDF, five ARS purchases total 212,929.40; fees 6,138.02 plus VAT 1,288.98 reconcile to 220,356.40 ARS. The previous payment clears the prior balance; do not double-count it. All private identifiers stay out of tests and logs.

## Free Firebase / troubleshooting
The upload and analysis do **not** need Firebase Blaze, Cloud Storage or App Check. LTC still signs in through Firebase Authentication, LITA validates the signed ID token using Google's public keys, and approved data is saved under `users/{uid}` with strict Firestore rules. If LITA shows an authentication configuration error, check `FIREBASE_PROJECT_ID` on the **Vercel/LITA** project: it must match LTC `REACT_APP_PROJECT_ID`, without quotes, followed by a fresh production deployment. Do not disable authentication. Edge Store is optional for parsing; without its secrets, the server holds the PDF only in memory.
