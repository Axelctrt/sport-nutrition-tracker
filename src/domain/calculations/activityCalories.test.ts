import { describe, expect, it } from 'vitest';
import {
  estimateActivityCalories,
  getEffectiveActivityCalories,
} from '@/domain/calculations/activityCalories';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { RunningActivity } from '@/domain/models/activity';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import { createEntity } from '@/shared/utils/entities';

 describe('calcul des calories d’activité', () => {
  const settings = createDefaultAppSettings();

  it('crée un snapshot de course avec le coefficient utilisé', () => {
    expect(estimateActivityCalories(
      { type: 'running', distanceKm: 10 },
      70,
      settings,
    )).toEqual({
      weightKg: 70,
      estimatedCaloriesKcal: 700,
      coefficientUsed: 1,
      calculationVersion: 1,
    });
  });

  it('utilise le MET correspondant au type de natation', () => {
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
    expect(result.estimatedCaloriesKcal).toBe(441);
  });

  it('utilise le MET saisi pour la musculation', () => {
    const result = estimateActivityCalories(
      { type: 'strengthTraining', durationMinutes: 60, met: 5 },
      70,
      settings,
    );

    expect(result.metUsed).toBe(5);
    expect(result.estimatedCaloriesKcal).toBe(367.5);
  });

  it('privilégie les calories corrigées manuellement', () => {
    const activity = createEntity<RunningActivity>({
      ...createRunningActivityInput(),
      manualCaloriesKcal: 425,
    });

    expect(getEffectiveActivityCalories(activity)).toBe(425);
  });

  it('utilise l’estimation enregistrée en l’absence de correction', () => {
    const activity = createEntity<RunningActivity>(createRunningActivityInput());
    expect(getEffectiveActivityCalories(activity)).toBe(480);
  });
});
