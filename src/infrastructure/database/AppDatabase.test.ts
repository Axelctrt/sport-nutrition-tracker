import { DEVICE_SETTINGS_ID, USER_SETTINGS_ID } from "@/domain/defaults/identifiers";
import { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { initializeDatabase } from "@/infrastructure/database/databaseLifecycle";
import { allDatabaseTableNames } from "@/infrastructure/database/schema";

function createTestDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-test-${crypto.randomUUID()}`);
}

describe("AppDatabase", () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("déclare toutes les tables du schéma version 7", async () => {
    await database.open();

    const actualTableNames = database.tables.map((table) => table.name).sort();
    const expectedTableNames = [...allDatabaseTableNames].sort();

    expect(actualTableNames).toEqual(expectedTableNames);
  });

  it("crée les paramètres par défaut une seule fois", async () => {
    const firstInitialization = await initializeDatabase(database);
    const secondInitialization = await initializeDatabase(database);
    const storedUserSettings = await database.userSettings.get(USER_SETTINGS_ID);
    const storedDeviceSettings = await database.deviceSettings.get(DEVICE_SETTINGS_ID);

    expect(firstInitialization.createdDefaultSettings).toBe(true);
    expect(secondInitialization.createdDefaultSettings).toBe(false);
    expect(storedUserSettings).toMatchObject({
      id: USER_SETTINGS_ID,
      includedBaseSteps: 3_000,
      walkingKcalPerKgPerKm: 0.5,
      runningKcalPerKgPerKm: 1,
    });
    expect(await database.userSettings.count()).toBe(1);
    expect(storedDeviceSettings).toMatchObject({ id: DEVICE_SETTINGS_ID });
    expect(await database.deviceSettings.count()).toBe(1);
    expect(await database.migrationJournal.count()).toBe(1);
  });
});
