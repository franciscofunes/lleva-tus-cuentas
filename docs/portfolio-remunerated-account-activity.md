# LTC: Remunerated cash-account activity and audit-safe earnings

## Scope

The account view applies to **Cuenta remunerada** or **DAILY_RATE** positions, including Mercado Pago USD accounts. FCI/NAV, fixed-term positions and card statements retain their own accounting interpretations.

## Accounting invariants

- A balance verification is an observation, not a bank-audited transaction.
- Observed balance change = current verified balance minus the previous balance. This can include earnings, deposits, withdrawals, unknown activity and adjustments.
- **Only** snapshots explicitly tagged `changeType: 'earning'` contribute to “Rendimientos registrados”. These are user-tagged, not independently audited.
- `withdrawal` and `deposit` are movements of **capital**; neither is investment profit/loss. Moving USD from one remunerated account to another is not evidence of a rate reduction.
- The previous `realizedEarnings` field remains untouched. If negative or inconsistent with available tagged snapshots, show a **reconciliation warning**, not a calculated loss. Never auto-correct, delete or migrate financial history.
- Daily expected interest is an estimate calculated from loaded TNA/balance; it is **not** guaranteed or confirmed. The earnings timeline uses at most one expectation (latest valid sample) per calendar day. Weekly and monthly expectations add distinct day samples.
- Sort verification records using their **actual timestamps**, never Firestore insertion order or array reversal assumptions. If chronologically consecutive balances do not match the stored observed change, flag the discrepancy for manual reconciliation; never rewrite snapshots. The account history may be filtered by **Todos, Intereses, Capital, Otros**.
- Display retirement and capital transfer changes with neutral text rather than negative performance red. Keep money amounts denominated in the position's stored currency.

## UX hierarchy

1. Balance available and configured annual rate.
2. Earnings tagged in verifications versus current daily interest estimate.
3. Principal withdrawals/deposits; clearly state these are not losses or gains.
4. Reconciliation warning when legacy reported figures conflict or records are unclassified.
5. Earned-versus-expected timeline (per day, week, month).
6. Timestamp-sorted activity history, classification filters, edit/delete controls unchanged.

## Risk mitigation and QA

- All computed data is derived client-side from the existing Firestore portfolio positions/snapshots.
- No Firestore rules, stored schema, balance, user earnings, position rate, or historical snapshots are changed.
- Tested: out-of-order timestamp records, a negative historic figure that includes withdrawals, no loss from withdrawal classification, duplicated same-day expectations, empty histories and earnings mismatches.
- Full frontend CI and Netlify preview should succeed before merge.
