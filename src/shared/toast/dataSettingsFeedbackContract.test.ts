import { describe, expect, it } from 'vitest';

import accountDevicesSource from '@/features/account-devices/pages/AccountDevicesPage.tsx?raw';
import backupSource from '@/features/backup/pages/BackupPage.tsx?raw';
import progressReportsSource from '@/features/progress-reports/pages/ProgressReportsPage.tsx?raw';
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
});
