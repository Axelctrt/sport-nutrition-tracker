import { describe, expect, it } from 'vitest';
import { activityFormSchema } from '@/features/activities/schemas/activityFormSchema';

const baseValues = {
  activityType: 'running' as const,
  date: '2026-06-23',
  time: '18:30',
  durationMinutes: 45,
  intensity: 'moderate' as const,
  notes: '',
  intervalDetails: '',
  manualCaloriesKcal: undefined,
  runningSessionType: 'easy' as const,
  distanceKm: 8,
  averageCadenceSpm: 170,
  elevationGainMeters: undefined,
  terrainType: 'road' as const,
  swimmingSessionType: 'endurance' as const,
  mainStroke: 'freestyle' as const,
  distanceMeters: undefined,
  poolLengthMeters: undefined,
  bikeType: 'road' as const,
  cyclingEnvironment: 'outdoor' as const,
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
  poolLengthMeters: undefined,
  bikeType: 'road' as const,
  cyclingEnvironment: 'outdoor' as const,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'distanceMeters')).toBe(true);
    }
  });

  it('exige une distance et un MET pour le vélo', () => {
    const invalid = activityFormSchema.safeParse({
      ...baseValues,
      activityType: 'cycling',
      distanceKm: undefined,
      averageCadenceSpm: undefined,
      met: undefined,
    });

    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(['distanceKm', 'met']),
      );
    }

    expect(activityFormSchema.safeParse({
      ...baseValues,
      activityType: 'cycling',
      distanceKm: 42,
      averageCadenceSpm: undefined,
      met: 6.8,
      elevationGainMeters: 520,
      bikeType: 'road',
      cyclingEnvironment: 'outdoor',
    }).success).toBe(true);
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

  it('ignore un ancien RPE transmis par une sauvegarde ou un état historique', () => {
    const result = activityFormSchema.parse({ ...baseValues, rpe: 11 });
    expect(result).not.toHaveProperty('rpe');
  });
});
