import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { getBackupReminderStatus } from '@/domain/backup/backupReminder';

function settingsAt(createdAt: string) {
  return {
    ...createDefaultAppSettings(),
    createdAt,
    updatedAt: createdAt,
  };
}

describe('getBackupReminderStatus', () => {
  it('reste désactivé par défaut', () => {
    const status = getBackupReminderStatus(
      settingsAt('2026-06-01T00:00:00.000Z'),
      new Date('2026-07-01T00:00:00.000Z'),
    );

    expect(status.enabled).toBe(false);
    expect(status.due).toBe(false);
  });

  it('devient dû à partir de l’intervalle configuré', () => {
    const settings = {
      ...settingsAt('2026-06-01T00:00:00.000Z'),
      backupReminderIntervalDays: 14 as const,
      lastBackupExportedAt: '2026-06-10T12:00:00.000Z',
    };

    expect(
      getBackupReminderStatus(settings, new Date('2026-06-24T12:00:00.000Z')).due,
    ).toBe(true);
  });

  it('utilise la création des paramètres quand aucune sauvegarde n’existe', () => {
    const settings = {
      ...settingsAt('2026-06-01T00:00:00.000Z'),
      backupReminderIntervalDays: 7 as const,
    };

    const status = getBackupReminderStatus(
      settings,
      new Date('2026-06-08T00:00:00.000Z'),
    );

    expect(status.referenceDate).toBe('2026-06-01T00:00:00.000Z');
    expect(status.due).toBe(true);
  });
});
