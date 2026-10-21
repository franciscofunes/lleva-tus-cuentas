# Transactions UX 4.0 — compact cards with progressive disclosure (#225)

## Objective

Keep `/transacciones` scannable on mobile without discarding data or hiding dates needed to pay bills.

## First scan (collapsed)

Each transaction retains its full movement name, **native ARS/USD amount with sign**, canonical/display category name and tooltip, and its transaction date (or legacy due date). If the category has a separate due date or the movement is a card statement, the due date also remains in the collapsed card. Payment status ("Pagado") is always visible when the record is paid. Edit and delete remain permanent 44px targets.

## On-demand secondary details

A per-card accessible **Ver detalles / Ocultar detalles** button appears only if relevant secondary data exists. It exposes the description, card-statement closing date, currency purchase quantity/rate, controlled custom fields, paid-at/previous-due dates and—when permitted—the linked card-statement PDF consumption drilldown. The PDF component mounts **only after expansion**, avoiding unnecessary per-card work and extra Firestore reads. Records expand independently and do not mutate Firestore.

Details use labeled regions and button `aria-expanded`/`aria-controls`, respect light/dark classes, wrap long values, and keep the existing edit/delete callbacks. When privacy masking is active, controlled custom details and PDF drilldown remain absent even after expansion; sensitive FX values stay masked.

## Financial invariants

- Ordinary native USD expenses remain USD; no inferred FX conversion or changes to transaction fields.
- Currency purchases retain their original ARS amount, USD quantity and rate.
- Older `dateBehavior: 'due-date'` records still display `selectedDate` as a due date. Newer `separate-due-date` records show both date and optional expiration.
- Card-summary PDF detail records are not accidentally cascaded when deleting the parent expense; the existing dialog still warns about retained linked records.
- Do not interpret hiding display fields as removal from KPI/export scopes.

## Validation and release gate

Run the Card component regression tests, overall Jest suites, production build and documentation integrity. Verify deployment matches the PR commit SHA. Authenticated screenshots at 390px, 1440px and 1728px in **both themes** remain a separate visual QA gate; test long categories/names, due dates, FX, privacy and nested PDF details. Never publish real financial records as test fixtures.
