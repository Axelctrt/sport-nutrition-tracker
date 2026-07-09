import { describe, expect, it } from 'vitest';
import { buildPlannedActivityCalories, strengthSessionMet } from '@/application/planning/plannedActivityCalories';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { Activity, StrengthTrainingActivity } from '@/domain/models/activity';
import type { WorkoutSession } from '@/domain/models/strength';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import { createEntity } from '@/shared/utils/entities';

function strengthSession(
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession {
  const created = createEntity<WorkoutSession>({
    date: '2026-07-13',
    status: 'planned',
    plannedDate: '2026-07-13',
    plannedDurationMinutes: 60,
    strengthSessionStyle: 'classic',
    sourceTemplateNameSnapshot: 'Haut du corps',
  });
  return { ...created, ...overrides };
}

function enduranceSession(
  overrides: Partial<PlannedEnduranceSession> = {},
): PlannedEnduranceSession {
  return {
    id: crypto.randomUUID(),
    title: 'Course facile',
    activityType: 'running',
    date: '2026-07-13',
    intensity: 'low',
    targetDurationMinutes: 60,
    targetDistanceKm: 10,
    status: 'planned',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
    ...overrides,
  };
}

function actualStrengthActivity(sessionId = 'planned-session'): Activity {
  return createEntity<StrengthTrainingActivity>({
    type: 'strengthTraining' as const,
    date: '2026-07-13',
    durationMinutes: 60,
    intensity: 'moderate' as const,
    met: 5,
    plannedActivity: { source: 'strengthSession', sourceId: sessionId },
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: 294,
      metUsed: 5,
      calculationVersion: 2,
    },
  });
}

describe('plannedActivityCalories', () => {
  const settings = createDefaultAppSettings();

  it('utilise le MET caché du type de séance de musculation', () => {
    const projections = buildPlannedActivityCalories({
      date: '2026-07-13',
      weightKg: 70,
      settings,
      activities: [],
      strengthSessions: [strengthSession()],
      enduranceSessions: [],
    });

    expect(strengthSessionMet('classic')).toBe(3.5);
    expect(strengthSessionMet('strength')).toBe(5);
    expect(strengthSessionMet('circuit')).toBe(5.8);
    expect(strengthSessionMet('veryIntense')).toBe(6);
    expect(projections).toHaveLength(1);
    expect(projections[0]).toMatchObject({
      activityType: 'strengthTraining',
      basis: 'plannedDuration',
      durationMinutes: 60,
      metUsed: 3.5,
      estimatedCaloriesKcal: 183.75,
    });
  });

  it('remplace la durée prévue par la durée réelle d’une séance détaillée terminée', () => {
    const projections = buildPlannedActivityCalories({
      date: '2026-07-13',
      weightKg: 70,
      settings,
      activities: [],
      strengthSessions: [strengthSession({
        status: 'completed',
        durationMinutes: 80,
      })],
      enduranceSessions: [],
    });

    expect(projections[0]).toMatchObject({
      basis: 'actualDuration',
      durationMinutes: 80,
      estimatedCaloriesKcal: 245,
    });
  });

  it('estime une course planifiée avec la distance en priorité', () => {
    const projections = buildPlannedActivityCalories({
      date: '2026-07-13',
      weightKg: 70,
      settings,
      activities: [],
      strengthSessions: [],
      enduranceSessions: [enduranceSession()],
    });

    expect(projections[0]).toMatchObject({
      basis: 'plannedDistance',
      activityType: 'running',
      estimatedCaloriesKcal: 700,
      coefficientUsed: 1,
    });
  });

  it('ne double pas une activité réelle correspondant à la prévision', () => {
    const projections = buildPlannedActivityCalories({
      date: '2026-07-13',
      weightKg: 70,
      settings,
      activities: [actualStrengthActivity('planned-session')],
      strengthSessions: [strengthSession({ id: 'planned-session' })],
      enduranceSessions: [],
    });

    expect(projections).toEqual([]);
  });

  it('ignore une séance annulée ou impossible à estimer', () => {
    const noDurationStrength = strengthSession();
    delete noDurationStrength.plannedDurationMinutes;
    const distanceOnlySwimming = enduranceSession({
      activityType: 'swimming',
      targetDistanceMeters: 1500,
    });
    delete distanceOnlySwimming.targetDurationMinutes;
    delete distanceOnlySwimming.targetDistanceKm;

    const projections = buildPlannedActivityCalories({
      date: '2026-07-13',
      weightKg: 70,
      settings,
      activities: [],
      strengthSessions: [
        strengthSession({ status: 'skipped' }),
        noDurationStrength,
      ],
      enduranceSessions: [
        enduranceSession({ status: 'skipped' }),
        distanceOnlySwimming,
      ],
    });

    expect(projections).toEqual([]);
  });

  it('estime une séance détaillée libre terminée avec le profil classique par défaut', () => {
    const freeSession = strengthSession({
      status: 'completed',
      durationMinutes: 60,
    });
    delete freeSession.plannedDate;
    delete freeSession.plannedDurationMinutes;
    delete freeSession.strengthSessionStyle;
    delete freeSession.sourceTemplateNameSnapshot;

    const projections = buildPlannedActivityCalories({
      date: '2026-07-13',
      weightKg: 70,
      settings,
      activities: [],
      strengthSessions: [freeSession],
      enduranceSessions: [],
    });

    expect(projections[0]).toMatchObject({
      title: 'Séance de musculation',
      basis: 'actualDuration',
      metUsed: 3.5,
      estimatedCaloriesKcal: 183.75,
    });
  });

  it('ne laisse pas une séance annulée consommer l’activité réelle d’une autre séance prévue', () => {
    const projections = buildPlannedActivityCalories({
      date: '2026-07-13',
      weightKg: 70,
      settings,
      activities: [actualStrengthActivity('planned-session')],
      strengthSessions: [
        strengthSession({
          id: 'skipped-session',
          status: 'skipped',
          createdAt: '2026-07-01T07:00:00.000Z',
        }),
        strengthSession({
          id: 'planned-session',
          createdAt: '2026-07-01T08:00:00.000Z',
        }),
      ],
      enduranceSessions: [],
    });

    expect(projections).toEqual([]);
  });

});
