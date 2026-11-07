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

Inspect inline save failures at deep scroll positions and confirm whether a local error message and focus restoration would improve recovery without duplicating the page-wide error system.
