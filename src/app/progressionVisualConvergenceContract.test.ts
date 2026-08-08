import { describe, expect, it } from 'vitest';

import addFormSource from '@/features/progress-photos/components/ProgressPhotoAddForm.tsx?raw';
import archiveSource from '@/features/progress-photos/components/ProgressPhotoArchivePanel.tsx?raw';
import photoCardSource from '@/features/progress-photos/components/ProgressPhotoCard.tsx?raw';
import photosPageSource from '@/features/progress-photos/pages/ProgressPhotosPage.tsx?raw';
import progressionEntrySource from '@/features/progress-photos/pages/ProgressionWithPhotosPage.tsx?raw';

describe('convergence visuelle des photos de progression', () => {
  it('conserve les destinations et adopte les tokens sémantiques sur les pages', () => {
    expect(progressionEntrySource).toContain('to={routePaths.progressPhotos}');
    expect(progressionEntrySource).toContain('var(--sp-surface-muted)');
    expect(progressionEntrySource).toContain('var(--sp-accent-primary)');
    expect(progressionEntrySource).toContain('sp-button sp-button--secondary');
    expect(progressionEntrySource).toContain('rounded-[var(--sp-radius-control)]');
    expect(progressionEntrySource).not.toContain('border-brand-200 bg-brand-50/50');

    expect(photosPageSource).toContain("import { inputClassName } from '@/shared/forms/formStyles'");
    expect(photosPageSource).toContain('to={routePaths.progression}');
    expect(photosPageSource).toContain('to={routePaths.progressPhotoCompare}');
    expect(photosPageSource).toContain('rounded-[var(--sp-radius-control)]');
    expect(photosPageSource).toContain('className={inputClassName}');
    expect(photosPageSource).toContain('var(--sp-text-primary)');
    expect(photosPageSource).toContain('var(--sp-text-secondary)');
  });

  it('réutilise le style de formulaire partagé sans changer le contrat de sauvegarde photo', () => {
    expect(addFormSource).toContain("const acceptedImageTypes = 'image/jpeg,image/png,image/webp,image/heic,image/heif'");
    expect(addFormSource).toContain("import { inputClassName } from '@/shared/forms/formStyles'");
    expect(addFormSource).toContain('rounded-[var(--sp-radius-control)] text-sm');
    expect(addFormSource).toContain('accept={acceptedImageTypes}');
    expect(addFormSource).toContain('await onSave({');
    expect(addFormSource).toContain('file: selectedFile');
    expect(addFormSource).toContain('date,');
    expect(addFormSource).toContain('view,');
    expect(addFormSource).toContain('className={inputClassName}');
    expect(addFormSource).toContain('onClick={clearFile}');
  });

  it('conserve les suppressions confirmées et les opérations d’archive', () => {
    expect(photoCardSource).toContain("import { IconAction } from '@/shared/ui/IconAction'");
    expect(photoCardSource).toContain('label={`Supprimer la photo du ${dateLabel}`}');
    expect(photoCardSource).toContain('variant="danger"');
    expect(photoCardSource).toContain('void onDelete(photo.id)');
    expect(photoCardSource).toContain('<ConfirmationDialog');

    expect(archiveSource).toContain('createProgressPhotoArchive(repositories.progressPhotos)');
    expect(archiveSource).toContain('importProgressPhotoArchive(');
    expect(archiveSource).toContain('await repositories.progressPhotos.clearAll()');
    expect(archiveSource).toContain('<ConfirmationDialog');
    expect(archiveSource).toContain('var(--sp-surface-muted)');
  });
});
