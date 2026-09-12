import type Dexie from 'dexie';
import { LOCAL_USER_PROFILE_ID } from '@/domain/defaults/identifiers';
import { createLegacyCoachStrategyState } from '@/domain/coach/coachStrategyState';
import { createMigrationJournalEntry } from '@/infrastructure/database/migrationJournal';
import { DATABASE_VERSION_13, DATABASE_VERSION_14 } from '@/infrastructure/database/migrations/versions';
import { schemaVersion14 } from '@/infrastructure/database/schema';

export function registerVersion14(database: Dexie): void {
  database.version(DATABASE_VERSION_14).stores(schemaVersion14).upgrade(async (transaction) => {
    const profile = await transaction.table('userProfile').get(LOCAL_USER_PROFILE_ID);
    const state = createLegacyCoachStrategyState(profile?.goal, 'migration');
    if (state) await transaction.table('coachStrategyStates').add(state);
    await transaction.table('migrationJournal').put(createMigrationJournalEntry({
      version: DATABASE_VERSION_14, previousVersion: DATABASE_VERSION_13, source: 'migration',
      description: 'État Strategy local, continuité legacy sans acceptation ni date d’activation inventée.',
    }));
  });
}
