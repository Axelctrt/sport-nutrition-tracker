import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { appDatabase } from "@/infrastructure/database/database";
import { trackDatabaseWrite } from "@/infrastructure/database/databaseWriteBarrier";
import type {
  DatabaseIntegrityIssue,
  DatabaseIntegrityReport,
  DatabaseIntegrityStatus,
  DatabaseTableIntegrityCheck,
} from "@/infrastructure/database/databaseIntegrityModels";
import {
  getLatestSuccessfulMigration,
  type MigrationJournalEntry,
} from "@/infrastructure/database/migrationJournal";
import {
  allDatabaseTableNames,
  databaseSchemaVersion,
} from "@/infrastructure/database/schema";

const LATEST_DIAGNOSTIC_ID = "latest" as const;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur IndexedDB inconnue.";
}

function resolveStatus(
  issues: readonly DatabaseIntegrityIssue[],
): DatabaseIntegrityStatus {
  if (issues.some(({ severity }) => severity === "error")) {
    return "error";
  }

  return issues.length > 0 ? "warning" : "healthy";
}

export async function inspectDatabaseIntegrity(
  database: AppDatabase = appDatabase,
  expectedTableNames: readonly string[] = allDatabaseTableNames,
): Promise<DatabaseIntegrityReport> {
  if (!database.isOpen()) {
    await database.open();
  }

  const issues: DatabaseIntegrityIssue[] = [];
  const actualTableNames = database.tables.map(({ name }) => name);
  const actualTableNameSet = new Set(actualTableNames);
  const expectedTableNameSet = new Set(expectedTableNames);
  const tableChecks: DatabaseTableIntegrityCheck[] = [];

  for (const tableName of expectedTableNames) {
    if (!actualTableNameSet.has(tableName)) {
      tableChecks.push({
        tableName,
        accessible: false,
        recordCount: null,
        errorMessage: "Table absente du schéma installé.",
      });
      issues.push({
        code: "missing-table",
        severity: "error",
        message: `La table ${tableName} est absente du schéma installé.`,
        tableName,
      });
      continue;
    }

    try {
      const recordCount = await database.table(tableName).count();
      tableChecks.push({
        tableName,
        accessible: true,
        recordCount,
        errorMessage: null,
      });
    } catch (error) {
      const errorMessage = describeError(error);
      tableChecks.push({
        tableName,
        accessible: false,
        recordCount: null,
        errorMessage,
      });
      issues.push({
        code: "table-read-failed",
        severity: "error",
        message: `La table ${tableName} n’a pas pu être lue : ${errorMessage}`,
        tableName,
      });
    }
  }

  for (const tableName of actualTableNames) {
    if (!expectedTableNameSet.has(tableName)) {
      issues.push({
        code: "unexpected-table",
        severity: "warning",
        message: `La table inattendue ${tableName} est présente dans la base locale.`,
        tableName,
      });
    }
  }

  if (database.verno !== databaseSchemaVersion) {
    issues.push({
      code: "schema-version-mismatch",
      severity: "error",
      message: `La base utilise le schéma v${database.verno}, alors que l’application attend la v${databaseSchemaVersion}.`,
      tableName: null,
    });
  }

  let latestMigration: MigrationJournalEntry | null = null;
  if (actualTableNameSet.has("migrationJournal")) {
    try {
      latestMigration = await getLatestSuccessfulMigration(database);
    } catch (error) {
      issues.push({
        code: "migration-journal-read-failed",
        severity: "error",
        message: `Le journal des migrations n’a pas pu être lu : ${describeError(error)}`,
        tableName: "migrationJournal",
      });
    }
  }

  if (!latestMigration) {
    issues.push({
      code: "missing-current-migration-entry",
      severity: "warning",
      message:
        "Aucune migration réussie n’est journalisée pour le schéma courant.",
      tableName: "migrationJournal",
    });
  } else if (latestMigration.version !== databaseSchemaVersion) {
    issues.push({
      code: "stale-migration-journal",
      severity: "warning",
      message: `La dernière migration journalisée est la v${latestMigration.version}, au lieu de la v${databaseSchemaVersion}.`,
      tableName: "migrationJournal",
    });
  }

  const accessibleChecks = tableChecks.filter(({ accessible }) => accessible);
  const totalRecordCount = accessibleChecks.reduce(
    (total, { recordCount }) => total + (recordCount ?? 0),
    0,
  );

  return {
    id: LATEST_DIAGNOSTIC_ID,
    checkedAt: new Date().toISOString(),
    databaseName: database.name,
    schemaVersion: database.verno,
    expectedSchemaVersion: databaseSchemaVersion,
    expectedTableCount: expectedTableNames.length,
    accessibleTableCount: accessibleChecks.length,
    totalRecordCount,
    status: resolveStatus(issues),
    tableChecks,
    latestMigration,
    issues,
  };
}

export async function checkAndPersistDatabaseIntegrity(
  database: AppDatabase = appDatabase,
  expectedTableNames: readonly string[] = allDatabaseTableNames,
): Promise<DatabaseIntegrityReport> {
  const report = await inspectDatabaseIntegrity(database, expectedTableNames);

  try {
    await trackDatabaseWrite(() => database.databaseDiagnostics.put(report));
    return report;
  } catch (error) {
    const persistenceIssue: DatabaseIntegrityIssue = {
      code: "diagnostic-write-failed",
      severity: "error",
      message: `Le diagnostic n’a pas pu être enregistré : ${describeError(error)}`,
      tableName: "databaseDiagnostics",
    };

    return {
      ...report,
      status: "error",
      issues: [...report.issues, persistenceIssue],
    };
  }
}

export async function getLatestDatabaseIntegrityReport(
  database: AppDatabase = appDatabase,
): Promise<DatabaseIntegrityReport | null> {
  if (!database.isOpen()) {
    await database.open();
  }

  return (await database.databaseDiagnostics.get(LATEST_DIAGNOSTIC_ID)) ?? null;
}
