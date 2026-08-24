import { addDays, format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { LocalDate } from '@/domain/models/common';
import {
  calculateCalorieAdaptationAssessment,
  type CalorieAdaptationObservation,
} from '@/domain/reviews/calorieAdaptationAssessment';

const ANALYSIS_START = '2026-07-06';
const ANALYSIS_END = '2026-07-26';

function dateAt(day: number): LocalDate {
  return format(addDays(new Date(`${ANALYSIS_START}T12:00:00`), day), 'yyyy-MM-dd');
}

function observations(overrides: {
  weightTrendKgPerWeek?: number;
  waistTrendCmPerWeek?: number;
  actualSteps?: number;
  recoveryConcern?: boolean;
  contextDays?: number[];
  dayCount?: number;
} = {}): CalorieAdaptationObservation[] {
  const dayCount = overrides.dayCount ?? 21;
  const weightTrend = overrides.weightTrendKgPerWeek ?? -0.35;
  return Array.from({ length: dayCount }, (_, index) => ({
    date: dateAt(index),
    ...(index % 2 === 0
      ? { weightKg: 70 + weightTrend / 7 * index }
      : {}),
    ...(overrides.waistTrendCmPerWeek !== undefined && index % 7 === 0
      ? { waistCm: 82 + overrides.waistTrendCmPerWeek / 7 * index }
      : {}),
    consumedCaloriesKcal: 2_000,
    targetCaloriesKcal: 2_000,
    proteinTargetMet: true,
    journalComplete: true,
    expectedSteps: 8_000,
    actualSteps: overrides.actualSteps ?? 8_000,
    hunger: overrides.recoveryConcern ? 'high' : 'normal',
    energy: overrides.recoveryConcern ? 'low' : 'normal',
    readiness: overrides.recoveryConcern ? 'low' : 'normal',
    sleepQuality: overrides.recoveryConcern ? 'poor' : 'average',
    hasTemporaryContext: overrides.contextDays?.includes(index) ?? false,
    strengthSessionCount: index % 5 === 0 ? 1 : 0,
  }));
}

function assess(
  observationRows: CalorieAdaptationObservation[],
  overrides: Partial<Parameters<typeof calculateCalorieAdaptationAssessment>[0]> = {},
) {
  return calculateCalorieAdaptationAssessment({
    analysisStart: ANALYSIS_START,
    analysisEnd: ANALYSIS_END,
    observations: observationRows,
    goal: 'loss',
    targetWeeklyWeightChangeKg: -0.35,
    currentCumulativeAdjustmentKcal: 0,
    maximumWeeklyAdjustmentKcal: 100,
    maximumCumulativeAdjustmentKcal: 600,
    ...overrides,
  });
}

describe('calorie adaptation assessment', () => {
  it('ne compte pas une journée sans réponse comme signal de récupération', () => {
    const rows = observations().map(({
      hunger: _hunger,
      energy: _energy,
      readiness: _readiness,
      sleepQuality: _sleepQuality,
      ...observation
    }) => observation);

    const result = assess(rows);

    expect(result.recoverySignalDays).toBe(0);
    expect(result.recoveryConcernDays).toBe(0);
    expect(result.confidence.recovery).toBe(0);
  });

  it('conserve la cible lorsque la tendance suit le rythme prévu', () => {
    const result = assess(observations());

    expect(result.detectedState).toBe('onTrack');
    expect(result.confidence.level).toBe('reliable');
    expect(result.proposedAdjustmentKcal).toBe(0);
    expect(result.blockingFactors).toEqual([]);
  });

  it('propose une correction prudente de 100 kcal sur un plateau fiable', () => {
    const result = assess(observations({ weightTrendKgPerWeek: 0 }));

    expect(result.detectedState).toBe('truePlateau');
    expect(result.proposedAdjustmentKcal).toBe(-100);
    expect(result.rawWeightBasedAdjustmentKcal).toBeLessThan(-100);
  });

  it('ne réduit pas les calories lors d’une recomposition probable', () => {
    const result = assess(observations({
      weightTrendKgPerWeek: 0,
      waistTrendCmPerWeek: -0.3,
    }));

    expect(result.detectedState).toBe('possibleRecomposition');
    expect(result.strengthSessionCount).toBeGreaterThanOrEqual(4);
    expect(result.proposedAdjustmentKcal).toBe(0);
  });

  it('attend lorsque le poids et le tour de taille sont contradictoires', () => {
    const result = assess(observations({
      weightTrendKgPerWeek: 0.25,
      waistTrendCmPerWeek: -0.25,
    }));

    expect(result.detectedState).toBe('conflictingSignals');
    expect(result.proposedAdjustmentKcal).toBe(0);
  });

  it('interprète avec prudence une variation entourée de contextes temporaires', () => {
    const result = assess(observations({
      weightTrendKgPerWeek: 0,
      contextDays: [10, 11],
    }));

    expect(result.detectedState).toBe('temporaryWaterVariation');
    expect(result.contextDayCount).toBe(2);
    expect(result.proposedAdjustmentKcal).toBe(0);
  });

  it('privilégie l’activité réelle avant de réduire la cible', () => {
    const result = assess(observations({
      weightTrendKgPerWeek: 0,
      actualSteps: 4_000,
    }));

    expect(result.detectedState).toBe('activityBelowExpected');
    expect(result.actualToExpectedStepsPercent).toBe(50);
    expect(result.proposedAdjustmentKcal).toBe(0);
  });

  it('propose de ralentir une perte trop rapide avec récupération dégradée', () => {
    const result = assess(observations({
      weightTrendKgPerWeek: -0.8,
      recoveryConcern: true,
    }));

    expect(result.detectedState).toBe('degradedRecovery');
    expect(result.proposedAdjustmentKcal).toBe(100);
  });

  it('bloque toute nouvelle correction pendant quatorze jours', () => {
    const result = assess(
      observations({ weightTrendKgPerWeek: 0 }),
      { latestAcceptedAdjustmentDate: '2026-07-20' },
    );

    expect(result.detectedState).toBe('truePlateau');
    expect(result.blockingFactors).toContain(
      'Une correction a déjà été appliquée il y a moins de 14 jours.',
    );
    expect(result.proposedAdjustmentKcal).toBe(0);
  });

  it('refuse de conclure avant quatorze jours de suivi', () => {
    const result = assess(
      observations({ dayCount: 7 }),
      { analysisEnd: '2026-07-12' },
    );

    expect(result.detectedState).toBe('insufficientData');
    expect(result.confidence.level).not.toBe('reliable');
    expect(result.proposedAdjustmentKcal).toBe(0);
  });

  it('détecte une cible probablement trop haute sur une perte suivie', () => {
    const result = assess(observations({ weightTrendKgPerWeek: 0.25 }));

    expect(result.detectedState).toBe('targetTooHigh');
    expect(result.proposedAdjustmentKcal).toBe(-100);
  });

  it('ignore une pesée manifestement isolée dans la tendance', () => {
    const rows = observations();
    rows[10] = { ...rows[10]!, weightKg: 82 };

    const result = assess(rows);

    expect(result.weightTrendKgPerWeek).toBeCloseTo(-0.35, 1);
    expect(result.detectedState).toBe('onTrack');
  });

  it('augmente prudemment la cible sur un plateau en prise de poids', () => {
    const result = assess(
      observations({ weightTrendKgPerWeek: 0 }),
      {
        goal: 'gain',
        targetWeeklyWeightChangeKg: 0.35,
      },
    );

    expect(result.detectedState).toBe('truePlateau');
    expect(result.proposedAdjustmentKcal).toBe(100);
  });

  it('réduit la cible lors d’une prise plus rapide que prévu', () => {
    const result = assess(
      observations({ weightTrendKgPerWeek: 0.8 }),
      {
        goal: 'gain',
        targetWeeklyWeightChangeKg: 0.35,
      },
    );

    expect(result.detectedState).toBe('excessiveGain');
    expect(result.proposedAdjustmentKcal).toBe(-100);
  });

  it('corrige une perte excessive pendant un objectif de maintien', () => {
    const result = assess(
      observations({ weightTrendKgPerWeek: -0.4 }),
      {
        goal: 'maintenance',
        targetWeeklyWeightChangeKg: 0,
      },
    );

    expect(result.detectedState).toBe('excessiveLoss');
    expect(result.proposedAdjustmentKcal).toBe(100);
  });

  it('bloque une conclusion lorsque le journal alimentaire est incomplet', () => {
    const rows = observations({ weightTrendKgPerWeek: 0 }).map((row, index) => ({
      ...row,
      journalComplete: index < 7,
    }));
    const result = assess(rows);

    expect(result.detectedState).toBe('insufficientFoodTracking');
    expect(result.proposedAdjustmentKcal).toBe(0);
    expect(result.blockingFactors.some((factor) => factor.includes('10 journées'))).toBe(true);
  });

  it('respecte le plafond cumulatif même sur une analyse fiable', () => {
    const result = assess(
      observations({ weightTrendKgPerWeek: 0 }),
      { currentCumulativeAdjustmentKcal: -570 },
    );

    expect(result.detectedState).toBe('truePlateau');
    expect(result.proposedAdjustmentKcal).toBe(-30);
  });
});
