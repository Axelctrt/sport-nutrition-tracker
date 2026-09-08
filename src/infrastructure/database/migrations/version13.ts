import type Dexie from 'dexie';

import { createMigrationJournalEntry } from '@/infrastructure/database/migrationJournal';
import {
  DATABASE_VERSION_12,
  DATABASE_VERSION_13,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion13 } from '@/infrastructure/database/schema';

export function registerVersion13(database: Dexie): void {
  database
    .version(DATABASE_VERSION_13)
    .stores(schemaVersion13)
    .upgrade(async (transaction) => {
      await transaction.table('migrationJournal').put(
        createMigrationJournalEntry({
          version: DATABASE_VERSION_13,
          previousVersion: DATABASE_VERSION_12,
          source: 'migration',
          description:
            'Ajout de la mémoire locale des décisions Coach stabilisées.',
        }),
      );
    });
}
