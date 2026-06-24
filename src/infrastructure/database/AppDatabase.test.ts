import { APP_SETTINGS_ID } from '@/domain/defaults/identifiers';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { databaseTableNames } from '@/infrastructure/database/schema';

function createTestDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-test-${crypto.randomUUID()}`);
}

describe('AppDatabase', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('déclare toutes les tables du schéma version 1', async () => {
    await database.open();

    const actualTableNames = database.tables.map((table) => table.name).sort();
    const expectedTableNames = [...databaseTableNames].sort();

    expect(actualTableNames).toEqual(expectedTableNames);
  });

  it('crée les paramètres par défaut une seule fois', async () => {
    const firstInitialization = await initializeDatabase(database);
    const secondInitialization = await initializeDatabase(database);
    const storedSettings = await database.appSettings.get(APP_SETTINGS_ID);

    expect(firstInitialization.createdDefaultSettings).toBe(true);
    expect(secondInitialization.createdDefaultSettings).toBe(false);
    expect(storedSettings).toMatchObject({
      id: APP_SETTINGS_ID,
      includedBaseSteps: 3_000,
      walkingKcalPerKgPerKm: 0.5,
      runningKcalPerKgPerKm: 1,
    });
    expect(await database.appSettings.count()).toBe(1);
  });
});
