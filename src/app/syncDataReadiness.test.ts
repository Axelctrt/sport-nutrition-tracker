import { BACKUP_USER_STATE_TABLE_NAMES } from '@/domain/models/backup';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import {
  allDatabaseTableNames,
  databaseInternalTableNames,
  databaseSchemaVersion,
  databaseTableNames,
} from '@/infrastructure/database/schema';

describe('préparation locale à la synchronisation multiappareil', () => {
  it('fige les versions validées à la clôture de la phase B', () => {
    expect(databaseSchemaVersion).toBe(8);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(7);
  });

  it('sépare les trente tables utilisateur des quatre tables locales', () => {
    expect(databaseTableNames).toHaveLength(30);
    expect(databaseInternalTableNames).toEqual([
      'deviceSettings',
      'migrationJournal',
      'databaseDiagnostics',
      'trashItems',
    ]);
    expect(allDatabaseTableNames).toHaveLength(34);

    expect(databaseTableNames).toEqual(
      expect.arrayContaining([
        'userSettings',
        'weights',
        'goals',
        'endurancePlanningSessions',
        'routineReminderCompletions',
        'deletionRecords',
      ]),
    );
    for (const localTable of [
      'appSettings',
      'deviceSettings',
      'migrationJournal',
      'databaseDiagnostics',
      'trashItems',
    ]) {
      expect(databaseTableNames).not.toContain(localTable);
    }
  });

  it('inclut les états utilisateur synchronisables dans le backup v7', () => {
    expect(BACKUP_USER_STATE_TABLE_NAMES).toEqual([
      'goals',
      'endurancePlanningSessions',
      'earnedAchievements',
      'unlockedVisualThemes',
      'visualThemePreferences',
      'weeklyMissionCompletions',
      'routineReminderCompletions',
      'deletionRecords',
    ]);
  });
});
