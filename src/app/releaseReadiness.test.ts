import { barcodeScannerPath, routePaths, selectFoodPath } from '@/app/routePaths';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion, databaseTableNames } from '@/infrastructure/database/schema';

describe('préparation de la version 0.15.0-alpha.11', () => {
  it('expose la préversion UX dans le build', () => {
    expect(__APP_VERSION__).toBe('0.15.0-alpha.11');
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });

  it('conserve les versions de schéma attendues', () => {
    expect(databaseSchemaVersion).toBe(2);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(2);
    expect(databaseTableNames).toEqual(expect.arrayContaining([
      'userProfile',
      'appSettings',
      'weights',
      'foodEntries',
      'workoutSessions',
    ]));
  });

  it('conserve les parcours de recherche et d’ajout alimentaire', () => {
    expect(routePaths.foodProducts).toBe('/food/products');
    expect(routePaths.barcodeScanner).toBe('/food/barcode-scanner');
    expect(selectFoodPath('2026-06-26', 'lunch')).toBe('/food/select?date=2026-06-26&slot=lunch');
    expect(barcodeScannerPath('2026-06-26', 'lunch')).toBe('/food/barcode-scanner?date=2026-06-26&slot=lunch');
  });
});
