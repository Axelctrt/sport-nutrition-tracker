# SportPilot 0.33.0 - Historical energy input snapshot

## Objective

Daily energy diagnostics must remain reproducible after the user changes their
profile or expert energy settings. Each newly generated `DailyTarget` therefore
stores a versioned `energyInputSnapshot`.

## Version 1 contract

The snapshot contains the profile and settings inputs used by the daily energy
calculation:

- sex, age information, height, goal, and weekly target rate;
- occupational activity and daily step goal;
- protein and fat coefficients;
- included base steps and walking/running coefficients;
- strength, cycling, walking, other cardio, and swimming MET settings;
- calorie floor multiplier.

Inputs already materialized on `DailyTarget` stay outside the snapshot:

- `calculationWeightKg`;
- `stepBasis`;
- `plannedActivities`;
- the resulting energy, calorie, and macro values.

Nested age and swimming values are copied so later in-memory changes cannot
mutate the stored historical context.

## Persistence and compatibility

`energyInputSnapshot` is optional on `DailyTarget`. Dexie stores it as a
non-indexed field, so no database schema migration is required.

The backup schema accepts both forms:

- modern targets with a strict version 1 snapshot;
- legacy targets without a snapshot.

The additive optional field does not change the backup envelope version.

## Synchronization

When a cloud calorie adjustment requires a daily target reconciliation, a
modern target is recalculated with its stored profile and settings. Its stored
calculation weight, expected-step basis, and planned activity snapshots are
also preserved.

Legacy targets continue to use the current context during this reconciliation
for backward compatibility. The reconciliation writes a version 1 snapshot so
subsequent operations have a stable baseline.

## Retrospective policy

The energy architecture retrospective only compares days whose target contains
a supported snapshot. Legacy targets are counted as
`missingHistoricalInputs`.

This deliberately reduces initial diagnostic coverage after the release. A
complete 28-day evidence window becomes possible only after 28 canonical days
have accrued with versioned snapshots.
