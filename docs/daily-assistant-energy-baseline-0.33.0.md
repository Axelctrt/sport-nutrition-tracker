# SportPilot 0.33.0 - Phase 1 energy baseline

## Objective

Freeze the current daily energy behavior before introducing expected steps,
guided intake targets, final expenditure, or adaptive calibration.

This phase does not modify any production formula or persisted data.

## Reference profile

- date: `2026-06-23`;
- male, born `2004-01-01`;
- height: `177 cm`;
- calculation weight: `60 kg`;
- maintenance goal;
- included base steps: `3,000`;
- walking coefficient: `0.5 kcal/kg/km`;
- running coefficient: `1 kcal/kg/km`.

The current Mifflin-St Jeor BMR is `1,601.25 kcal`.

## Protected scenarios

The reference suite freezes these current behaviors:

1. The occupational base uses the current multipliers from `1.2` to `1.45`.
2. Only non-running steps above the included `3,000` steps produce walking
   calories.
3. Running steps are removed before additional walking is estimated.
4. A walking activity marked as included in daily steps is not added again.
5. A real strength activity linked to a planned session replaces its planned
   calorie projection.

The expected numerical results live in
`src/test/fixtures/dailyEnergyReferenceScenarios.ts`.

## Known boundary

The suite intentionally records that measured walking is currently added on
top of every occupational multiplier. It does not prove that occupational
activity and steps never overlap in real life.

The later energy-engine phase must compare a candidate architecture based on:

```text
sedentary base
+ expected or measured daily movement
+ occupational load not represented by steps
+ planned or completed sport
```

The current baseline must remain available as a shadow comparison until the
new fixtures and product thresholds are approved.

## Regression rule

Any intentional formula change must:

1. explain which reference scenario changes and why;
2. increment the relevant calculation version;
3. preserve historical snapshots;
4. add tests for old-data compatibility;
5. keep planned and completed activity reconciliation explicit.
