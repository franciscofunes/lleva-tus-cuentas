# LTC UI Design Guidelines

LTC has a dark financial dashboard aesthetic: dark navy, slate, restrained violet accents, readable gray supporting text and semantic gain/loss colors. Use these conventions consistently across Portfolio and Transacciones.

## Theme implementation
- Theme switch: `src/shared/hooks/useDarkMode.js`.
- Actual DOM theme selector: `html.dark` (the class is applied to `document.documentElement`).
- Tailwind configuration: `darkMode: 'class'` in `tailwind.config.js`.
- Avoid relying on device color-scheme media queries for app theme behavior.

## Core palette

| Element | Light | Dark |
| --- | --- | --- |
| Card surface | `bg-white` | `dark:bg-slate-800` **opaque** |
| Nested information surface | `bg-slate-50` | `dark:bg-slate-900/70` |
| Primary text | `text-slate-900` | `dark:text-slate-50` |
| Secondary text | `text-slate-700` | `dark:text-slate-200` |
| Muted text | `text-slate-600` | `dark:text-slate-300` |
| Labels | `text-violet-700` | `dark:text-violet-200` |
| Card border | `border-slate-200` | `dark:border-slate-700` |
| Dividers | `border-slate-200` | `dark:border-slate-700` |
| Button surface | `bg-slate-50` | `dark:bg-slate-900` |
| Button border | `border-slate-300` | `dark:border-slate-600` |

For financial amounts, keep a visible +/− sign and currency, using rose/red for expenses and emerald/green for inflows. Check color contrast against the actual background, not a screenshot averaged with overlays. Target WCAG AA readability (4.5:1 for normal text, 3:1 for large text and interface indicators).

## Transaction component conventions
- Use distinct rounded cards with subtle borders, compact typography and no unnecessary extra UI controls.
- Do **not** use `bg-slate-50/80` or `bg-white/70` on a card root: a transparent light background over an already dark page can create a light gray rectangle while dark-mode text becomes nearly invisible.
- In addition to `dark:bg-slate-800`, the card uses a defensive `html.dark .ltc-transaction-card` selector in `src/index.css`. Keep both when refactoring.
- Inner metadata sections may use `dark:bg-slate-900/70` against the solid dark card.
- Description, category, dates, dynamic custom metadata and currency values must wrap. Never truncate financial values merely to fit.
- Edit/delete actions use real, labeled 44px buttons, not click handlers attached directly to icons.
- Keep conditional data and financial behavior separate from visual styling.

## Definition of done for UI changes
1. Confirm actual `html.dark` behavior and test both themes at mobile (360–390px) and desktop widths.
2. Test ordinary transactions, currency purchases/sales, statement summaries, due dates, paid status and controlled custom-category details.
3. Run component tests and production build; review the resulting CSS and Netlify preview.
4. Merge only after required checks succeed. Confirm production matches the merged commit before claiming it has shipped.

## Collapsible widget system: Portfolio and Transacciones

- All primary widgets must use `CollapsibleSection` for **the same** outer surface, padding, border, heading hierarchy, description and chevron. `FinancialOverviewPanel` reuses `COLLAPSIBLE_SURFACE_STYLES` from `CollapsibleHeading.js`.
- Nested visualizations (e.g. Portfolio allocation and performance) use `CollapsibleSection variant="nested"`, semantic **h3**, subdued `dark:bg-slate-900/60` and the same disclosure controls. Do not nest a third-party Tremor `Card` inside the section: its own border/padding violates theme consistency on Android.
- Shared wrapper tokens should be updated in one place, not duplicated for Portfolio and Transactions. The collapsed state stays controlled by its owning page/component and respects existing user preferences.
- Position cards use a nested slate surface, legible violet institution labels, financial values with tabular digits and 44px action/drag targets. Never truncate a financial amount to make the layout fit mobile.
- On 360–390px mobile, action labels **wrap** instead of clipping (e.g. "Exportar archivos"); the nested chart selector and rows must not cause horizontal overflow.
- Chart axis labels may be abbreviated for space, but position balances, gain/loss values and transaction data must remain unchanged and exact; axis shortening is display-only.
- Test Portfolio and Transacciones in both modes after changing any shared widget component. Avoid CSS selectors targeting just one page to paper over common layout issues.
