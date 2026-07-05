import type Dexie from 'dexie';

import { createMigrationJournalEntry } from '@/infrastructure/database/migrationJournal';
import {
  DATABASE_VERSION_8,
  DATABASE_VERSION_9,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion9 } from '@/infrastructure/database/schema';

export function registerVersion9(database: Dexie): void {
  database
    .version(DATABASE_VERSION_9)
    .stores(schemaVersion9)
    .upgrade(async (transaction) => {
      await transaction.table('migrationJournal').put(
        createMigrationJournalEntry({
          version: DATABASE_VERSION_9,
          previousVersion: DATABASE_VERSION_8,
          source: 'migration',
          description:
            'Ajout des amis, demandes et préférences de confidentialité dans IndexedDB.',
        }),
      );
    });
}
