import { describe, expect, it } from 'vitest';
import { buildDailyEnergyTransparency } from '@/application/daily/dailyEnergyTransparency';
import { calculateDailyTarget } from '@/domain/calculations/dailyTarget';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { Activity, CyclingActivity, OtherActivity } from '@/domain/models/activity';
import type { PlannedActivityCalorieSnapshot } from '@/domain/models/plannedActivity';
import type { UserProfile } from '@/domain/models/profile';
import type { WorkoutSession } from '@/domain/models/strength';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import { createEntity } from '@/shared/utils/entities';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createWorkoutSessionInput } from '@/test/factories/strengthFactory';

const date = '2026-07-13';
const settings = createDefaultAppSettings();
const profile = createEntity<UserProfile>(createProfileInput({ initialWeightKg: 70 }));

function cyclingActivity(): CyclingActivity {
  return createEntity<CyclingActivity>({
    type: 'cycling',
    date,
    durationMinutes: 30,
    intensity: 'moderate',
    met: 6,
    includedInDailySteps: false,
    manualCaloriesKcal: 120,
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: 184,
      metUsed: 6,
      calculationVersion: 2,
    },
  }, 'activity-unplanned');
}

function plannedStrengthProjection(): PlannedActivityCalorieSnapshot {
  return {
    id: 'strengthSession:strength-planned',
    source: 'strengthSession',
    sourceId: 'strength-planned',
    title: 'Push prévu',
    date,
    activityType: 'strengthTraining',
    estimatedCaloriesKcal: 184,
    weightKg: 70,
    calculationVersion: 1,
    basis: 'plannedDuration',
    durationMinutes: 60,
    metUsed: 3.5,
  };
}

function completedStrengthProjection(): PlannedActivityCalorieSnapshot {
  return {
    id: 'strengthSession:strength-completed',
    source: 'strengthSession',
    sourceId: 'strength-completed',
    title: 'Jambes',
    date,
    activityType: 'strengthTraining',
    estimatedCaloriesKcal: 245,
    weightKg: 70,
    calculationVersion: 1,
    basis: 'actualDuration',
    durationMinutes: 80,
    metUsed: 3.5,
  };
}

describe('dailyEnergyTransparency', () => {
  it('sépare le prévu, le réalisé lié et l’activité imprévue avec leur écart', () => {
    const linkedRunning = createEntity(
      createRunningActivityInput({
        date,
        distanceKm: 8,
        manualCaloriesKcal: 610,
        plannedActivity: {
          source: 'endurancePlanning',
          sourceId: 'run-planned',
        },
      }),
      'activity-running',
    );
    const activities: Activity[] = [linkedRunning, cyclingActivity()];
    const plannedActivities = [
      plannedStrengthProjection(),
      completedStrengthProjection(),
    ];
    const strengthSessions: WorkoutSession[] = [
      createEntity(createWorkoutSessionInput({
        date,
        plannedDate: date,
        status: 'planned',
        plannedDurationMinutes: 60,
        strengthSessionStyle: 'classic',
        sourceTemplateNameSnapshot: 'Push prévu',
      }), 'strength-planned'),
      createEntity(createWorkoutSessionInput({
        date,
        plannedDate: date,
        status: 'completed',
        plannedDurationMinutes: 60,
        durationMinutes: 80,
        strengthSessionStyle: 'classic',
        sourceTemplateNameSnapshot: 'Jambes',
      }), 'strength-completed'),
    ];
    const enduranceSessions: PlannedEnduranceSession[] = [{
      id: 'run-planned',
      title: 'Footing prévu',
      activityType: 'running',
      date,
      intensity: 'moderate',
      targetDistanceKm: 8,
      status: 'planned',
      createdAt: '2026-07-01T08:00:00.000Z',
      updatedAt: '2026-07-01T08:00:00.000Z',
      completedActivityId: linkedRunning.id,
    }];
    const calculation = calculateDailyTarget({
      date,
      profile,
      settings,
      weightKg: 70,
      totalSteps: 3_000,
      activities,
      plannedActivities,
    });

    const result = buildDailyEnergyTransparency({
      date,
      calculation,
      activities,
      plannedActivities,
      strengthSessions,
      enduranceSessions,
      settings,
      weightKg: 70,
    });

    expect(result.plannedSportCaloriesKcal).toBe(184);
    expect(result.actualSportCaloriesKcal).toBe(975);
    expect(result.rawSportCaloriesKcal).toBe(1_159);
    expect(result.currentTargetKcal).toBe(calculation.targetCaloriesKcal);
    expect(result.targetBeforeSportKcal + result.targetSportImpactKcal)
      .toBe(result.currentTargetKcal);

    expect(result.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: 'Push prévu',
        status: 'planned',
        caloriesKcal: 184,
      }),
      expect.objectContaining({
        title: 'Jambes',
        status: 'realizedPlanned',
        plannedCaloriesKcal: 183.75,
        deltaCaloriesKcal: 61.25,
      }),
      expect.objectContaining({
        title: 'Footing prévu',
        status: 'realizedPlanned',
        calculationSource: 'manual',
        plannedCaloriesKcal: 560,
        deltaCaloriesKcal: 50,
      }),
      expect.objectContaining({
        title: 'Vélo',
        status: 'unplanned',
        calculationSource: 'manual',
        caloriesKcal: 120,
      }),
    ]));
  });

  it('explique qu’une marche déjà intégrée aux pas n’ajoute pas de calories', () => {
    const walking = createEntity<OtherActivity>({
      type: 'walking',
      date,
      durationMinutes: 30,
      intensity: 'low',
      met: 3,
      includedInDailySteps: true,
      calculation: {
        weightKg: 70,
        estimatedCaloriesKcal: 61,
        metUsed: 3,
        calculationVersion: 2,
      },
    }, 'walking-in-steps');
    const calculation = calculateDailyTarget({
      date,
      profile,
      settings,
      weightKg: 70,
      totalSteps: 8_000,
      activities: [walking],
    });

    const result = buildDailyEnergyTransparency({
      date,
      calculation,
      activities: [walking],
      plannedActivities: [],
      strengthSessions: [],
      enduranceSessions: [],
      settings,
      weightKg: 70,
    });

    expect(result.actualSportCaloriesKcal).toBe(0);
    expect(result.items).toEqual([
      expect.objectContaining({
        status: 'includedInSteps',
        caloriesKcal: 0,
        detail: 'Déjà incluse dans les pas de la journée',
      }),
    ]);
  });
});
