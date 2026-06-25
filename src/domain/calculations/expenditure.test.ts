import { describe, expect, it } from 'vitest';
import { calculateDailyExpenditure } from '@/domain/calculations/expenditure';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { Activity, OtherActivity, RunningActivity } from '@/domain/models/activity';
import type { UserProfile } from '@/domain/models/profile';
import { createEntity } from '@/shared/utils/entities';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import { createProfileInput } from '@/test/factories/profileFactory';

function createWalkingActivity(includedInDailySteps: boolean): OtherActivity {
  return createEntity<OtherActivity>({
    type: 'walking',
    date: '2026-06-23',
    durationMinutes: 60,
    intensity: 'moderate',
    met: 3.5,
    includedInDailySteps,
    calculation: {
      weightKg: 60,
      estimatedCaloriesKcal: 220.5,
      metUsed: 3.5,
      calculationVersion: 1,
    },
  });
}

 describe('dépense énergétique quotidienne', () => {
  const settings = createDefaultAppSettings();
  const profile = createEntity<UserProfile>(createProfileInput());

  it('additionne le socle, la marche supplémentaire et les activités', () => {
    const running = createEntity<RunningActivity>(createRunningActivityInput());
    const result = calculateDailyExpenditure({
      date: '2026-06-23',
      profile,
      settings,
      weightKg: 60,
      totalSteps: 12_000,
      activities: [running],
    });

    expect(result.ageYears).toBe(22);
    expect(result.energy.bmrKcal).toBe(1_601.25);
    expect(result.energy.occupationalBaseKcal).toBe(1_921.5);
    expect(result.steps.runningSteps).toBe(8_500);
    expect(result.steps.nonRunningSteps).toBe(3_500);
    expect(result.steps.additionalSteps).toBe(500);
    expect(result.energy.walkingKcal).toBeCloseTo(10.96515, 6);
    expect(result.energy.runningKcal).toBe(480);
    expect(result.energy.totalEstimatedExpenditureKcal).toBeCloseTo(
      2_412.46515,
      6,
    );
  });

  it('additionne les pas de plusieurs courses', () => {
    const firstRun = createEntity<RunningActivity>(createRunningActivityInput({
      durationMinutes: 30,
      averageCadenceSpm: 160,
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 300,
        coefficientUsed: 1,
        calculationVersion: 1,
      },
    }));
    const secondRun = createEntity<RunningActivity>(createRunningActivityInput({
      durationMinutes: 20,
      averageCadenceSpm: 180,
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 200,
        coefficientUsed: 1,
        calculationVersion: 1,
      },
    }));

    const result = calculateDailyExpenditure({
      date: '2026-06-23',
      profile,
      settings,
      weightKg: 60,
      totalSteps: 15_000,
      activities: [firstRun, secondRun],
    });

    expect(result.steps.runningSteps).toBe(8_400);
    expect(result.energy.runningKcal).toBe(500);
  });

  it('n’ajoute pas une marche déjà comprise dans les pas', () => {
    const included = calculateDailyExpenditure({
      date: '2026-06-23',
      profile,
      settings,
      weightKg: 60,
      totalSteps: 8_000,
      activities: [createWalkingActivity(true)],
    });
    const separate = calculateDailyExpenditure({
      date: '2026-06-23',
      profile,
      settings,
      weightKg: 60,
      totalSteps: 8_000,
      activities: [createWalkingActivity(false)],
    });

    expect(included.energy.otherActivitiesKcal).toBe(0);
    expect(separate.energy.otherActivitiesKcal).toBe(220.5);
  });

  it('refuse une activité provenant d’une autre date', () => {
    const activity = createEntity<RunningActivity>(createRunningActivityInput({ date: '2026-06-22' }));

    expect(() => calculateDailyExpenditure({
      date: '2026-06-23',
      profile,
      settings,
      weightKg: 60,
      totalSteps: 8_000,
      activities: [activity] as Activity[],
    })).toThrow('n’appartient pas à la journée');
  });
});
