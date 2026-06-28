import type Dexie from 'dexie';

import { createMigrationJournalEntry } from '@/infrastructure/database/migrationJournal';
import {
  DATABASE_VERSION_3,
  DATABASE_VERSION_4,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion4 } from '@/infrastructure/database/schema';

export function registerVersion4(database: Dexie): void {
  database
    .version(DATABASE_VERSION_4)
    .stores(schemaVersion4)
    .upgrade(async (transaction) => {
      await transaction.table('migrationJournal').put(
        createMigrationJournalEntry({
          version: DATABASE_VERSION_4,
          previousVersion: DATABASE_VERSION_3,
          source: 'migration',
          description:
            'Ajout de la corbeille locale avec restauration des activités et des pesées.',
        }),
      );
    });
}
