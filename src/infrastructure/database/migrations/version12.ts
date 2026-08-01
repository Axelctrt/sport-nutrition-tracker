import type Dexie from 'dexie';

import { createMigrationJournalEntry } from '@/infrastructure/database/migrationJournal';
import {
  DATABASE_VERSION_11,
  DATABASE_VERSION_12,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion12 } from '@/infrastructure/database/schema';

export function registerVersion12(database: Dexie): void {
  database
    .version(DATABASE_VERSION_12)
    .stores(schemaVersion12)
    .upgrade(async (transaction) => {
      await transaction.table('migrationJournal').put(
        createMigrationJournalEntry({
          version: DATABASE_VERSION_12,
          previousVersion: DATABASE_VERSION_11,
          source: 'migration',
          description:
            'Ajout du stockage local des photos de progression et de leurs miniatures.',
        }),
      );
    });
}
