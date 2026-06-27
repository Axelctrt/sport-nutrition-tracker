import type Dexie from 'dexie';

import { schemaVersion1 } from '@/infrastructure/database/schema';
import { DATABASE_VERSION_1 } from '@/infrastructure/database/migrations/versions';

export function registerVersion1(database: Dexie): void {
  database.version(DATABASE_VERSION_1).stores(schemaVersion1);
}
