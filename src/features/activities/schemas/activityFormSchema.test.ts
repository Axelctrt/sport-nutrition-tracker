import { describe, expect, it } from 'vitest';
import { activityFormSchema } from '@/features/activities/schemas/activityFormSchema';

const baseValues = {
  activityType: 'running' as const,
  date: '2026-06-23',
  time: '18:30',
  durationMinutes: 45,
  intensity: 'moderate' as const,
  rpe: 6,
  notes: '',
  manualCaloriesKcal: undefined,
  runningSessionType: 'easy' as const,
  distanceKm: 8,
  averageCadenceSpm: 170,
  swimmingSessionType: 'endurance' as const,
  mainStroke: 'freestyle' as const,
  distanceMeters: undefined,
  met: undefined,
  includedInDailySteps: false,
};

describe('activityFormSchema', () => {
  it('accepte une course complète', () => {
    expect(activityFormSchema.safeParse(baseValues).success).toBe(true);
  });

  it('refuse une course sans distance ni cadence', () => {
    const result = activityFormSchema.safeParse({
      ...baseValues,
      distanceKm: undefined,
      averageCadenceSpm: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(['distanceKm', 'averageCadenceSpm']),
      );
    }
  });

  it('exige une distance pour la natation', () => {
    const result = activityFormSchema.safeParse({
      ...baseValues,
      activityType: 'swimming',
      distanceKm: undefined,
      averageCadenceSpm: undefined,
      distanceMeters: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'distanceMeters')).toBe(true);
    }
  });

  it('accepte une marche incluse dans les pas avec son MET', () => {
    const result = activityFormSchema.safeParse({
      ...baseValues,
      activityType: 'walking',
      distanceKm: undefined,
      averageCadenceSpm: undefined,
      met: 3.5,
      includedInDailySteps: true,
    });

    expect(result.success).toBe(true);
  });

  it('refuse un RPE hors de la plage 1 à 10', () => {
    expect(activityFormSchema.safeParse({ ...baseValues, rpe: 11 }).success).toBe(false);
  });
});
