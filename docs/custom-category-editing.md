# Editing existing personal categories

LTC lets authenticated users **edit the visible name** of a personal category, including archived categories, while retaining its stable internal identity. Shared categories remain read-only.

## Why the original name is immutable

Existing transactions store a category **string** (`users/{uid}/expenses/{id}.category`), not a reference to the category document. Rewriting historical records during a rename can cause partial migrations, mixed categories, incorrect dashboards, and large Firestore write bills.

Instead, each custom category keeps:
- `name`: canonical original category name, immutable; referenced by old/new transactions, charts, and financial calculations.
- `displayName`: editable user-facing label, validated for length (2–50), collisions and reserved system financial names.
- `isExpense`, `extraFieldIds`, `dateBehavior`: immutable; changing them could reinterpret past data.
- `active`: archive/reactivate independently.

The UI shows `displayName || name` in the category manager, transaction cards, category filters, transaction-form selects, charts, Excel/CSV exports and Lita analysis. The option values and saved Firestore category strings remain canonical, so filtering, aggregation, reminders and editing existing transactions continue to work.

## Security — manual rules update

Update the existing custom-category match in Firebase Console by merging the diff from [`firestore.rules.customCategories`](../firestore.rules.customCategories):
- Permit optional `displayName` in the document whitelist.
- Validate string length 2–50 and reject unsafe characters.
- Permit updating `displayName` and `updatedAt` (besides existing archive changes).
- Keep `name`, `isExpense`, `extraFieldIds`, `dateBehavior` and `createdAt` immutable.
- Only `request.auth.uid == uid` can edit that user's categories; shared catalog remains immutable.

**Do not replace the entire Firestore ruleset**: preserve all other match blocks. Firebase Spark/free plan supports these writes. Until the deployed ruleset is updated, editing may show a permissions error.

## Validation checklist

- Edit an active or archived custom category. Confirm that only the visible label changes after the Firestore subscription updates.
- Filter/search by new name and verify that historical records remain under the canonical category without reclassification.
- Open and edit an old transaction; the form should display the new label but save the canonical string.
- Verify charts, PDF/Excel exports, and Lita context reflect the visible name without double-counting.
- Try a duplicate, a reserved name (e.g. "Resumen tarjeta"), blank and overlong values; they must fail safely.
- Check mobile light/dark mode; no new controls for shared categories, no Firestore mass updates.
