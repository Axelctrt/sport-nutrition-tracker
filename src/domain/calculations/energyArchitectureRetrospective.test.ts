import { addDays, parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  buildEnergyArchitectureRetrospective,
  type EnergyArchitectureRetrospectiveDay,
} from '@/domain/calculations/energyArchitectureRetrospective';
import type { LocalDate } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';
import { createEntity } from '@/shared/utils/entities';
import { toLocalDate } from '@/shared/utils/dates';

const analysisStart = '2026-07-01';

function dateAt(index: number): LocalDate {
  return toLocalDate(addDays(parseISO(analysisStart), index));
}

function completeDays(
  count: number,
  overrides: Partial<EnergyArchitectureRetrospectiveDay> = {},
): EnergyArchitectureRetrospectiveDay[] {
  return Array.from({ length: count }, (_, index) => ({
    date: dateAt(index),
    checkOutCompleted: true,
    journalComplete: true,
    linkedStepsAvailable: true,
    dailyTargetAvailable: true,
    consumedCaloriesKcal: 2_200,
    currentExpenditureKcal: 2_400,
    candidateExpenditureKcal: 2_220,
    hasTemporaryContext: false,
    ...overrides,
  }));
}

function weights(
  count: number,
  dailyChangeKg = 0,
): WeightEntry[] {
  return Array.from({ length: count }, (_, index) => createEntity<WeightEntry>({
    date: dateAt(index),
    weightKg: 70 + dailyChangeKg * index,
  }));
}

describe('energy architecture retrospective', () => {
  it('soutient le candidat quand il réduit nettement l’erreur médiane', () => {
    const report = buildEnergyArchitectureRetrospective({
      analysisStart,
      analysisEnd: dateAt(27),
      days: completeDays(28),
      weights: weights(28),
    });

    expect(report.validWindowCount).toBe(15);
    expect(report.status).toBe('candidateSupported');
    expect(report.summary).toMatchObject({
      medianCurrentAbsoluteErrorKcal: 200,
      medianCandidateAbsoluteErrorKcal: 20,
      candidateMedianImprovementPercent: 90,
      maximumDailyDifferenceKcal: 180,
      candidateMeetsAccuracyThresholds: true,
    });
  });

  it('conserve le moteur actuel quand le candidat dégrade la précision', () => {
    const report = buildEnergyArchitectureRetrospective({
      analysisStart,
      analysisEnd: dateAt(27),
      days: completeDays(28, {
        currentExpenditureKcal: 2_200,
        candidateExpenditureKcal: 2_000,
      }),
      weights: weights(28),
    });

    expect(report.status).toBe('currentSupported');
    expect(report.summary).toMatchObject({
      medianCurrentAbsoluteErrorKcal: 0,
      medianCandidateAbsoluteErrorKcal: 200,
      candidateMeetsAccuracyThresholds: false,
    });
  });

  it('infère la dépense depuis les apports et la tendance de poids', () => {
    const report = buildEnergyArchitectureRetrospective({
      analysisStart,
      analysisEnd: dateAt(13),
      days: completeDays(14, {
        consumedCaloriesKcal: 2_500,
        currentExpenditureKcal: 1_730,
        candidateExpenditureKcal: 1_730,
      }),
      weights: weights(14, 0.1),
    });

    expect(report.validWindowCount).toBe(1);
    expect(report.windows[0]).toMatchObject({
      weightTrendKgPerWeek: 0.7,
      inferredExpenditureKcal: 1_730,
      currentAbsoluteErrorKcal: 0,
      candidateAbsoluteErrorKcal: 0,
    });
    expect(report.status).toBe('insufficientData');
    expect(report.blockingFactors).toContain(
      'At least 28 complete canonical days are required.',
    );
  });

  it('demande une revue pour un écart quotidien supérieur à 250 kcal', () => {
    const report = buildEnergyArchitectureRetrospective({
      analysisStart,
      analysisEnd: dateAt(27),
      days: completeDays(28, {
        candidateExpenditureKcal: 2_100,
      }),
      weights: weights(28),
    });

    expect(report.status).toBe('reviewRequired');
    expect(report.summary?.maximumDailyDifferenceKcal).toBe(300);
    expect(report.summary?.candidateMeetsAccuracyThresholds).toBe(false);
  });

  it('exclut les journées sans pas liés et refuse une fenêtre incomplète', () => {
    const days = completeDays(14);
    days[6] = {
      ...days[6]!,
      linkedStepsAvailable: false,
    };
    const report = buildEnergyArchitectureRetrospective({
      analysisStart,
      analysisEnd: dateAt(13),
      days,
      weights: weights(14),
    });

    expect(report.status).toBe('insufficientData');
    expect(report.eligibleDayCount).toBe(13);
    expect(report.validWindowCount).toBe(0);
    expect(report.exclusionCounts.missingLinkedSteps).toBe(1);
    expect(report.excludedDays).toContainEqual({
      date: dateAt(6),
      reasons: ['missingLinkedSteps'],
    });
  });

  it('compte chaque cause lorsque la journée est totalement absente', () => {
    const report = buildEnergyArchitectureRetrospective({
      analysisStart,
      analysisEnd: analysisStart,
      days: [],
      weights: [],
    });

    expect(report.excludedDays[0]?.reasons).toEqual([
      'missingCheckOut',
      'incompleteFoodJournal',
      'missingFoodData',
      'missingLinkedSteps',
      'missingDailyTarget',
    ]);
  });
});
