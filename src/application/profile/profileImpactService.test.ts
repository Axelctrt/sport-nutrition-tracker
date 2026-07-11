import { describe, expect, it } from 'vitest';
import {
  appendProfileImpactHistory,
  createProfileImpactHistoryEntry,
  detectProfileImpactFields,
  MAX_PROFILE_IMPACT_HISTORY_ENTRIES,
  type ProfileImpactPreview,
} from '@/application/profile/profileImpactService';
import type { ProfileImpactHistoryEntry, UserProfile } from '@/domain/models/profile';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createEntity } from '@/shared/utils/entities';

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    ...createEntity(createProfileInput(), 'local-user-profile', '2026-07-10T08:00:00.000Z'),
    ...overrides,
  };
}

function preview(): ProfileImpactPreview {
  return {
    date: '2026-07-10',
    changedFields: ['goal', 'targetWeeklyWeightChangePercent'],
    changedFieldLabels: ['objectif', 'variation hebdomadaire'],
    before: {
      targetCaloriesKcal: 2400,
      macros: { proteinGrams: 108, carbohydratesGrams: 322, fatGrams: 54 },
      calculationWeightKg: 60,
    },
    after: {
      targetCaloriesKcal: 2180,
      macros: { proteinGrams: 108, carbohydratesGrams: 267, fatGrams: 54 },
      calculationWeightKg: 60,
    },
  };
}

describe('profileImpactService', () => {
  it('détecte uniquement les champs ayant un impact explicable', () => {
    const current = profile();
    const next = {
      ...createProfileInput({
        firstName: 'Nouveau nom',
        goal: 'loss',
        targetWeeklyWeightChangePercent: -0.5,
        dailyStepGoal: 12_000,
      }),
    };

    expect(detectProfileImpactFields(current, next)).toEqual([
      'goal',
      'targetWeeklyWeightChangePercent',
      'dailyStepGoal',
    ]);
  });


  it('ignore le simple rafraîchissement de la date de référence d’un âge inchangé', () => {
    const current = profile({
      ageInformation: { mode: 'age', ageYears: 30, recordedOn: '2026-01-01' },
    });
    const next = createProfileInput({
      ageInformation: { mode: 'age', ageYears: 30, recordedOn: '2026-07-10' },
    });

    expect(detectProfileImpactFields(current, next)).not.toContain('ageInformation');
  });

  it('crée une entrée compréhensible avec l’avant et l’après', () => {
    const entry = createProfileImpactHistoryEntry(
      preview(),
      '2026-07-10T09:00:00.000Z',
    );

    expect(entry).toMatchObject({
      changedAt: '2026-07-10T09:00:00.000Z',
      effectiveDate: '2026-07-10',
      beforeTargetCaloriesKcal: 2400,
      afterTargetCaloriesKcal: 2180,
      summary: 'La modification a changé les objectifs nutritionnels calculés pour la journée.',
    });
    expect(entry.id).toBeTruthy();
  });

  it('limite le journal aux entrées les plus récentes', () => {
    const existing: ProfileImpactHistoryEntry[] = Array.from(
      { length: MAX_PROFILE_IMPACT_HISTORY_ENTRIES },
      (_, index) => ({
        ...createProfileImpactHistoryEntry(preview(), `2026-07-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`),
        id: `entry-${index}`,
      }),
    );
    const newest = {
      ...createProfileImpactHistoryEntry(preview(), '2026-07-31T09:00:00.000Z'),
      id: 'newest',
    };

    const result = appendProfileImpactHistory(existing, newest);

    expect(result).toHaveLength(MAX_PROFILE_IMPACT_HISTORY_ENTRIES);
    expect(result[0]?.id).toBe('newest');
    expect(result.some((entry) => entry.id === 'entry-0')).toBe(false);
  });
});
