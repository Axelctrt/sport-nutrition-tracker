import type Dexie from 'dexie';
import { databaseSchemaVersion, schemaVersion2 } from '@/infrastructure/database/schema';

export function registerVersion2(database: Dexie): void {
  database.version(databaseSchemaVersion).stores(schemaVersion2);
}
