import type Dexie from "dexie";

import { createMigrationJournalEntry } from "@/infrastructure/database/migrationJournal";
import { schemaVersion3 } from "@/infrastructure/database/schema";
import {
  DATABASE_VERSION_2,
  DATABASE_VERSION_3,
} from "@/infrastructure/database/migrations/versions";

export function registerVersion3(database: Dexie): void {
  database
    .version(DATABASE_VERSION_3)
    .stores(schemaVersion3)
    .upgrade(async (transaction) => {
      await transaction.table("migrationJournal").put(
        createMigrationJournalEntry({
          version: DATABASE_VERSION_3,
          previousVersion: DATABASE_VERSION_2,
          source: "migration",
          description:
            "Ajout du journal de migrations et des diagnostics d’intégrité.",
        }),
      );
    });
}
