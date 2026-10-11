# GitHub Copilot — LTC Project Instructions

Follow [AGENTS.md](../AGENTS.md), the scoped instructions at [src/components/AGENTS.md](../src/components/AGENTS.md) for component edits, and [docs/ui-design-guidelines.md](../docs/ui-design-guidelines.md) for **every** UI change.

**Do not break dark mode.** LTC uses `html.dark` + Tailwind class-based dark mode. Transaction cards must use solid `dark:bg-slate-800`, nested surfaces `dark:bg-slate-900/70`, and legible `dark:text-slate-50`/`dark:text-slate-200`/`dark:text-slate-300`. Match light colors as defined in the design guidelines; inspect the actual CSS before approving.

For any `Card.js` edit, preserve all conditional financial and category fields. Update regression tests for light and dark classes, long text, credit-card summaries, services, currency conversions, payment states and user-controlled metadata. Do not alter Firestore schema/rules or monetary calculations for styling.

Prefer focused PRs, green Jest/build checks and a verified Netlify deploy. Never report unverified deployment or browser behavior as confirmed.
