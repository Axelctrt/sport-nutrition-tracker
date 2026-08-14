import { describe, expect, it } from 'vitest';

import accountDevicesSource from '@/features/account-devices/pages/AccountDevicesPage.tsx?raw';
import cloudAccountRestoreSource from '@/features/account-devices/components/CloudAccountRestorePanel.tsx?raw';
import guestDataImportSource from '@/features/account-devices/components/GuestDataImportPanel.tsx?raw';
import advancedCsvExportSource from '@/features/backup/components/AdvancedCsvExportPanel.tsx?raw';
import selectiveBackupRestoreSource from '@/features/backup/components/SelectiveBackupRestorePanel.tsx?raw';
import backupSource from '@/features/backup/pages/BackupPage.tsx?raw';
import progressReportsSource from '@/features/progress-reports/pages/ProgressReportsPage.tsx?raw';
import automaticSyncSettingsSource from '@/features/settings/components/AutomaticSyncSettingsPanel.tsx?raw';
import selectiveDataResetSource from '@/features/settings/components/SelectiveDataResetPanel.tsx?raw';
import advancedSettingsSource from '@/features/settings/pages/AdvancedSettingsPage.tsx?raw';
import settingsCategorySource from '@/features/settings/pages/SettingsCategoryPage.tsx?raw';
import trashSource from '@/features/trash/pages/TrashPage.tsx?raw';

describe('feedback Données et Paramètres', () => {
  it.each([
    ['Paramètres avancés', advancedSettingsSource, 'InlineNotice'],
    ['catégories Paramètres', settingsCategorySource, 'InlineNotice'],
    ['Rapports', progressReportsSource, 'role="status"'],
    ['Corbeille', trashSource, 'aria-live="polite"'],
  ])('garde un seul feedback local sur %s', (_label, content, localMarker) => {
    expect(content).not.toContain('useActionToast');
    expect(content).not.toContain('actionToast.');
    expect(content).toContain('setFeedback');
    expect(content).toContain(localMarker);
  });

  it('réserve les toasts Sauvegarde aux réussites qui quittent la page', () => {
    expect(backupSource).toContain("key: 'backup-import'");
    expect(backupSource).toContain("key: 'full-data-reset'");
    expect(backupSource).not.toContain('actionToast.error');
    expect(backupSource).not.toContain("key: 'backup-export'");
    expect(backupSource).not.toContain("key: 'backup-share'");
    expect(backupSource).not.toContain("key: 'backup-reminder'");
    expect(backupSource).not.toContain("key: 'diagnostic-export'");
    expect(backupSource).toContain('setFeedback');
    expect(backupSource).toContain('InlineNotice');
  });

  it('réserve Compte et appareils au succès différé après rechargement', () => {
    expect(accountDevicesSource).toContain('actionToast.successAfterReload');
    expect(accountDevicesSource).not.toContain('actionToast.error');
    expect(accountDevicesSource.match(/actionToast\./g)).toHaveLength(1);
    expect(accountDevicesSource).toContain('setFeedback');
    expect(accountDevicesSource).toContain('InlineNotice');
  });

  it.each([
    ['export CSV avancé', advancedCsvExportSource],
    ['restauration sélective', selectiveBackupRestoreSource],
    ['réinitialisation sélective', selectiveDataResetSource],
  ])('garde un feedback local unique pour %s', (_label, content) => {
    expect(content).not.toContain('useActionToast');
    expect(content).not.toContain('actionToast.');
    expect(content).toContain('InlineNotice');
  });

  it.each([
    ['restauration cloud', cloudAccountRestoreSource],
    ['import invité', guestDataImportSource],
  ])('réserve le toast de %s au succès différé après rechargement', (_label, content) => {
    expect(content).toContain('actionToast.successAfterReload');
    expect(content).not.toContain('actionToast.error');
    expect(content.match(/actionToast\./g)).toHaveLength(1);
    expect(content).toContain('InlineNotice');
  });

  it('garde le toast de synchronisation automatique pour le succès sans feedback local', () => {
    expect(automaticSyncSettingsSource).toContain('actionToast.success');
    expect(automaticSyncSettingsSource).not.toContain('actionToast.error');
    expect(automaticSyncSettingsSource.match(/actionToast\./g)).toHaveLength(1);
    expect(automaticSyncSettingsSource).toContain('setErrorMessage');
    expect(automaticSyncSettingsSource).toContain('InlineNotice');
  });
});
