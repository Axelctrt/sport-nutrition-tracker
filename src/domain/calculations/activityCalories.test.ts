import { describe, expect, it } from 'vitest';
import {
  estimateActivityCalories,
  getEffectiveActivityCalories,
} from '@/domain/calculations/activityCalories';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { RunningActivity, StrengthTrainingActivity } from '@/domain/models/activity';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import { createEntity } from '@/shared/utils/entities';

describe('calcul des calories d’activité', () => {
  const settings = createDefaultAppSettings();

  it('crée un snapshot v2 de course avec le coefficient utilisé', () => {
    expect(estimateActivityCalories(
      { type: 'running', distanceKm: 10 },
      70,
      settings,
    )).toEqual({
      weightKg: 70,
      estimatedCaloriesKcal: 700,
      coefficientUsed: 1,
      calculationVersion: 2,
    });
  });

  it('utilise le MET net correspondant au type de natation', () => {
    const result = estimateActivityCalories(
      {
        type: 'swimming',
        durationMinutes: 60,
        sessionType: 'endurance',
      },
      70,
      settings,
    );

    expect(result.metUsed).toBe(6);
    expect(result.estimatedCaloriesKcal).toBe(367.5);
    expect(result.calculationVersion).toBe(2);
  });

  it('utilise le MET net saisi pour la musculation', () => {
    const result = estimateActivityCalories(
      { type: 'strengthTraining', durationMinutes: 60, met: 5 },
      70,
      settings,
    );

    expect(result.metUsed).toBe(5);
    expect(result.estimatedCaloriesKcal).toBe(294);
    expect(result.calculationVersion).toBe(2);
  });

  it('privilégie les calories corrigées manuellement', () => {
    const activity = createEntity<RunningActivity>({
      ...createRunningActivityInput(),
      manualCaloriesKcal: 425,
    });

    expect(getEffectiveActivityCalories(activity)).toBe(425);
  });

  it('conserve l’estimation enregistrée des anciens snapshots v1', () => {
    const historical = createEntity<StrengthTrainingActivity>({
      type: 'strengthTraining',
      date: '2026-06-23',
      durationMinutes: 60,
      intensity: 'moderate',
      met: 5,
      calculation: {
        weightKg: 70,
        estimatedCaloriesKcal: 367.5,
        metUsed: 5,
        calculationVersion: 1,
      },
    });

    expect(getEffectiveActivityCalories(historical)).toBe(367.5);
  });

  it('utilise l’estimation enregistrée en l’absence de correction', () => {
    const activity = createEntity<RunningActivity>(createRunningActivityInput());
    expect(getEffectiveActivityCalories(activity)).toBe(480);
  });
});
