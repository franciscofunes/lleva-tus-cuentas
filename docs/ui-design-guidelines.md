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

## Transactions activity-first layout (issue #221)

- The authenticated Transactions first-read sequence is **add movement + privacy**, current-period ARS/USD summary, searchable/editable activity, then graphs/metrics/exports. Keep the DOM and visual reading order consistent on mobile. On desktop the transaction list spans two grid columns, while the summary/graph are smaller adjacent widgets.
- Show the primary add-transaction action with a full label on phones, not an unlabeled plus glyph. Keep Portfolio and Bancos shortcuts in the compact native More disclosure instead of deleting them.
- Preserve saved per-UID collapsible and sort preferences; initial chart collapse is only a fallback when the user has no saved preference.
- Store one filtered transaction scope for summaries, Lita and all financial exports; sorting/pagination are exclusively visual list operations. Never convert native USD into ARS for sorting or aggregation.
- Transaction card headings and amounts are first-read anchors with long-value wrapping; retain conditional service due dates, payment badges, PDF drilldown and controlled custom details.
- A linked card-summary PDF and its nested consumption items are not automatically deleted along with the transaction. Warn before the irreversible operation; no surprise cascading writes.
- Authenticated screenshots at 390, 1440 and 1728px, light/dark, plus geometry measurement remain mandatory for a completed visual review. See [issue #221 audit](transactions-issue-221.md).

## Credit-card spending visual language

Unlike transaction in/out colors, the user-defined **card ceiling** uses a 4-level *progress risk* palette with semantic labels, explicit remaining/overage in exact cents and accessible progressbar semantics. Never infer real bank credit from the remaining personal budget.

| % used | Visual | Meaning / microcopy |
| --- | --- | --- |
| <70% | Emerald (`border-emerald-500/40`, `bg-emerald-50`, `dark:bg-emerald-950/25`) | “Vas bien con tu tope” |
| 70–<90% | Amber (`border-amber-500/50`, `bg-amber-50`) | “Cuidá tu margen disponible” |
| 90–<100% | Orange (`border-orange-500/60`, `bg-orange-50`) | “Te queda poco margen” |
| >=100% | Rose (`border-rose-600/60`, `bg-rose-50`) | “Te pasaste del tope por ...” |

**Historical records** deliberately use cyan (`border-cyan-500/35`, `bg-cyan-50`, `dark:bg-cyan-950/20`) regardless of the personal warning state; the reference is factual, not a personalized recommendation. Keep Lita's budget advice and 90%-of-average suggestion subordinate to actual user-set ceiling.

Mobile contract: use breakable amounts and tabular digits; ARS and USD separate; badge “Vista previa · sin guardar” for edits; clear inline labels beyond hue for color-blind users; progressbar exposes a numerical value. Values must be hidden when privacy mode is on. A missing/invalid limit must never display a fabricated “remaining” amount.

All future push/email/SMS copy must avoid disclosing exact amounts on shared device lock screens by default.

## Public landing: editorial and human-first (October 2026)

Scope: src/pages/Home.js only. Authenticated product screens keep their existing styles.

Direction: Preserve LTC brand purple, slate neutrals, Montserrat display headings, dark mode and plain navigation. No AI-first hero, gradient/glow, fake social proof, generic repeated feature-card grids, pill collections or attention-grabbing decorative icons.

Narrative and composition:
1. Large plain-language proposition, one main branded CTA, understated secondary anchor, one clearly labeled illustrative financial preview.
2. Three *numbered editorial rows* for transactions, banks/cards and portfolio, with descriptions aligned across two columns.
3. A larger distinct section on credit-card spending limits, balance remaining, all-bank PDF history and reviewed screenshot imports.
4. Simple definition rows for statements/PDFs, due dates, worldwide map and charts/export.
5. Lita is a quieter complementary section with practical questions and explicit financial-advice disclaimer.
6. Auth-aware concluding CTA and existing footer.

Use original brand tokens: secondary rgb(89,40,229), green only for the LTC dollar sign, restrained slate borders/surfaces, Montserrat display headings; preserve dark scheme. Mobile-first, readable body widths, visible focus indicators, meaningful accessibility labels, no horizontal overflow.

Examples are illustrative only and MUST NOT use real bank screenshots or user private values. Do not claim closed-app push notifications exist. The strongest differentiation is helping people keep track of cards, banks and two currencies without losing sight of the spending ceiling.

Before merge verify Home.test.js, CRA build, mobile 390px and desktop 1440px, both light/dark, every module's named capability, guest/member routing and semantic heading order. Code review is not a substitute for actual responsive rendering.

## Landing finish: mobile, semantics and sharing (October 2026)

- Public finance sample is an accessible `figure` with a `figcaption`; its 72% demonstration progress exposes `role=progressbar` and numeric values to assistive technology. Do not represent illustrative data as actual account data.
- Hero and exit CTAs use the full mobile content width and revert to their natural width on larger screens; text navigation links retain visible keyboard focus.
- The optional `ltc-editorial-heading` helper balances title text if the browser supports `text-wrap: balance`; it does not affect authenticated UI.
- Named public sections use `scroll-mt-24` to leave room under persistent site navigation when accessed via anchors.
- Public app-shell metadata supports plain text preview with Open Graph and Twitter summary tags, without copying private finance values or publishing unverified imagery. No canonical tag was added because private SPA routes share the same HTML shell.
- The minimal landing footer now names banks and cards instead of leading with AI. Styling and Firebase/financial logic are unchanged.
