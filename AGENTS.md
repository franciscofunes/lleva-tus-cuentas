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
