import { describe, expect, it } from 'vitest';

import backupPageSource from '@/features/backup/pages/BackupPage.tsx?raw';

describe('convergence visuelle Data — BackupPage', () => {
  it('réutilise les primitives et tokens partagés', () => {
    expect(backupPageSource).toContain("import { inputClassName } from '@/shared/forms/formStyles'");
    expect(backupPageSource).toContain("import { Button } from '@/shared/ui/Button'");
    expect(backupPageSource).toContain("import { Card } from '@/shared/ui/Card'");
    expect(backupPageSource).toContain("import { InlineNotice } from '@/shared/ui/InlineNotice'");
    expect(backupPageSource).toContain('className={`${inputClassName} mt-2 sm:max-w-xs`}');
    expect(backupPageSource).toContain('className={`${inputClassName} mt-2 p-3');
    expect(backupPageSource).toContain('var(--sp-accent-primary)');
    expect(backupPageSource).toContain('var(--sp-text-primary)');
    expect(backupPageSource).toContain('var(--sp-border-subtle)');
    expect(backupPageSource).toContain('var(--sp-radius-control)');
  });

  it('préserve les contrats export, partage, rappel et diagnostic', () => {
    expect(backupPageSource).toContain('const prepared = await prepareBackupExport();');
    expect(backupPageSource).toContain("downloadFile(prepared.content, prepared.fileName, 'application/json');");
    expect(backupPageSource).toContain('await recordSuccessfulBackupExport(prepared)');
    expect(backupPageSource).toContain('const result = await shareBackupFile(');
    expect(backupPageSource).toContain('await updateBackupReminderInterval(intervalDays)');
    expect(backupPageSource).toContain('const diagnostic = await createTechnicalDiagnostic();');
    expect(backupPageSource).toContain('serializeTechnicalDiagnostic(diagnostic)');
  });

  it('préserve le contrôle du fichier et le safety backup avant import', () => {
    expect(backupPageSource).toContain('accept="application/json,.json"');
    expect(backupPageSource).toContain('MAX_BACKUP_FILE_SIZE_BYTES');
    expect(backupPageSource).toContain('const prepared = prepareBackupImport(await file.text());');
    expect(backupPageSource).toContain("await createAndDownloadSafetyBackup('before-import');");
    expect(backupPageSource).toContain('await applyPreparedBackupImport(pendingImport);');
    expect(backupPageSource.indexOf("await createAndDownloadSafetyBackup('before-import');")).toBeLessThan(
      backupPageSource.indexOf('await applyPreparedBackupImport(pendingImport);'),
    );
    expect(backupPageSource).toContain('await refreshProfile();');
    expect(backupPageSource).toContain('navigate(hasProfile ? routePaths.dashboard : routePaths.onboarding, { replace: true });');
    expect(backupPageSource).toContain('title="Remplacer toutes les données ?"');
    expect(backupPageSource).toContain('confirmLabel="Importer et remplacer"');
  });

  it('préserve le safety backup avant reset complet', () => {
    expect(backupPageSource).toContain("await createAndDownloadSafetyBackup('before-full-reset');");
    expect(backupPageSource).toContain('await clearAllUserData();');
    expect(backupPageSource.indexOf("await createAndDownloadSafetyBackup('before-full-reset');")).toBeLessThan(
      backupPageSource.indexOf('await clearAllUserData();'),
    );
    expect(backupPageSource).toContain('activeDataSpace.kind === \'account\'');
    expect(backupPageSource).toContain('<BackupDeleteDialog');
  });
});
