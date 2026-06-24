import type Dexie from 'dexie';
import { databaseSchemaVersion, schemaVersion1 } from '@/infrastructure/database/schema';

export function registerVersion1(database: Dexie): void {
  database.version(databaseSchemaVersion).stores(schemaVersion1);
}
