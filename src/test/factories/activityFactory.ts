import type { RunningActivity } from '@/domain/models/activity';
import type { NewEntity } from '@/domain/models/common';

export function createRunningActivityInput(
  overrides: Partial<NewEntity<RunningActivity>> = {},
): NewEntity<RunningActivity> {
  return {
    type: 'running',
    date: '2026-06-23',
    time: '18:00',
    durationMinutes: 50,
    intensity: 'moderate',
    rpe: 6,
    sessionType: 'easy',
    distanceKm: 8,
    averageCadenceSpm: 170,
    calculation: {
      weightKg: 60,
      estimatedCaloriesKcal: 480,
      coefficientUsed: 1,
      calculationVersion: 1,
    },
    ...overrides,
  };
}
