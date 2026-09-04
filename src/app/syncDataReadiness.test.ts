import { BACKUP_USER_STATE_TABLE_NAMES } from '@/domain/models/backup';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import {
  allDatabaseTableNames,
  databaseInternalTableNames,
  databaseSchemaVersion,
  databaseTableNames,
} from '@/infrastructure/database/schema';

describe('préparation locale à la synchronisation multiappareil', () => {
  it('fige les versions validées à la clôture de la phase', () => {
    expect(databaseSchemaVersion).toBe(13);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(12);
  });

  it('sépare les trente-huit tables utilisateur des six tables locales', () => {
    expect(databaseTableNames).toHaveLength(38);
    expect(databaseInternalTableNames).toEqual([
      'deviceSettings',
      'migrationJournal',
      'databaseDiagnostics',
      'progressPhotos',
      'progressPhotoAssets',
      'trashItems',
    ]);
    expect(allDatabaseTableNames).toHaveLength(44);

    expect(databaseTableNames).toEqual(
      expect.arrayContaining([
        'userSettings',
        'weights',
        'dailyCheckIns',
        'dailyActivityDecisions',
        'dailyCheckOuts',
        'coachDecisionMemories',
        'goals',
        'endurancePlanningSessions',
        'routineReminderCompletions',
        'deletionRecords',
        'friendActivityPermissions',
      ]),
    );
    for (const localTable of [
      'appSettings',
      'deviceSettings',
      'migrationJournal',
      'databaseDiagnostics',
      'progressPhotos',
      'progressPhotoAssets',
      'trashItems',
    ]) {
      expect(databaseTableNames).not.toContain(localTable);
    }
  });

  it('inclut les états utilisateur synchronisables dans le backup v12', () => {
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
