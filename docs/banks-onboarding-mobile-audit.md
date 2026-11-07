# Banks onboarding — mobile UX audit follow-up

This is a targeted, source-grounded follow-up to Banks issue #227. Transactions remains LTC's approved visual reference. The authenticated 390/1440/1728px light/dark screenshot matrix still requires an isolated signed-in QA account; passing Jest does **not** certify the rendered mobile layout.

## Findings and changes

1. **The optional Markdown importer led the form.** The required bank name now appears first. Markdown is still available immediately afterward behind a 44px disclosure control, with `aria-expanded` and `aria-controls`. Its existing parse → preview → apply → explicit save safeguards are unchanged.
2. **The final action row could be far below the fold when accounts or cards were added.** Save and Cancel now use a single sticky action row in the scroll area owned by `GenericModal`. Its background and border use opaque light/dark LTC surfaces, and both buttons meet the 44px target baseline.
3. **Quick repeated taps could start overlapping saves.** A local in-flight guard stops duplicate submissions until the active attempt settles. A failed save keeps the filled form and permits a retry.
4. **Onboarding buttons lacked the same visible keyboard focus styling used elsewhere.** Primary and secondary controls now use violet focus rings, dark-mode states, and the established financial UI color palette.

## Accounting and privacy boundaries

- No changes to Firestore schema, rules, saved bank bundles, currencies, card statements, FX treatment, or statement linking.
- Markdown remains local and preview-only until the user explicitly confirms saving. Account and card data are still optional.
- No real bank names, account numbers, PDF statements or user balances are included in tests or screenshots.

## QA checklist

- [x] Source-based audit against `FinancialHeaderActions`, `GenericModal`, and Transactions' shared 44px control conventions.
- [x] Jest: `BankOnboardingForm`, `Banks`, `GenericModal`, `FinancialHeaderActions`, `TransactionsHeaderActions`.
- [ ] Authenticated Chromium at 390px and 1440/1728px in both themes: verify the sticky row remains tappable with a long form, Android keyboard, and device safe area.
- [ ] Manual bank creation and Markdown import from a disposable QA user (never a real portfolio).

## Next audit candidates

- Inline edit-account and edit-card forms within expanded bank rows: scan density, focused error feedback and small-screen form ergonomics.
- PDF attachment/review sheet and Lita sheet: compare keyboard, focus, and scrolling behavior against the shared modal shell.
