# Native ARS and USD expenses in LTC

Do **not** enter a USD expense as a fake `Venta divisas` with an exchange rate such as `0.00001`. A payment in dollars is a real expense in USD, not an asset conversion.

## Category UI

- Create a personal category, choose **Gasto** or **Ingreso**, then choose **Pesos argentinos (ARS)** or **Dólares estadounidenses (USD)**.
- Existing personal categories can update **Moneda para nuevos movimientos** via Editar; general/shared categories remain read-only.
- Category `currency` is only the **default** for future transactions. A changed default does not retroactively convert historical amounts.
- Date-of-expiration and controlled custom fields are unaffected.

## Persisted transaction model

- Ordinary expenses/incomes save `amount` as a numeric-in-string/number value and **transactionCurrency: 'ARS'|'USD'** as an immutable snapshot of the unit at record creation. The editor preserves it on older transaction edits.
- Historical transactions without `transactionCurrency` are **ARS**, independent of the category's later currency default.
- Historical `Compra divisas`, `Venta divisas`, `Ingreso divisas` preserve their existing ARS amount and USD quantity semantics; they are not converted into native USD expenses.
- New USD expenses have `transactionCurrency: 'USD'`, their own `amount`, **no `currencyQuantity` or `currencyExchangeRate`** and appear as USD outflow. They never create artificial ARS proceeds.
- Currency changes on an existing category affect only new records. Existing currency snapshots remain unchanged.

## Reporting and notifications

- ARS graphs, KPI totals, and ARS spending-by-category must exclude native USD movements.
- USD category spending and USD flows must display independently without FX conversions or summing unlike currencies.
- Excel/CSV exports include native USD and ARS in separate columns and retain the original FX quantity/rate columns.
- Lita Markdown and data context must indicate each native currency and avoid made-up exchange rates.
- Reminder notifications show the same currency as their source expense.

## Firebase Rules — manually deploy before using

The PR updates `firestore.rules.customCategories` to whitelist owner-scoped `currency` with **only** 'ARS' or 'USD'. Update the *existing* nested `customCategories` match in the Firebase Console, keeping all other collection rules. It allows editing this default but does not allow changing the immutable canonical category name, original financial type, extraFields or date behavior.

In `firestore.rules.customTransactionDetails`, a new additive `validTransactionCurrency()` validates the transaction snapshot; insert this into the existing `/users/{uid}/expenses/{id}` create/update rules and include `transactionCurrency` if your expense rules use `keys().hasOnly(...)`.

**Do not paste another broad expenses match**, disable security or change other user permissions. This is compatible with the free Spark plan.

## Regression checklist

Create a USD subscription of 49.95 and ARS grocery expense 150,000. Check native amounts on their cards, no FX input on the subscription, separate ARS/USD summaries, ARS-only graphs, correct sorting, 3-sheet XLSX export and Lita Markdown. Update the category to USD after creating a historical ARS expense: historical rows stay ARS and new rows use USD. Verify credit-card summaries and original foreign exchange categories remain unchanged.
