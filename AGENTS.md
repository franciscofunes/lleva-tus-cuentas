# LTC — Agent Instructions

These instructions apply to all contributors and coding agents working in this repository, including ChatGPT and GitHub Copilot.

## Before editing
- Inspect the existing component, Tailwind configuration, and the actual theme hook. LTC uses Tailwind `darkMode: 'class'` and sets the `dark` class on `document.documentElement`.
- Reuse current LTC component conventions before inventing new design patterns. Prefer small, targeted changes to the requested functionality.
- Read [docs/ui-design-guidelines.md](docs/ui-design-guidelines.md) before changing visible UI. For files under `src/components/`, also read [src/components/AGENTS.md](src/components/AGENTS.md).
- Treat user-provided screenshots as regression evidence and fix both light and dark variants. Do not presume that a successful build proves sufficient color contrast.

## Required UI invariants
- LTC financial pages must remain readable in light **and** dark modes. All background, text, borders, icons, hover/focus states and nested content need explicit, compatible theme colors.
- Never put light/translucent backgrounds (`bg-slate-50/80`, `bg-white/70`) over a dark page without a working opaque dark-mode counterpart.
- Transaction card dark background: `dark:bg-slate-800` (opaque). Dark nested surfaces: `dark:bg-slate-900/70`. Dark primary text: `dark:text-slate-50`; secondary: `dark:text-slate-200`; muted: `dark:text-slate-300`.
- Check at 360–390px mobile width and desktop; keep long category names/descriptions wrapping and accessible button targets at least 44×44 CSS pixels.
- Keep financial semantics unchanged: signs, currencies, amounts, conversions, statement summaries, due dates, payment status and custom category metadata.

## Validation and delivery
- Add or update focused regression tests for the component and any conditional categories touched. Test class names for both modes; include a guard against translucent light cards in dark mode.
- Run targeted Jest tests and the production build through CI. Check Netlify preview and deployed commit before reporting production as ready.
- Use a PR for changes. Do not claim a successful merge, CI, or production deployment unless the corresponding provider confirms it.
- Never change Firestore rules or financial data for purely visual work without a separate, justified request.

## Native transaction currency invariants

- Never model an ordinary USD payment as a fake currency sale or ask for an invented FX rate. Currency conversions and ordinary expenses are separate operations.
- Category `currency` is the default for **new** transactions only; a transaction's persisted `transactionCurrency` is the immutable unit of its amount. A missing field in legacy records means ARS, regardless of current category settings.
- Never sum or sort USD and ARS amounts as comparable values. ARS charts/totals must exclude native USD. Display USD spending separately in summaries and exports.
- Preserve FX `currencyQuantity`, `currencyExchangeRate` semantics for the dedicated divisas categories. Do not infer a conversion for native USD spending.
- Any field added to user categories or expenses requires a narrowly scoped Firebase rules snippet and regression tests. See [docs/native-currency-transactions.md](docs/native-currency-transactions.md).

## Cross-page consistency (explicit user requirement, Oct 2026)
- **Transactions is the design source of truth for Banks, Portfolio and the Lita host.** Compare its actual JSX components and responsive ordering before editing another page.
- Reuse `FinancialHeaderActions`, `QuickAccessCard`, `CollapsibleSection`, `FINANCIAL_ITEM_SURFACE_STYLES` and `FINANCIAL_RECORD_DISCLOSURE_STYLES`. No independent header/card pattern per page; add cross-page contract tests when changing a shared primitive.
- Read [docs/financial-ui-contract.md](docs/financial-ui-contract.md) and review 390/1440/1728px light/dark authenticated screenshots before calling a visual redesign verified.
