import { mobileMoreNavigation } from '@/app/navigation';
import {
  barcodeScannerPath,
  routePaths,
  selectFoodPath,
} from '@/app/routePaths';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import {
  databaseSchemaVersion,
  databaseTableNames,
} from '@/infrastructure/database/schema';

describe('préparation de la version stable 0.17.1', () => {
  it('expose la version stable dans le build', () => {
    expect(__APP_VERSION__).toBe('0.17.1');
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('conserve les versions de schéma attendues', () => {
    expect(databaseSchemaVersion).toBe(8);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(7);
    expect(databaseTableNames).toEqual(
      expect.arrayContaining([
        'userProfile',
        'userSettings',
        'weights',
        'foodEntries',
        'workoutSessions',
        'deletionRecords',
      ]),
    );
  });

  it('rend les écrans secondaires accessibles depuis le menu mobile', () => {
    const mobilePaths = mobileMoreNavigation.flatMap((section) =>
      section.items.map((item) => item.path),
    );

    expect(mobilePaths).toEqual(
      expect.arrayContaining([
        routePaths.workoutSessions,
        routePaths.weeklyPlanning,
        routePaths.strengthExercises,
        routePaths.history,
        routePaths.weeklyReview,
          routePaths.reminders,
          routePaths.backup,
        routePaths.trash,
        routePaths.calculationsInformation,
      ]),
    );
  });

  it('conserve les parcours de recherche et d’ajout alimentaire', () => {
    expect(routePaths.foodProducts).toBe('/food/products');
    expect(routePaths.barcodeScanner).toBe('/food/barcode-scanner');
    expect(selectFoodPath('2026-06-26', 'lunch')).toBe(
      '/food/select?date=2026-06-26&slot=lunch',
    );
    expect(barcodeScannerPath('2026-06-26', 'lunch')).toBe(
      '/food/barcode-scanner?date=2026-06-26&slot=lunch',
    );
  });
});
