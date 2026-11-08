# LTC$ financial UI contract — Transactions is the design source of truth

**Decision (21 Oct 2026):** The user requires **one consistent interface**, not different visual systems for Transactions, Banks, Portfolio and Lita. Treat the current authenticated `/transacciones` page as the reference implementation. When building another surface, **reuse its actual components, tokens, geometry, hierarchy and interaction contracts**. Do not invent a new card, heading or action pattern for each page.

## Reference components (not illustrative examples)

| Visual responsibility | Actual component / token | Transaction baseline | Banks counterpart |
| --- | --- | --- | --- |
| Page shell | `FinancialPageLayout` and `QuickAccessCard` | One title, one primary action | Same components, bank-specific wording only |
| Primary/secondary actions | `FinancialHeaderActions` | Add movement + privacy + **Más** | Add bank + privacy + **Más**, identical DOM/styles |
| Root widget | `CollapsibleSection` and `COLLAPSIBLE_SURFACE_STYLES.root` | Summary, activity, charts | Bank balance, banks activity, budgets, linked statements |
| Widget typography | `COLLAPSIBLE_SURFACE_STYLES.root/nested` → `font-sans` | Summary, activity and charts inherit the same system sans family | Banks, Portfolio and nested panels inherit exactly the same family |
| KPI values | `FinancialMetricCard` | Financial summaries | Two separate balance currencies |
| Tools and exports | `FinancialOverviewPanel` | “Herramientas” / “Métricas y exportaciones”; page-owned `mt-5` | Portfolio uses the same collapsed header and 20px gap, with no panel-owned bottom margin |
| Card surface | `FINANCIAL_ITEM_SURFACE_STYLES` | Transaction card | Bank account card and consumption card |
| Per-record disclosure | `FINANCIAL_RECORD_DISCLOSURE_STYLES` | **Ver detalles / Ocultar detalles** | Bank account metadata `Ver detalles`; CBU still needs a second explicit reveal |
| Destructive action | `GenericModal` + validated confirmation | DeleteTransactionDialog | DeleteBankChargeDialog |
| Theme | `html.dark` + slate/violet tokens | Opaque slate-800 outer, slate-900/70 inset | Exactly the same |
| Interaction baseline | 44px targets, focus rings, wrapping, skeletons, privacy | Transactions | Same |

## Page-level scan path

```mermaid
flowchart TD
  A["Shared hero: page title, 1 primary action, privacy, Más"] --> B["Summary: current ARS/USD position or flow"]
  B --> C["Primary activity: records, create/edit, scoped drilldown"]
  C --> D["Secondary tools: charts, card budgets, imports, Lita"]
```

At **390px mobile**, read top-to-bottom in that order. At **1440/1728px**, use a single `lg:grid-cols-3` dashboard: summary and tools in the narrow rail, activity in `lg:col-span-2 lg:row-span-2`. This is the existing `Dashboard.js` pattern, not a new Banks-specific composition.

The collapsible tools/export panel has no inherent vertical margin: Transactions adds a single `mt-5` after its grid, and Portfolio supplies the same gap in its existing outer wrapper. Its collapsed heading uses the same eyebrow/title pair on both pages, without duplicate labels or Portfolio-only description lines that make the closed card taller. Content actions, metric data, export scope, and saved collapse preferences are unchanged.

Financial widget roots (including nested collapsibles and the shared metrics/export panel) explicitly use Tailwind's `font-sans` family. Do not add one-off `font-Nunito`, `font-Roboto`, or `font-Montserrat` classes to individual widget wrappers: those override the inherited family and cause unequal heading glyphs and content density across pages. Branding on the public landing and form-specific typography remain unchanged.

All financial collapsible triggers keep `aria-expanded` and `aria-controls` synchronized. The referenced `*-content` element must remain in the DOM **even while closed**, so assistive technology always has a valid disclosure target; the financial child content stays unmounted while collapsed. `CollapsibleSection` uses an empty `hidden` container with an explicit `display: none` override because page-specific `grid` classes can otherwise defeat the browser's default `[hidden]` styling and leave a collapsed panel with extra padding. The animated `FinancialOverviewPanel` retains an empty/`aria-hidden` container outside `AnimatePresence`. This preserves the shared collapsed spacing rhythm without changing persisted preferences or financial privacy.

Banks must not put an oversized card-budget settings UI above the user's bank records. Bank account cards must first show title, currency, balance and type. Less-common account identity fields belong under the **same** progressive-disclosure surface as Transactions; sensitive CBU remains masked unless explicitly revealed. Never silently alter persisted records.

## Page-specific semantics stay page-specific

- Transactions totals count income/expense/FX; bank balances are **manual snapshots** and cannot be summed across ARS/USD or interpreted as spending.
- Banks' manual card consumptions **do not create Transactions expenses**; linked statement PDFs and imported transactions must not be duplicated.
- Portfolio withdrawals/transfers aren't losses; earned values reported by the user aren't audited gains.
- Lita uses a conversation UI, but its host header, typography, buttons, surface hierarchy, empty/loading/error/scroll states must follow LTC's shared design language.

## Release gate

1. Inspect **both** `Dashboard.js` and target page before touching styles. Reuse shared primitives before creating a new component.
2. Run cross-page regression tests (`TransactionsHeaderActions.test.js`, `FinancialHeaderActions.test.js`, `Banks.test.js`, `Card.test.js`). A new page **cannot copy/paste** a different set of styles to recreate a similar header.
3. Review actual authenticated screenshots **side by side** of the same content states at 390, 1440 and 1728px, light/dark, before describing a visual redesign as complete. Public sign-in screens don't count.
4. Validate accessibility with named 44px controls, contrast and keyboard focus; document Better Design's code/copy findings honestly. Source-only code review is not a screenshot.
5. Avoid Firestore/schema changes, numeric calculations or new UX features while standardizing visual design.

**Applied in Banks #227 phase 2:** the existing one-off bank header was replaced with `FinancialHeaderActions`, core widgets reordered as Summary → Banks activity → Card spending tools, and account record details changed to the same disclosure style used by Transactions. PDF and card-specific flows remain intact for dedicated future review.

## Actual rendered QA gate

Use the [authenticated visual matrix](financial-ui-visual-qa.md) to compare the same shared hero, CTA and privacy tokens **computed in Chromium**, plus masked 390/1440/1728px screenshots in both themes for all 3 financial pages and Lita. Its standalone manifest/security tests run in GitHub CI, but screenshot evidence requires an authorized synthetic signed-in account.
