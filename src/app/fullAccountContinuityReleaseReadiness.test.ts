import { DATA_SPACE_REGISTRY_VERSION } from '@/domain/data-spaces/dataSpace';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import {
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { syncPublicDeploymentConfig } from '@/infrastructure/sync-prototype/syncPublicDeploymentConfig';

describe('publication SportPilot 0.26.0 — continuité complète du compte', () => {
  it('prépare la version candidate avec les formats courants', () => {
    expect(__APP_VERSION__).toBe('1.0.0');
    expect(databaseSchemaVersion).toBe(12);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(10);
    expect(DATA_SPACE_REGISTRY_VERSION).toBe(1);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(16);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).toBe(
      'sportpilot-sync-runtime-0.20.0-v16',
    );
  });

  it('publie les neuf domaines du centre de synchronisation', () => {
    expect(syncPublicDeploymentConfig).toMatchObject({
      VITE_ENABLE_SYNC_PROTOTYPE: 'true',
      VITE_ENABLE_REAL_WEIGHT_SYNC: 'true',
      VITE_ENABLE_REAL_ACTIVITY_SYNC: 'true',
      VITE_ENABLE_REAL_GOAL_SYNC: 'true',
      VITE_ENABLE_REAL_STRENGTH_SYNC: 'true',
      VITE_ENABLE_REAL_NUTRITION_JOURNAL_SYNC: 'true',
      VITE_ENABLE_REAL_NUTRITION_LIBRARY_SYNC: 'true',
      VITE_ENABLE_REAL_NUTRITION_TRACKING_SYNC: 'true',
      VITE_ENABLE_REAL_ACCOUNT_PREFERENCES_SYNC: 'true',
      VITE_ENABLE_REAL_REWARDS_ROUTINES_SYNC: 'true',
      VITE_ENABLE_SYNC_DIAGNOSTICS: 'false',
    });
  });

  it('conserve les agrégats cloud nécessaires à la restauration complète', () => {
    expect(SYNC_PROTOTYPE_TABLE_NAMES).toEqual(
      expect.arrayContaining([
        'realWeights',
        'realActivities',
        'realGoals',
        'realStrengthExercises',
        'realWorkoutTemplates',
        'realWorkoutSessions',
        'realNutritionJournalDays',
        'realNutritionProducts',
        'realNutritionRecipes',
        'realFavoriteMeals',
        'realNutritionTracking',
        'realAccountPreferences',
        'realRewardsRoutines',
      ]),
    );
  });
});
