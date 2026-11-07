# Banks issue #227 — inline account and card editors

This is a source-grounded design improvement following the mobile bank-onboarding work. Transactions' shared `FINANCIAL_ITEM_SURFACE_STYLES` and `FINANCIAL_RECORD_DISCLOSURE_STYLES` remain the visual baseline. No authenticated user flow was captured: `/bancos` redirects the unauthenticated test browser to `/ingresar`, so responsive screenshot QA is still outstanding.

## Friction found in the original code

1. **Editing the first account could jump context:** its form rendered after *all* bank accounts instead of next to the selected row.
2. **Editing a card could be missed:** its form rendered before the entire card list, even though the edit action is within an expanded card.
3. **Identity fields dominated account editing:** six secondary bank-identity fields sat alongside the three essential account properties and balance, regardless of the user's task.
4. **Optional disclosures differed from Transactions:** card reference details had a compact native summary without the shared 44px disclosure treatment.

## Implemented behavior

- New account forms appear below **Añadir cuenta**; existing account editors appear immediately after the selected account card. New card forms appear below **Añadir tarjeta**; existing card editors are inside their expanded card, immediately after **Editar tarjeta**.
- Essential fields remain in the first scan: name, type, currency, manual balance; for cards, nickname, brand, last four digits, and typical closing/due days. Compatible short fields share two columns on phone widths.
- Account identity and card home-banking snapshots live inside visible, keyboard-accessible native disclosures with the shared LTC 44px control style, dark/light opaque surfaces, and an optional populated-field count. Existing metadata automatically opens its disclosure so reviewers can see that information is present.
- The same controlled draft is saved with the same `saveBankAccount` and `saveBankCard` calls. No values are reinterpreted or removed when disclosures close; previously imported PDF closing/due dates remain separate from habitual card days.
- Browser validation for optional account identity fields reopens that disclosure if an entered value fails native constraints.

## Verification and limits

- [x] Seven Jest suites: Banks, onboarding, financial header actions, Transactions header actions, transaction cards, pending and linked statement cards. Added checks for adjacent editor placement, shared surfaces, identity data preservation, and separate card/PDF dates.
- [x] No changes to Firestore collections, rules, services, ARS/USD math, PDF parsing, linked statements, or transaction creation.
- [ ] Authenticated 390/1440/1728px light/dark screenshots, including Android keyboard and long lists, with a synthetic QA user. A source-level review and green tests do not replace that visual audit.

## Follow-up

### Inline save failure recovery (next pass)

- **Account/card save failures stay in context.** Each inline editor shows its own accessible `role="alert"` error directly above Save/Cancel. The error receives keyboard focus after the failed asynchronous write, bringing the message into the mobile scroll viewport rather than leaving it at the top of the Banks page.
- **No lost work or confusing duplication.** Draft values remain unchanged after a failed write. Correcting any editor field clears the stale error; retrying the same form uses the existing bank service exactly once per submission. Account/card errors do not also appear in the unrelated page-wide error banner. Other actions continue to use their existing global error system.
- **Safe, plain Spanish copy.** Permissions and offline/service failures have distinct guidance; unexpected errors never expose backend details. No error code or sensitive bank identity is printed in the message.
- **Keyboard return path.** Cancel and successful save restore focus to the exact Add/Edit action that opened the editor (when that element remains mounted). The same behavior applies to new and existing accounts/cards.
- **Focused regression coverage** exercises permission-denied and network failures, error focus, data retention and retry, clearing errors after edits, no duplicate writes and Cancel/Save focus restoration.

Screenshot verification remains open: authenticate a synthetic QA account and inspect 390/1440/1728px light/dark states, including a failed save deep in a long bank list. This is source-level behavior verification, not a completed screenshot audit.
