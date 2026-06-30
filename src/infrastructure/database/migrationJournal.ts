import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { CURRENT_DATABASE_VERSION } from "@/infrastructure/database/migrations/versions";

export type MigrationJournalStatus = "succeeded";
export type MigrationJournalSource = "migration" | "initialization";

export interface MigrationJournalEntry {
  id: string;
  version: number;
  previousVersion: number | null;
  status: MigrationJournalStatus;
  source: MigrationJournalSource;
  appliedAt: string;
  description: string;
}

interface CreateMigrationJournalEntryOptions {
  version: number;
  previousVersion: number | null;
  source: MigrationJournalSource;
  description: string;
  appliedAt?: string;
}

export function createMigrationJournalEntry({
  version,
  previousVersion,
  source,
  description,
  appliedAt = new Date().toISOString(),
}: CreateMigrationJournalEntryOptions): MigrationJournalEntry {
  return {
    id: `schema-version-${version}`,
    version,
    previousVersion,
    status: "succeeded",
    source,
    appliedAt,
    description,
  };
}

export async function ensureCurrentMigrationJournalEntry(
  database: AppDatabase,
): Promise<MigrationJournalEntry> {
  const id = `schema-version-${CURRENT_DATABASE_VERSION}`;
  const existingEntry = await database.migrationJournal.get(id);

  if (existingEntry) {
    return existingEntry;
  }

  const entry = createMigrationJournalEntry({
    version: CURRENT_DATABASE_VERSION,
    previousVersion: null,
    source: "initialization",
    description: "Initialisation locale du schéma courant.",
  });

  await database.migrationJournal.put(entry);
  return entry;
}

export async function getLatestSuccessfulMigration(
  database: AppDatabase,
): Promise<MigrationJournalEntry | null> {
  return (await database.migrationJournal.orderBy("version").last()) ?? null;
}
