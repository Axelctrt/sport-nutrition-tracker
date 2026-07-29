# SportPilot 0.33.0 - Energy shadow retrospective

## Objective

This phase turns the energy architecture shadow into an evidence report. It
still does not change, persist, or display a calorie target.

The application service loads the latest 28 calendar days and rebuilds the
current and candidate final expenditure for each eligible day.

## Canonical day

A day is eligible only when all of these inputs exist:

1. a completed daily check-out;
2. a complete food journal with at least one positive calorie entry;
3. a step entry whose identifier matches `DailyCheckOut.stepsEntryId`;
4. a historical `DailyTarget` providing the calculation weight;
5. a versioned historical profile and settings snapshot on that target;
6. a current and candidate final expenditure comparison.

The report records every excluded date and all applicable reasons:

- `missingCheckOut`;
- `incompleteFoodJournal`;
- `missingFoodData`;
- `missingLinkedSteps`;
- `missingDailyTarget`.
- `missingHistoricalInputs`.

Missing data cannot silently become a zero.

## Inferred expenditure

The report uses complete rolling 14-day windows. Each window also requires at
least six non-outlier weigh-ins spanning at least seven calendar days. A window
can expose preliminary metrics, but the status cannot support either
architecture until all 28 calendar days are canonical.

For each valid window:

```text
weekly weight trend
  = linear regression slope of weight x 7

inferred daily expenditure
  = average consumed calories
    - weekly weight trend x 7,700 / 7
```

A positive weight trend therefore lowers inferred expenditure relative to
intake, while a negative trend raises it.

The current and candidate residuals are:

```text
predicted average expenditure - inferred expenditure
```

The report compares median and 90th-percentile absolute residuals across all
valid windows.

## Decision statuses

| Status | Meaning |
| --- | --- |
| `insufficientData` | Fewer than 28 canonical days are available, or no complete 14-day window has enough usable weight data. |
| `candidateSupported` | Median absolute error improves by at least 10%, p90 does not worsen by more than 50 kcal/day, and no daily difference exceeds 250 kcal. |
| `currentSupported` | The candidate worsens median absolute error by at least 10%. |
| `inconclusive` | Both architectures remain too close to select one. |
| `reviewRequired` | At least one eligible day differs by more than 250 kcal. |

These statuses are diagnostic evidence, not permission to switch the production
formula.

## Statistical limits

1. Weight change is not pure tissue change. Water, glycogen, sodium, digestion,
   menstrual cycle, illness, and creatine can influence the inferred result.
2. Rolling windows overlap and are not independent observations. Fifteen valid
   windows from 28 days do not equal fifteen independent users or periods.
3. Food logging error directly affects inferred expenditure.
4. Targets created before the versioned input snapshot cannot be compared
   reliably. They are excluded as `missingHistoricalInputs`; they are never
   reconstructed with the current profile or settings.
5. Temporary context flags are counted per window but do not automatically
   exclude it. Product or clinical review must inspect heavily affected windows.
6. This local report cannot satisfy a cohort-level release criterion by itself.

## Weekly review surface

`loadEnergyArchitectureRetrospective(analysisEnd, profile)` returns the report
without writing to Dexie or cloud storage.

The weekly review snapshot now includes this report as
`energyRetrospective`. The page exposes it in a collapsed expert diagnostic
after the primary decision and weekly guidance:

- the summary states that the comparison is experimental;
- the detail opens automatically only for `reviewRequired`;
- coverage, valid windows, weigh-ins, exclusions, and errors remain visible;
- no accept, apply, or switch command exists;
- the report status never changes the weekly calorie proposal.

The report remains ephemeral and isolated from the persisted `WeeklyReview`.
Its loading also fails soft: an unavailable diagnostic is omitted and cannot
block the weekly review or its decision workflow.
