import { describe, expect, it } from 'vitest';

import backupPageSource from '@/features/backup/pages/BackupPage.tsx?raw';
import goalsPageSource from '@/features/goals/pages/GoalsPage.tsx?raw';
import profilePageSource from '@/features/profile/pages/ProfilePage.tsx?raw';
import trashPageSource from '@/features/trash/pages/TrashPage.tsx?raw';
import weightPageSource from '@/features/weight/pages/WeightPage.tsx?raw';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import pendingToastSource from '@/shared/toast/pendingToast.ts?raw';
import toastProviderSource from '@/shared/toast/ToastProvider.tsx?raw';
import actionToastSource from '@/shared/toast/useActionToast.ts?raw';

describe('publication SportPilot 0.26.0 — confirmations d’action', () => {
  it('publie le correctif sans migration de données', () => {
    expect(__APP_VERSION__).toBe('0.32.0');
    expect(databaseSchemaVersion).toBe(11);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(10);
  });

  it('centralise les succès, les erreurs et les confirmations après rechargement', () => {
    expect(actionToastSource).toContain('successAfterReload');
    expect(actionToastSource).toContain('action-success:');
    expect(actionToastSource).toContain('action-error:');
    expect(actionToastSource).toContain('useContext(ToastContext)');
    expect(pendingToastSource).toContain('sportpilot:pending-toast:v1');
    expect(toastProviderSource).toContain('consumePendingToast');
  });

  it('couvre les principaux domaines d’écriture utilisateur', () => {
    for (const source of [
      goalsPageSource,
      profilePageSource,
      weightPageSource,
      backupPageSource,
      trashPageSource,
    ]) {
      expect(source).toContain('useActionToast');
      expect(source).toContain('actionToast.success');
      expect(source).toContain('actionToast.error');
    }
  });
});
