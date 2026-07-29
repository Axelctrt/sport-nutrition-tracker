import { describe, expect, it } from 'vitest';
import {
  buildDailyTargetEnergyInputSnapshot,
  restoreDailyTargetEnergyContext,
} from '@/domain/calculations/dailyTargetInputSnapshot';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

describe('daily target energy input snapshot', () => {
  it('fige les paramètres qui pilotent la cible quotidienne', () => {
    const profile = createEntity(createProfileInput({
      occupationalActivity: 'active',
      dailyStepGoal: 12_000,
    }));
    const settings = {
      ...createDefaultAppSettings(),
      includedBaseSteps: 2_500,
      walkingKcalPerKgPerKm: 0.55,
    };

    const snapshot = buildDailyTargetEnergyInputSnapshot(profile, settings);
    profile.occupationalActivity = 'sedentary';
    settings.swimmingMetValues.endurance = 99;

    expect(snapshot).toMatchObject({
      version: 1,
      profile: {
        occupationalActivity: 'active',
        dailyStepGoal: 12_000,
      },
      settings: {
        includedBaseSteps: 2_500,
        walkingKcalPerKgPerKm: 0.55,
        swimmingMetValues: {
          endurance: 6,
        },
      },
    });
  });

  it('restaure le contexte historique sans perdre les métadonnées courantes', () => {
    const currentProfile = createEntity(createProfileInput({
      occupationalActivity: 'sedentary',
    }), 'profile');
    const currentSettings = createDefaultAppSettings();
    const historicalProfile = {
      ...currentProfile,
      occupationalActivity: 'veryActive' as const,
      heightCm: 185,
    };
    const historicalSettings = {
      ...currentSettings,
      includedBaseSteps: 4_000,
    };
    const snapshot = buildDailyTargetEnergyInputSnapshot(
      historicalProfile,
      historicalSettings,
    );

    const restored = restoreDailyTargetEnergyContext(
      snapshot,
      currentProfile,
      currentSettings,
    );

    expect(restored.profile).toMatchObject({
      id: 'profile',
      occupationalActivity: 'veryActive',
      heightCm: 185,
    });
    expect(restored.settings.includedBaseSteps).toBe(4_000);
  });
});
