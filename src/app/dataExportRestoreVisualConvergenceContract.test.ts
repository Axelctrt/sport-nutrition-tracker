import { describe, expect, it } from 'vitest';

import csvPanelSource from '@/features/backup/components/AdvancedCsvExportPanel.tsx?raw';
import selectiveRestoreSource from '@/features/backup/components/SelectiveBackupRestorePanel.tsx?raw';

describe('convergence visuelle Data — exports CSV', () => {
  it('réutilise les primitives partagées sans modifier les opérations CSV', () => {
    expect(csvPanelSource).toContain("import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles'");
    expect(csvPanelSource).toContain("import { Button } from '@/shared/ui/Button'");
    expect(csvPanelSource).toContain("import { Card } from '@/shared/ui/Card'");
    expect(csvPanelSource).toContain('className={`${inputClassName} flex-1`}');
    expect(csvPanelSource).toContain('className={`${checkboxClassName} mt-1 shrink-0`}');
    expect(csvPanelSource).toContain("useState<CsvPeriodPreset>('30')");
    expect(csvPanelSource).toContain('createCsvExports(');
    expect(csvPanelSource).toContain('downloadOne(file)');
    expect(csvPanelSource).toContain('downloadMany(preparedFiles)');
    expect(csvPanelSource).toContain('shareMany(preparedFiles)');
    expect(csvPanelSource).toContain("value=\"custom\"");
    expect(csvPanelSource).toContain('var(--sp-radius-control)');
    expect(csvPanelSource).toContain('var(--sp-border-subtle)');
  });
});

describe('convergence visuelle Data — restauration sélective', () => {
  it('préserve le fichier, les catégories et le safety backup avant écriture', () => {
    expect(selectiveRestoreSource).toContain('accept="application/json,.json"');
    expect(selectiveRestoreSource).toContain('MAX_BACKUP_FILE_SIZE_BYTES');
    expect(selectiveRestoreSource).toContain("createAndDownloadSafetyBackup(\n      'before-selective-restore',");
    expect(selectiveRestoreSource).toContain('const nextPrepared = await prepareRestore(');
    expect(selectiveRestoreSource).toContain('await createSafetyBackup();');
    expect(selectiveRestoreSource).toContain('const result = await applyRestore(');
    expect(selectiveRestoreSource.indexOf('await createSafetyBackup();')).toBeLessThan(
      selectiveRestoreSource.indexOf('const result = await applyRestore('),
    );
    expect(selectiveRestoreSource).toContain("selected.includes('profileSettings')");
    expect(selectiveRestoreSource).toContain('await refreshProfile();');
  });

  it('réutilise les primitives partagées et conserve la confirmation', () => {
    expect(selectiveRestoreSource).toContain("import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles'");
    expect(selectiveRestoreSource).toContain('className={`${inputClassName} mt-2');
    expect(selectiveRestoreSource).toContain('className={`${checkboxClassName} mt-1`}');
    expect(selectiveRestoreSource).toContain('<ConfirmationDialog');
    expect(selectiveRestoreSource).toContain('title="Remplacer les domaines sélectionnés ?"');
    expect(selectiveRestoreSource).toContain('confirmLabel="Sauvegarder et restaurer"');
    expect(selectiveRestoreSource).toContain('tone="danger"');
    expect(selectiveRestoreSource).toContain('isPending={isRestoring}');
    expect(selectiveRestoreSource).toContain('onConfirm={() => void confirmRestore()}');
    expect(selectiveRestoreSource).toContain('var(--sp-radius-control)');
    expect(selectiveRestoreSource).toContain('var(--sp-surface-muted)');
  });
});
