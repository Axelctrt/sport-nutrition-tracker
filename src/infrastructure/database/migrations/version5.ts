import type Dexie from 'dexie';

import { createMigrationJournalEntry } from '@/infrastructure/database/migrationJournal';
import {
  DATABASE_VERSION_4,
  DATABASE_VERSION_5,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion5 } from '@/infrastructure/database/schema';

export function registerVersion5(database: Dexie): void {
  database
    .version(DATABASE_VERSION_5)
    .stores(schemaVersion5)
    .upgrade(async (transaction) => {
      await transaction.table('migrationJournal').put(
        createMigrationJournalEntry({
          version: DATABASE_VERSION_5,
          previousVersion: DATABASE_VERSION_4,
          source: 'migration',
          description:
            'Ajout des objectifs et du planning d’endurance dans IndexedDB.',
        }),
      );
    });
}
