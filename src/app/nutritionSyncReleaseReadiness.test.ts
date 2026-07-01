import {
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { syncPublicDeploymentConfig } from '@/infrastructure/sync-prototype/syncPublicDeploymentConfig';

describe('préparation de la synchronisation nutritionnelle 0.20.0', () => {
  it('publie la version finale sans modifier les versions métier', () => {
    expect(__APP_VERSION__).toBe('0.20.0');
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(8);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).toBe(
      'sportpilot-sync-runtime-0.20.0-v8',
    );
  });

  it('déclare tous les agrégats nutritionnels du runtime cloud', () => {
    expect(SYNC_PROTOTYPE_TABLE_NAMES).toEqual(
      expect.arrayContaining([
        'realNutritionJournalDays',
        'realNutritionJournalDeletionRecords',
        'realNutritionProducts',
        'realNutritionRecipes',
        'realFavoriteMeals',
        'realNutritionLibraryDeletionRecords',
        'realNutritionTracking',
      ]),
    );
  });

  it('active les domaines validés dans le build public', () => {
    expect(syncPublicDeploymentConfig).toMatchObject({
      VITE_ENABLE_SYNC_PROTOTYPE: 'true',
      VITE_ENABLE_REAL_WEIGHT_SYNC: 'true',
      VITE_ENABLE_REAL_ACTIVITY_SYNC: 'true',
      VITE_ENABLE_REAL_GOAL_SYNC: 'true',
      VITE_ENABLE_REAL_STRENGTH_SYNC: 'true',
      VITE_ENABLE_REAL_NUTRITION_JOURNAL_SYNC: 'true',
      VITE_ENABLE_REAL_NUTRITION_LIBRARY_SYNC: 'true',
      VITE_ENABLE_REAL_NUTRITION_TRACKING_SYNC: 'true',
      VITE_ENABLE_SYNC_DIAGNOSTICS: 'false',
    });
  });
});
