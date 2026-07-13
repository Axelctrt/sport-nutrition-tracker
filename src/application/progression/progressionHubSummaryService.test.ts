import { calculateEnduranceRecords } from '@/domain/calculations/endurance';
import { createTwelveWeekWindow } from '@/domain/aggregations/analytics';
import type { GoalProgressView } from '@/application/goals/goalProgressService';
import type { TwelveWeekAnalytics, WeightWeekSummary } from '@/domain/models/analytics';
import type { UserProfile } from '@/domain/models/profile';
import {
  buildProgressionHubSummary,
} from '@/application/progression/progressionHubSummaryService';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createEntity } from '@/shared/utils/entities';

const REFERENCE_DATE = '2026-07-12';

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    ...createEntity(createProfileInput()),
    ...overrides,
  };
}

function createAnalytics({
  sessionCount = 0,
  totalSportMinutes = 0,
  averageSteps,
  recordedStepDays = 0,
  weightWeeks = [],
}: {
  sessionCount?: number;
  totalSportMinutes?: number;
  averageSteps?: number;
  recordedStepDays?: number;
  weightWeeks?: WeightWeekSummary[];
} = {}): TwelveWeekAnalytics {
  const weeks = createTwelveWeekWindow(REFERENCE_DATE);

  return {
    from: weeks[0]?.weekStart ?? REFERENCE_DATE,
    to: weeks.at(-1)?.weekEnd ?? REFERENCE_DATE,
    running: [],
    swimming: [],
    cycling: [],
    enduranceRecords: calculateEnduranceRecords([]),
    nutrition: [],
    activity: weeks.map((week, index) => ({
      ...week,
      ...(index === weeks.length - 1 && averageSteps !== undefined
        ? { averageSteps }
        : {}),
      recordedStepDays: index === weeks.length - 1 ? recordedStepDays : 0,
      totalSportMinutes: index === weeks.length - 1 ? totalSportMinutes : 0,
      sessionCount: index === weeks.length - 1 ? sessionCount : 0,
      breakdown: [],
    })),
    weight: {
      movingAverage: [],
      weekly: weightWeeks,
    },
    activityBreakdown: [],
  };
}

function goalView({
  id,
  title,
  progressPercent,
  deadline,
  isOverdue = false,
}: {
  id: string;
  title: string;
  progressPercent: number;
  deadline?: string;
  isOverdue?: boolean;
}): GoalProgressView {
  return {
    goal: {
      id,
      title,
      metric: 'activityMinutes',
      targetValue: 600,
      startDate: '2026-07-01',
      ...(deadline ? { deadline } : {}),
      status: 'active',
      reachedMilestones: [],
      createdAt: '2026-07-01T08:00:00.000Z',
      updatedAt: '2026-07-01T08:00:00.000Z',
    },
    currentValue: 0,
    progressPercent,
    remainingValue: 600,
    ...(deadline ? { daysRemaining: 0 } : {}),
    isOverdue,
    newlyReachedMilestones: [],
  };
}

function weightWeek(
  weekStart: string,
  averageWeightKg: number,
): WeightWeekSummary {
  return {
    weekStart,
    weekEnd: weekStart,
    label: weekStart,
    averageWeightKg,
    weighInCount: 2,
    targetWeightKg: averageWeightKg,
  };
}

describe('buildProgressionHubSummary', () => {
  it('gère un profil sans donnée sans inventer de tendance', () => {
    const summary = buildProgressionHubSummary({
      analytics: createAnalytics(),
      goalViews: [],
      profile: profile(),
      referenceDate: REFERENCE_DATE,
    });

    expect(summary.activity).toEqual({
      sessionCount: 0,
      totalMinutes: 0,
      recordedStepDays: 0,
    });
    expect(summary.weight).toEqual({ state: 'empty' });
    expect(summary.goal).toEqual({ state: 'empty' });
  });

  it('expose les données partielles sans conclure trop tôt sur le poids', () => {
    const summary = buildProgressionHubSummary({
      analytics: createAnalytics({
        averageSteps: 8_400,
        recordedStepDays: 3,
        weightWeeks: [weightWeek('2026-07-06', 70.2)],
      }),
      goalViews: [],
      profile: profile({ goal: 'loss' }),
      referenceDate: REFERENCE_DATE,
    });

    expect(summary.activity.averageSteps).toBe(8_400);
    expect(summary.weight).toEqual({
      state: 'insufficient',
      latestAverageKg: 70.2,
    });
  });

  it('résume une semaine complète et priorise un objectif en retard', () => {
    const summary = buildProgressionHubSummary({
      analytics: createAnalytics({
        sessionCount: 3,
        totalSportMinutes: 185,
        averageSteps: 10_200,
        recordedStepDays: 7,
        weightWeeks: [
          weightWeek('2026-06-29', 71.4),
          weightWeek('2026-07-06', 70.8),
        ],
      }),
      goalViews: [
        goalView({
          id: 'goal-active',
          title: 'Courir 50 km',
          progressPercent: 60,
          deadline: '2026-08-01',
        }),
        goalView({
          id: 'goal-overdue',
          title: 'Terminer 8 séances',
          progressPercent: 75,
          deadline: '2026-07-10',
          isOverdue: true,
        }),
      ],
      profile: profile({ goal: 'loss' }),
      referenceDate: REFERENCE_DATE,
    });

    expect(summary.activity).toMatchObject({
      sessionCount: 3,
      totalMinutes: 185,
      averageSteps: 10_200,
    });
    expect(summary.weight).toEqual({
      state: 'aligned',
      latestAverageKg: 70.8,
      changeKg: expect.closeTo(-0.6),
    });
    expect(summary.goal).toMatchObject({
      state: 'overdue',
      title: 'Terminer 8 séances',
      progressPercent: 75,
    });
  });

  it('considère une échéance à sept jours comme proche sans dépendre du fuseau horaire', () => {
    const summary = buildProgressionHubSummary({
      analytics: createAnalytics(),
      goalViews: [goalView({
        id: 'goal-soon',
        title: 'Nager 10 km',
        progressPercent: 40,
        deadline: '2026-07-19',
      })],
      profile: profile(),
      referenceDate: REFERENCE_DATE,
    });

    expect(summary.goal).toEqual({
      state: 'dueSoon',
      title: 'Nager 10 km',
      progressPercent: 40,
      daysRemaining: 7,
    });
  });
});
