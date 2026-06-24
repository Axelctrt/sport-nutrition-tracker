import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { LOCAL_USER_PROFILE_ID } from '@/domain/defaults/identifiers';
import type { BackupEnvelope } from '@/domain/models/backup';
import type { UserProfile } from '@/domain/models/profile';
import { migrateBackupEnvelope } from '@/infrastructure/backup/backupMigrations';
import { backupEnvelopeSchema } from '@/infrastructure/backup/backupSchemas';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

function createValidEnvelope(): BackupEnvelope {
  return {
    format: 'sportpilot-backup',
    schemaVersion: 1,
    exportedAt: '2026-06-24T10:00:00.000Z',
    data: {
      userProfile: [createEntity<UserProfile>(createProfileInput(), LOCAL_USER_PROFILE_ID)],
      appSettings: [createDefaultAppSettings()],
      weights: [],
      dailySteps: [],
      activities: [],
      foodProducts: [],
      meals: [],
      foodEntries: [],
      favoriteMeals: [],
      recipes: [],
      recipeIngredients: [],
      dailyTargets: [],
      dailyJournalStatuses: [],
      weeklyReviews: [],
      acceptedCalorieAdjustments: [],
    },
  };
}

describe('backupEnvelopeSchema', () => {
  it('valide une sauvegarde complète au format courant', () => {
    expect(backupEnvelopeSchema.parse(createValidEnvelope())).toMatchObject({
      format: 'sportpilot-backup',
      schemaVersion: 1,
    });
  });

  it('refuse deux pesées pour la même date', () => {
    const envelope = createValidEnvelope();
    envelope.data.weights = [
      createEntity({ date: '2026-06-23', weightKg: 60 }, 'weight-1'),
      createEntity({ date: '2026-06-23', weightKg: 59.8 }, 'weight-2'),
    ];

    const result = backupEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(false);
  });

  it('refuse une entrée alimentaire dont le repas est absent', () => {
    const envelope = createValidEnvelope();
    envelope.data.foodEntries = [
      createEntity(
        {
          date: '2026-06-23',
          mealId: 'missing-meal',
          mealSlot: 'lunch',
          sourceType: 'product',
          reference: {
            sourceType: 'product',
            productId: 'product-1',
            inputMode: 'amount',
            inputQuantity: 100,
            normalizedAmount: 100,
            normalizedUnit: 'g',
            nutritionPer100Snapshot: {
              caloriesKcal: 100,
              proteinGrams: 5,
              carbohydratesGrams: 10,
              fatGrams: 2,
            },
          },
        },
        'entry-1',
      ),
    ];

    const result = backupEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(false);
  });
});

describe('migrateBackupEnvelope', () => {
  it('accepte la version 1', () => {
    expect(migrateBackupEnvelope(createValidEnvelope()).schemaVersion).toBe(1);
  });

  it('refuse une sauvegarde créée par une version future', () => {
    const envelope = createValidEnvelope();
    envelope.schemaVersion = 99;

    expect(() => migrateBackupEnvelope(envelope)).toThrow(/plus récente/);
  });

  it('refuse un fichier qui ne provient pas de SportPilot', () => {
    expect(() => migrateBackupEnvelope({ format: 'other', schemaVersion: 1 })).toThrow(
      /n’est pas une sauvegarde SportPilot/,
    );
  });
});
