import { describe, expect, it } from 'vitest';
import {
  calculateAverageSpeedKmh,
  calculateEnduranceRecords,
  calculatePoolLengths,
} from '@/domain/calculations/endurance';
import type { Activity, CyclingActivity, RunningActivity, SwimmingActivity } from '@/domain/models/activity';

const metadata = {
  id: 'activity',
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
};
const calculation = { weightKg: 60, estimatedCaloriesKcal: 400, calculationVersion: 1 };

function run(overrides: Partial<RunningActivity> = {}): RunningActivity {
  return {
    ...metadata,
    type: 'running',
    date: '2026-06-01',
    durationMinutes: 50,
    intensity: 'moderate',
    sessionType: 'easy',
    distanceKm: 10,
    averageCadenceSpm: 170,
    calculation,
    ...overrides,
  };
}

function swim(overrides: Partial<SwimmingActivity> = {}): SwimmingActivity {
  return {
    ...metadata,
    type: 'swimming',
    date: '2026-06-01',
    durationMinutes: 40,
    intensity: 'moderate',
    sessionType: 'endurance',
    mainStroke: 'freestyle',
    distanceMeters: 2_000,
    calculation,
    ...overrides,
  };
}

function ride(overrides: Partial<CyclingActivity> = {}): CyclingActivity {
  return {
    ...metadata,
    type: 'cycling',
    date: '2026-06-01',
    durationMinutes: 90,
    intensity: 'moderate',
    met: 6.8,
    includedInDailySteps: false,
    distanceKm: 40,
    calculation,
    ...overrides,
  };
}

describe('calculs endurance', () => {
  it('calcule vitesse moyenne et longueurs de bassin', () => {
    expect(calculateAverageSpeedKmh(90, 45)).toBe(30);
    expect(calculatePoolLengths(1_500, 25)).toBe(60);
    expect(calculatePoolLengths(1_500, undefined)).toBeUndefined();
  });

  it('recalcule les records depuis les activités', () => {
    const activities: Activity[] = [
      run(),
      run({ id: 'run-fast', durationMinutes: 45, distanceKm: 10, elevationGainMeters: 80 }),
      swim(),
      swim({ id: 'swim-long', distanceMeters: 3_000, durationMinutes: 70 }),
      ride(),
      ride({ id: 'ride-fast', durationMinutes: 60, distanceKm: 35, elevationGainMeters: 500 }),
    ];
    const records = calculateEnduranceRecords(activities);

    expect(records.running.fastestPace?.activity.id).toBe('run-fast');
    expect(records.running.highestElevation?.value).toBe(80);
    expect(records.running.commonDistances).toEqual([
      expect.objectContaining({ distance: 10, durationSeconds: 2_700 }),
    ]);
    expect(records.swimming.longest?.value).toBe(3_000);
    expect(records.swimming.commonDistances).toEqual([
      expect.objectContaining({ distance: 3_000, durationSeconds: 4_200 }),
    ]);
    expect(records.cycling.fastestSpeed?.value).toBe(35);
    expect(records.cycling.highestElevation?.value).toBe(500);
  });
});
