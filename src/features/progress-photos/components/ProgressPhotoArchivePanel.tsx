import { Download, FileArchive, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

import {
  createProgressPhotoArchive,
  importProgressPhotoArchive,
  MAX_PROGRESS_PHOTO_ARCHIVE_BYTES,
} from '@/application/progress-photos/progressPhotoArchiveService';
import { repositories } from '@/infrastructure/repositories/repositories';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface ProgressPhotoArchivePanelProps {
  photoCount: number;
  onImported: () => Promise<void>;
}

function downloadArchive(serialized: string): void {
  const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sportpilot-photos-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ProgressPhotoArchivePanel({
  photoCount,
  onImported,
}: ProgressPhotoArchivePanelProps) {
  const [busy, setBusy] = useState<'export' | 'import' | 'delete'>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>();
  const inputRef = useRef<HTMLInputElement>(null);

  async function exportPhotos(): Promise<void> {
    if (!photoCount || busy) return;
    setBusy('export');
    setFeedback(undefined);
    try {
      downloadArchive(await createProgressPhotoArchive(repositories.progressPhotos));
      setFeedback({
        tone: 'success',
        title: 'Archive créée',
        message: `${photoCount} photo${photoCount > 1 ? 's ont' : ' a'} été exportée${photoCount > 1 ? 's' : ''} dans un fichier séparé.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Export impossible',
        message: error instanceof Error ? error.message : 'L’archive ne peut pas être créée.',
      });
    } finally {
      setBusy(undefined);
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || busy) return;
    if (file.size > MAX_PROGRESS_PHOTO_ARCHIVE_BYTES) {
      setFeedback({
        tone: 'error',
        title: 'Archive trop volumineuse',
        message: 'Le fichier dépasse la limite de 100 Mo.',
      });
      return;
    }
    setBusy('import');
    setFeedback(undefined);
    try {
      const result = await importProgressPhotoArchive(
        repositories.progressPhotos,
        await file.text(),
      );
      await onImported();
      setFeedback({
        tone: result.imported ? 'success' : 'info',
        title: result.imported ? 'Photos restaurées' : 'Aucune nouvelle photo',
        message: `${result.imported} photo${result.imported > 1 ? 's ajoutées' : ' ajoutée'}, ${result.skipped} doublon${result.skipped > 1 ? 's ignorés' : ' ignoré'}.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Restauration impossible',
        message: error instanceof Error ? error.message : 'L’archive ne peut pas être restaurée.',
      });
    } finally {
      setBusy(undefined);
    }
  }

  async function deleteAllPhotos(): Promise<void> {
    if (!photoCount || busy) return;
    setBusy('delete');
    setFeedback(undefined);
    try {
      await repositories.progressPhotos.clearAll();
      await onImported();
      setDeleteDialogOpen(false);
      setFeedback({
        tone: 'success',
        title: 'Photos supprimées',
        message: 'Toutes les photos et miniatures de cet espace local ont été supprimées.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Suppression impossible',
        message: error instanceof Error ? error.message : 'Les photos ne peuvent pas être supprimées.',
      });
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <>
      <Card className="p-4 sm:p-5" aria-labelledby="progress-photo-archive-title">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-muted)] text-[var(--sp-text-secondary)]">
            <FileArchive aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 id="progress-photo-archive-title" className="text-lg font-semibold text-[var(--sp-text-primary)]">
              Sauvegarder ou supprimer les photos
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--sp-text-secondary)]">
              La sauvegarde JSON générale de SportPilot n’inclut pas les images. Utilise cette archive séparée pour les conserver ou les restaurer dans l’espace local actuellement ouvert.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            variant="secondary"
            disabled={!photoCount || Boolean(busy)}
            onClick={() => void exportPhotos()}
          >
            <Download aria-hidden="true" className="size-4" />
            {busy === 'export' ? 'Préparation…' : 'Exporter les photos'}
          </Button>
          <Button
            variant="secondary"
            disabled={Boolean(busy)}
            onClick={() => inputRef.current?.click()}
          >
            <Upload aria-hidden="true" className="size-4" />
            {busy === 'import' ? 'Restauration…' : 'Restaurer une archive'}
          </Button>
          <Button
            variant="dangerGhost"
            disabled={!photoCount || Boolean(busy)}
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Supprimer toutes les photos
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Choisir une archive de photos SportPilot"
            onChange={(event) => void importFile(event)}
          />
        </div>

        {feedback ? (
          <InlineNotice
            className="mt-4"
            tone={feedback.tone}
            title={feedback.title}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </InlineNotice>
        ) : null}
      </Card>

      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Supprimer toutes les photos ?"
        description={`Les ${photoCount} photo${photoCount > 1 ? 's' : ''} et leurs miniatures seront supprimées définitivement de cet espace local. Exporte une archive avant de continuer si tu souhaites les conserver.`}
        confirmLabel="Tout supprimer"
        tone="danger"
        isPending={busy === 'delete'}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => void deleteAllPhotos()}
      />
    </>
  );
}
