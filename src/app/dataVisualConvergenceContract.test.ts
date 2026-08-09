import { describe, expect, it } from 'vitest';

import backupOverviewSource from '@/features/backup/components/BackupOverview.tsx?raw';
import backupDeleteDialogSource from '@/features/backup/components/BackupDeleteDialog.tsx?raw';
import storagePersistenceSource from '@/features/backup/components/StoragePersistenceCard.tsx?raw';

describe('convergence visuelle Data — synthèse et persistance', () => {
  it('conserve les quatre métriques et utilise les surfaces sémantiques', () => {
    expect(backupOverviewSource).toContain("{ label: 'Stockage', value: 'Local'");
    expect(backupOverviewSource).toContain("{ label: 'Sauvegarde', value: 'JSON v3'");
    expect(backupOverviewSource).toContain("{ label: 'Dernière copie'");
    expect(backupOverviewSource).toContain("{ label: 'Espace utilisé'");
    expect(backupOverviewSource).toContain('var(--sp-radius-control)');
    expect(backupOverviewSource).toContain('var(--sp-border-subtle)');
    expect(backupOverviewSource).toContain('var(--sp-surface-muted)');
    expect(backupOverviewSource).toContain('var(--sp-text-primary)');
  });

  it('préserve les appels de persistance et les états fonctionnels', () => {
    expect(storagePersistenceSource).toContain('getStoragePersistenceStatus');
    expect(storagePersistenceSource).toContain('requestPersistentStorage');
    expect(storagePersistenceSource).toContain('const updated = await requestPersistence()');
    expect(storagePersistenceSource).toContain("status?.state === 'persistent'");
    expect(storagePersistenceSource).toContain("status?.state === 'unsupported'");
    expect(storagePersistenceSource).toContain("status?.state === 'best-effort' && status.canRequest");
    expect(storagePersistenceSource).toContain("import { Button } from '@/shared/ui/Button'");
    expect(storagePersistenceSource).toContain("import { InlineNotice } from '@/shared/ui/InlineNotice'");
    expect(storagePersistenceSource).toContain('var(--sp-text-secondary)');
    expect(storagePersistenceSource).toContain('var(--sp-text-muted)');
  });
});

describe('convergence visuelle Data — reset protégé', () => {
  it('conserve la confirmation stricte et les protections du dialogue', () => {
    expect(backupDeleteDialogSource).toContain("const confirmed = confirmation === 'EFFACER'");
    expect(backupDeleteDialogSource).toContain("if (event.key === 'Escape' && !isPending)");
    expect(backupDeleteDialogSource).toContain('FOCUSABLE_SELECTOR');
    expect(backupDeleteDialogSource).toContain('document.body.style.overflow = \'hidden\'');
    expect(backupDeleteDialogSource).toContain('onClick={onConfirm}');
    expect(backupDeleteDialogSource).toContain('onClick={onCancel}');
    expect(backupDeleteDialogSource).toContain('disabled={!confirmed || isPending}');
  });

  it('réutilise le style de formulaire et les boutons partagés', () => {
    expect(backupDeleteDialogSource).toContain("import { inputClassName } from '@/shared/forms/formStyles'");
    expect(backupDeleteDialogSource).toContain('className={`${inputClassName} mt-2`}');
    expect(backupDeleteDialogSource).toContain('variant="secondary"');
    expect(backupDeleteDialogSource).toContain('variant="danger"');
    expect(backupDeleteDialogSource).toContain('var(--sp-radius-card)');
    expect(backupDeleteDialogSource).toContain('var(--sp-radius-control)');
    expect(backupDeleteDialogSource).toContain('var(--sp-surface-elevated)');
  });
});
