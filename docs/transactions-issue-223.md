# Transactions UX 3.0 — unified filters (issue #223)

Issue #221 made transaction activity primary, but left reporting period inside the Summary card and search/category/type/sort inside Activity. This obscured that filters also affect charts, exports and Lita.

## Changes

- New "Qué movimientos estás viendo" toolbar after the hero and before results. At narrow widths the period and search stack; at desktop widths they share a row.
- Reuses the Redux/Firestore `ExpenseFilter` period and existing `SearchBar` in one location. The selected date label is forwarded to search next to the result count.
- Search stays visible while advanced filters are collapsed; active query/category/type appear as separately removable buttons, including when advanced fields are closed.
- Clearing the in-page filters never resets the period. Expanding to all history still requires an explicit click.
- `filteredDocs` is shared by summary, charts, Lita and exports. Card sorting and pagination do not alter totals.
- No changes to Firestore schema/rules or ARS/USD accounting.

## Verification checklist

- SearchBar, ExpenseFilter, Dashboard DOM/scope and bimonetary tests plus production build in CI.
- Signed-in screenshots required at 390/1440/1728px in light and dark. Public login screens do not count.
- Check long category names, overflowing search text, active chip removal, advanced filter collapse/reopen, calendar/month arrows, and parity of exported rows with filtered totals.
