import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

describe('feedback Données et Paramètres', () => {
  it.each([
    'src/features/trash/pages/TrashPage.tsx',
    'src/features/settings/pages/AdvancedSettingsPage.tsx',
    'src/features/settings/pages/SettingsCategoryPage.tsx',
    'src/features/progress-reports/pages/ProgressReportsPage.tsx',
  ])('garde un seul feedback local sur %s', (path) => {
    const content = source(path);

    expect(content).not.toContain('useActionToast');
    expect(content).not.toContain('actionToast.');
  });

  it('réserve les toasts Sauvegarde aux réussites qui quittent la page', () => {
    const content = source('src/features/backup/pages/BackupPage.tsx');

    expect(content).toContain("key: 'backup-import'");
    expect(content).toContain("key: 'full-data-reset'");
    expect(content).not.toContain('actionToast.error');
    expect(content).not.toContain("key: 'backup-export'");
    expect(content).not.toContain("key: 'backup-share'");
    expect(content).not.toContain("key: 'backup-reminder'");
    expect(content).not.toContain("key: 'diagnostic-export'");
  });

  it('réserve Compte et appareils au succès différé après rechargement', () => {
    const content = source(
      'src/features/account-devices/pages/AccountDevicesPage.tsx',
    );

    expect(content).toContain('actionToast.successAfterReload');
    expect(content).not.toContain('actionToast.error');
    expect(content.match(/actionToast\./g)).toHaveLength(1);
  });
});
