import type Dexie from 'dexie';

import { schemaVersion2 } from '@/infrastructure/database/schema';
import { DATABASE_VERSION_2 } from '@/infrastructure/database/migrations/versions';

export function registerVersion2(database: Dexie): void {
  database.version(DATABASE_VERSION_2).stores(schemaVersion2);
}
