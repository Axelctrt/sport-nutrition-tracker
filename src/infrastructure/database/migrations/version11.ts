import type Dexie from 'dexie';

import { createMigrationJournalEntry } from '@/infrastructure/database/migrationJournal';
import {
  DATABASE_VERSION_10,
  DATABASE_VERSION_11,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion11 } from '@/infrastructure/database/schema';

export function registerVersion11(database: Dexie): void {
  database
    .version(DATABASE_VERSION_11)
    .stores(schemaVersion11)
    .upgrade(async (transaction) => {
      await transaction.table('migrationJournal').put(
        createMigrationJournalEntry({
          version: DATABASE_VERSION_11,
          previousVersion: DATABASE_VERSION_10,
          source: 'migration',
          description:
            'Ajout du check-in, de la decision d activite et du check-out quotidiens.',
        }),
      );
    });
}
