import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';

export async function resetAppDatabaseForTest(): Promise<void> {
  appDatabase.close();
  await appDatabase.delete();
  await initializeDatabase();
}

export async function deleteAppDatabaseAfterTest(): Promise<void> {
  appDatabase.close();
  await appDatabase.delete();
}
