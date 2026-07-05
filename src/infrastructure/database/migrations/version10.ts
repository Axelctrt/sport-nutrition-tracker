import type Dexie from 'dexie';

import { createMigrationJournalEntry } from '@/infrastructure/database/migrationJournal';
import {
  DATABASE_VERSION_9,
  DATABASE_VERSION_10,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion10 } from '@/infrastructure/database/schema';

export function registerVersion10(database: Dexie): void {
  database
    .version(DATABASE_VERSION_10)
    .stores(schemaVersion10)
    .upgrade(async (transaction) => {
      await transaction.table('migrationJournal').put(
        createMigrationJournalEntry({
          version: DATABASE_VERSION_10,
          previousVersion: DATABASE_VERSION_9,
          source: 'migration',
          description:
            'Ajout des permissions de partage d’activité par ami dans IndexedDB.',
        }),
      );
    });
}
