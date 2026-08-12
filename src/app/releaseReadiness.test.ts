import { mobileMoreNavigation } from '@/app/navigation';
import {
  barcodeScannerPath,
  photoNutritionEstimatePath,
  routePaths,
  selectFoodPath,
} from '@/app/routePaths';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import {
  databaseSchemaVersion,
  databaseTableNames,
} from '@/infrastructure/database/schema';

describe('préparation de la release candidate 1.0.0-rc.2', () => {
  it('expose la version candidate dans le build', () => {
    expect(__APP_VERSION__).toBe('1.0.0-rc.2');
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });

  it('conserve les versions de schéma attendues', () => {
    expect(databaseSchemaVersion).toBe(12);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(10);
    expect(databaseTableNames).toEqual(
      expect.arrayContaining([
        'userProfile',
        'userSettings',
        'weights',
        'foodEntries',
        'workoutSessions',
        'deletionRecords',
        'friendProfiles',
        'friendRequests',
        'friendsPrivacySettings',
        'friendActivityPermissions',
      ]),
    );
  });

  it('regroupe les écrans secondaires sans dupliquer les hubs métier', () => {
    const mobilePaths = mobileMoreNavigation.flatMap((section) =>
      section.items.map((item) => item.path),
    );

    expect(mobilePaths).toEqual(
      expect.arrayContaining([
        routePaths.profile,
        routePaths.accountDevices,
        routePaths.dashboardCustomization,
        routePaths.settingsNotificationsRoutines,
        routePaths.settingsAccountSync,
        routePaths.backup,
        routePaths.trash,
        routePaths.settingsAdvanced,
        routePaths.calculationsInformation,
        routePaths.privacy,
        routePaths.settingsAbout,
      ]),
    );
    expect(mobilePaths).not.toEqual(expect.arrayContaining([
      routePaths.workoutSessions,
      routePaths.weeklyPlanning,
      routePaths.history,
      routePaths.weeklyReview,
    ]));
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
    expect(photoNutritionEstimatePath('2026-07-04', 'lunch')).toBe(
      '/food/photo-estimate?date=2026-07-04&slot=lunch',
    );
  });
});
