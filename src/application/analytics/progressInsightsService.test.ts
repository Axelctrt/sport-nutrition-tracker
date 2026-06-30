import { describe, expect, it } from 'vitest';

import {
  buildProgressInsights,
} from '@/application/analytics/progressInsightsService';
import type { Activity } from '@/domain/models/activity';
import type { CalendarWeek } from '@/domain/models/analytics';
import type { WorkoutSession } from '@/domain/models/strength';
import type { EndurancePlanningState } from '@/domain/planning/endurancePlanningState';

const weeks: CalendarWeek[] = [
  {
    weekStart: '2026-06-01',
    weekEnd: '2026-06-07',
    label: '1 juin',
  },
  {
    weekStart: '2026-06-08',
    weekEnd: '2026-06-14',
    label: '8 juin',
  },
];

function runningActivity(
  id: string,
  date: string,
  distanceKm: number,
): Activity {
  return {
    id,
    date,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
    type: 'running',
    durationMinutes: 30,
    intensity: 'moderate',
    sessionType: 'easy',
    distanceKm,
    averageCadenceSpm: 170,
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: 300,
      calculationVersion: 1,
    },
  };
}

function workoutSession(
  id: string,
  plannedDate: string,
  status: WorkoutSession['status'],
): WorkoutSession {
  return {
    id,
    date: plannedDate,
    plannedDate,
    status,
    createdAt: `${plannedDate}T08:00:00.000Z`,
    updatedAt: `${plannedDate}T08:00:00.000Z`,
  };
}

const endurancePlanningState: EndurancePlanningState = {
  version: 1,
  sessions: [
    {
      id: 'endurance-1',
      title: 'Course',
      activityType: 'running',
      date: '2026-06-03',
      intensity: 'moderate',
      status: 'planned',
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-01T08:00:00.000Z',
    },
  ],
};

describe('buildProgressInsights', () => {
  it('calcule l’adhérence unifiée sans doubler une activité de musculation', () => {
    const running = runningActivity('run-1', '2026-06-03', 10);
    const result = buildProgressInsights({
      weeks,
      periodActivities: [running],
      allActivities: [running],
      workoutSessions: [
        workoutSession('strength-1', '2026-06-02', 'completed'),
      ],
      endurancePlanningState,
      referenceDate: '2026-06-15',
    });

    expect(result.weeks[0]).toMatchObject({
      plannedCount: 2,
      completedCount: 2,
      adherencePercent: 100,
      recordedActivityCount: 2,
    });
    expect(result.overall.adherencePercent).toBe(100);
    expect(result.personalRecords.running.longest?.value).toBe(10);
  });

  it('ne pénalise pas une semaine sans planning et conserve l’activité libre', () => {
    const running = runningActivity('run-2', '2026-06-10', 5);
    const result = buildProgressInsights({
      weeks,
      periodActivities: [running],
      allActivities: [running],
      workoutSessions: [],
      endurancePlanningState: { version: 1, sessions: [] },
      referenceDate: '2026-06-15',
    });

    expect(result.weeks[1]).toMatchObject({
      plannedCount: 0,
      completedCount: 0,
      recordedActivityCount: 1,
    });
    expect(result.weeks[1]?.adherencePercent).toBeUndefined();
  });
});
