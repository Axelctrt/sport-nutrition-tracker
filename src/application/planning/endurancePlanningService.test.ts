import type { Activity } from '@/domain/models/activity';
import type { EndurancePlanningState } from '@/domain/planning/endurancePlanningState';
import {
  buildEndurancePlanningWeek,
} from '@/application/planning/endurancePlanningService';

function runningActivity(
  id: string,
  date: string,
): Activity {
  return {
    id,
    type: 'running',
    date,
    durationMinutes: 50,
    intensity: 'moderate',
    sessionType: 'easy',
    distanceKm: 8,
    averageCadenceSpm: 170,
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: 500,
      calculationVersion: 1,
    },
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  };
}

function state(): EndurancePlanningState {
  return {
    version: 1,
    sessions: [
      {
        id: 'run-1',
        title: 'Footing',
        activityType: 'running',
        date: '2026-06-29',
        intensity: 'low',
        targetDurationMinutes: 45,
        status: 'planned',
        createdAt: '2026-06-28T08:00:00.000Z',
        updatedAt: '2026-06-28T08:00:00.000Z',
      },
      {
        id: 'swim-1',
        title: 'Natation',
        activityType: 'swimming',
        date: '2026-06-30',
        intensity: 'moderate',
        targetDistanceMeters: 1500,
        status: 'skipped',
        createdAt: '2026-06-28T09:00:00.000Z',
        updatedAt: '2026-06-28T09:00:00.000Z',
      },
      {
        id: 'bike-1',
        title: 'Vélo',
        activityType: 'cycling',
        date: '2026-07-01',
        intensity: 'moderate',
        status: 'planned',
        createdAt: '2026-06-28T10:00:00.000Z',
        updatedAt: '2026-06-28T10:00:00.000Z',
      },
    ],
  };
}

describe('endurancePlanningService', () => {
  it('rapproche une activité réelle de la séance prévue correspondante', () => {
    const week = buildEndurancePlanningWeek(
      state(),
      [
        runningActivity(
          'activity-1',
          '2026-06-29',
        ),
      ],
      '2026-06-29',
      '2026-07-02',
    );

    expect(week.completedCount).toBe(1);
    expect(week.skippedCount).toBe(1);
    expect(week.plannedCount).toBe(1);
    expect(week.overdueCount).toBe(1);
    expect(week.actualDurationMinutes).toBe(50);
    expect(week.adherencePercent).toBe(33);
  });

  it('ne réutilise pas la même activité pour deux séances prévues', () => {
    const duplicateState = state();
    duplicateState.sessions.push({
      ...duplicateState.sessions[0]!,
      id: 'run-2',
      title: 'Deuxième footing',
      createdAt: '2026-06-28T11:00:00.000Z',
    });

    const week = buildEndurancePlanningWeek(
      duplicateState,
      [
        runningActivity(
          'activity-1',
          '2026-06-29',
        ),
      ],
      '2026-06-29',
      '2026-06-29',
    );

    expect(week.completedCount).toBe(1);
    expect(week.plannedCount).toBe(2);
  });
});
