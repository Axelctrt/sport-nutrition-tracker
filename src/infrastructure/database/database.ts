import { getActiveDataSpace } from '@/infrastructure/data-spaces/dataSpaceRegistry';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';

export const activeDataSpace = getActiveDataSpace();
export const appDatabase = new AppDatabase(activeDataSpace.databaseName);
