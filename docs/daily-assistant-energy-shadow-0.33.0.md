# SportPilot 0.33.0 - Energy architecture shadow

## Status

This phase adds an internal comparison only. It does not change the daily
target shown to the user, the persisted `DailyTarget`, the calculation version,
or historical snapshots.

The current engine remains the source of truth.

## Candidate hypothesis

The candidate decomposes daily expenditure as:

```text
Mifflin BMR x 1.2 sedentary base
+ occupational load not represented by steps
+ walking from non-running steps above the included base
+ completed or still-planned sport
```

It reuses the current engine for BMR, walking, running-step removal, activity
calories, and planned/completed sport reconciliation. The only experimental
term is the occupational residual.

For an occupational category `c`:

```text
full occupational uplift
  = current occupational base - sedentary base

captured step share
  = clamp(
      additional non-running steps
      / (reference steps[c] - included base steps),
      0,
      1
    )

residual share
  = 1 - captured step share x (1 - minimum non-step share[c])
```

Reference assumptions:

| Occupational category | Reference steps | Minimum non-step share |
| --- | ---: | ---: |
| Sedentary | 5,000 | 0% |
| Lightly active | 7,000 | 25% |
| Active | 9,000 | 40% |
| Very active | 11,000 | 50% |

The minimum share keeps standing, load carrying, and poorly measured movement
in the estimate even when step volume is high.

## Reference comparison

For the frozen 60 kg reference profile and each category's reference step
level:

| Category | Current total | Candidate total | Difference | Risk |
| --- | ---: | ---: | ---: | --- |
| Sedentary | 1,965.36 kcal | 1,965.36 kcal | 0 kcal | negligible |
| Lightly active | 2,089.28 kcal | 2,029.24 kcal | -60.05 kcal | possible |
| Active | 2,293.27 kcal | 2,149.16 kcal | -144.11 kcal | possible |
| Very active | 2,497.25 kcal | 2,297.10 kcal | -200.16 kcal | material |

The result identifies plausible occupational/step overlap. It does not prove
that the candidate is more accurate.

## Runtime contract

`calculateAndPersistDailyTarget` now exposes:

- `energyArchitectureShadow.guided`, based on expected steps and the same
  planned/actual sport inputs as the guided target;
- `energyArchitectureShadow.final`, only after check-out when the linked steps
  entry is available, based on measured steps and completed activities only.

The comparison is ephemeral. It is never passed to `upsertTarget`.

For a non-sedentary profile with zero measured steps, overlap risk is
`unassessable`. Missing data must not be interpreted as proof of no overlap.

Risk bands for possible overlap are:

| Possible overlap | Classification |
| --- | --- |
| under 50 kcal | negligible |
| 50 to under 150 kcal | possible |
| 150 kcal or more | material |

## Switch criteria

The candidate must remain in shadow mode until all of the following are true:

1. A retrospective comparison covers at least 28 canonical final days for each
   occupational category included in the decision.
2. Each evaluated user contributes at least 14 days with linked measured steps,
   complete food data, and usable weight trend data.
3. Against weight-trend calibration residuals, the candidate improves the
   median absolute error by at least 10%.
4. The candidate does not worsen the 90th-percentile absolute error by more
   than 50 kcal/day.
5. No unexplained daily change above 250 kcal remains in the evaluated cohort.
6. Running-step removal, included walking, and planned/completed sport
   reconciliation keep their current regression coverage.
7. Product review approves the visible effect for each occupational category.

If a production switch is approved, it requires a new calculation version,
historical snapshot compatibility tests, release notes, and an explicit
rollback path. The existing shadow result is not sufficient on its own.
