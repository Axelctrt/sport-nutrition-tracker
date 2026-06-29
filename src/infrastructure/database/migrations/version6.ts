import type Dexie from 'dexie';

import { createMigrationJournalEntry } from '@/infrastructure/database/migrationJournal';
import {
  DATABASE_VERSION_5,
  DATABASE_VERSION_6,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion6 } from '@/infrastructure/database/schema';

export function registerVersion6(database: Dexie): void {
  database
    .version(DATABASE_VERSION_6)
    .stores(schemaVersion6)
    .upgrade(async (transaction) => {
      await transaction.table('migrationJournal').put(
        createMigrationJournalEntry({
          version: DATABASE_VERSION_6,
          previousVersion: DATABASE_VERSION_5,
          source: 'migration',
          description:
            'Ajout des récompenses, missions et complétions de rappels dans IndexedDB.',
        }),
      );
    });
}
