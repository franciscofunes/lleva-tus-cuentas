# Banks UX #227 — Phase 4: linked PDF summaries and safe consumption review

**Source of truth:** use the actual Transactions design tokens, not a second design system. After phase 3 introduced progressive association for *pending* PDFs, the linked statements still rendered independent always-expanded white cards with visible action rows and the consumption search could neither filter currencies nor recover from a failed Firestore read.

## Shipped in this phase

- New `LinkedStatementCard` renders each *already associated* imported PDF using the exact `FINANCIAL_ITEM_SURFACE_STYLES`, `FINANCIAL_RECORD_DISCLOSURE_STYLES` and `COLLAPSIBLE_HEADER_STYLES` tokens from Transactions (same as phase 3 pending cards). The first scan shows only statement identity, actual close/due dates, consumption count and separate native ARS/USD totals.
- A labeled 44px `Revisar resumen` control conditionally mounts the existing `CardStatementDetails` on demand. The existing **Corregir vínculo** action remains but is moved behind disclosure; it still launches `StatementLinkEditor`, with its existing confirm-on-unlink/reassign behavior. No write occurs from the new card.
- Switching the Banks privacy toggle hides both total amounts and the entire Firebase-backed consumption child immediately. Closing the disclosure unmounts the child as well. The review can be expanded again without modifying user data.
- `CardStatementDetails` now has accessible 44px **Todos / ARS / USD** filters, independent of text search. Counts show the number of matching items while the **original imported statement totals and count stay unchanged** (these filters never change persisted values).
- Failed Firestore reads expose sanitized, actionable messages and a **Reintentar consulta** button. In-flight reads are invalidated on component unmount or expense-id changes, preventing late-arriving private PDF data from rendering after a privacy toggle/unmount.

## Financial and privacy boundaries

- `/users/{uid}/cardStatements` and subcollection `items` are **read only**. The review card does not create expenses, card charges, links or a bank transaction; it never reconciles sums automatically.
- Historical PDF totals in ARS and USD are independent, not converted or combined.
- Privacy hides monetary values and the underlying PDF detail subtree. Access to an existing association-correction modal is unchanged, because editing the link is separate from viewing purchases.
- Persisted data, ownership rules, indexes, dates, bank budgets, dashboard expenses, reconciliations and import logic are untouched.

## Tests and release gate

- `LinkedStatementCard.test.js`: exact Transactions surface, on-demand disclosure, no premature Firebase child, correction only delegates to existing modal, 44px focusable actions, remasking when privacy changes, disabled edit during a bank mutation.
- `CardStatementDetails.test.js`: existing merchant search and totals, plus mixed-currency filtering without data mutation, sanitized error and re-request with preserved imported items.
- `Banks.test.js`: the real synthetic bank/card/PDF journey only opens correction after disclosure; privacy masks both native currencies and the PDF subtree, no write until editor confirmation.
- Added the new test file and trigger to GitHub Actions' existing financial test/build workflow.
- **Manual still pending:** authenticated 390/1440/1728px screenshots in both themes, real imported PDF and Firestore permission checks, Android keyboard, long merchant/amount handling and accessibility validation. See [financial QA matrix](financial-ui-visual-qa.md). CI green alone is NOT visual validation.

Leave issue #227 open for those browser and domain E2E checks.
