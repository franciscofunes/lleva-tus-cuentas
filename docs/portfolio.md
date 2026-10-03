# Portfolio / Inversiones

Tracks bank accounts and investments separately from day-to-day transactions.

## Firestore structure

```text
users/{uid}/portfolioPositions/{positionId}
users/{uid}/portfolioSnapshots/{snapshotId}
```

A position stores institution, display name, category, currency, current balance,
annual rate when applicable, accumulated/realized return, fees, start/end dates
and notes.

A snapshot stores a point-in-time valuation. Snapshots are the source for
historical performance charts; projected interest must not be presented as
realized profit.

## Currency rule

Never sum ARS and USD directly. Portfolio totals are grouped by currency until
an explicit FX quote and quote timestamp exist.

## Security

The repository does not currently contain the deployed Firestore rules.
`firestore.rules.portfolio` is therefore a merge template, not a deployable
replacement. Before enabling portfolio writes:

1. Locate/export the Firebase project's current Firestore rules.
2. Merge the two portfolio matches into those rules.
3. Test authenticated owner access and cross-user denial with the Emulator or
   Rules Playground.
4. Deploy the merged rules.
5. Commit the canonical merged `firestore.rules` to this repository.

Do not store bank credentials, account passwords, API secrets, full card
numbers or other authentication secrets in portfolio documents.

## HeroUI

The current app is React 18 + Create React App + Tailwind 3. HeroUI v3 requires
React 19+ and Tailwind 4, so Portfolio should not couple its data work to a
full UI migration. Migrate the application foundation first, then introduce
HeroUI components incrementally.
