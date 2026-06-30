import { AppDatabase } from "@/infrastructure/database/AppDatabase";
import {
  checkAndPersistDatabaseIntegrity,
  getLatestDatabaseIntegrityReport,
  inspectDatabaseIntegrity,
} from "@/infrastructure/database/databaseIntegrityService";
import { initializeDatabase } from "@/infrastructure/database/databaseLifecycle";
import {
  allDatabaseTableNames,
  databaseSchemaVersion,
} from "@/infrastructure/database/schema";

function createTestDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-integrity-${crypto.randomUUID()}`);
}

describe("databaseIntegrityService", () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("vérifie toutes les tables et conserve le dernier diagnostic", async () => {
    await initializeDatabase(database);

    const report = await checkAndPersistDatabaseIntegrity(database);
    const persistedReport = await getLatestDatabaseIntegrityReport(database);

    expect(report).toMatchObject({
      status: "healthy",
      schemaVersion: databaseSchemaVersion,
      expectedSchemaVersion: databaseSchemaVersion,
      expectedTableCount: allDatabaseTableNames.length,
      accessibleTableCount: allDatabaseTableNames.length,
      issues: [],
    });
    expect(report.tableChecks).toHaveLength(allDatabaseTableNames.length);
    expect(report.tableChecks.every(({ accessible }) => accessible)).toBe(true);
    expect(persistedReport).toEqual(report);
  });

  it("signale une table attendue absente sans modifier les données existantes", async () => {
    await initializeDatabase(database);
    await database.table("userProfile").put({ id: "protected-user" });

    const report = await inspectDatabaseIntegrity(database, [
      ...allDatabaseTableNames,
      "missingIntegrityProbe",
    ]);

    expect(report.status).toBe("error");
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "missing-table",
        tableName: "missingIntegrityProbe",
      }),
    );
    expect(await database.table("userProfile").get("protected-user")).toEqual({
      id: "protected-user",
    });
  });
});
