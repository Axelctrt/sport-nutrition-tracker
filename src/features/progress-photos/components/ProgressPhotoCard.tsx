import { ImageIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { ProgressPhoto } from '@/domain/models/progressPhoto';
import {
  formatProgressPhotoDate,
  formatProgressPhotoSize,
  progressPhotoViewLabels,
} from '@/features/progress-photos/progressPhotoLabels';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { ExpandableCard } from '@/shared/ui/ExpandableCard';
import { IconAction } from '@/shared/ui/IconAction';

interface ProgressPhotoCardProps {
  photo: ProgressPhoto;
  thumbnailUrl: string;
  onDelete: (photoId: string) => Promise<void>;
}

export function ProgressPhotoCard({
  photo,
  thumbnailUrl,
  onDelete,
}: ProgressPhotoCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const viewLabel = progressPhotoViewLabels[photo.view];
  const dateLabel = formatProgressPhotoDate(photo.date);

  return (
    <>
      <ExpandableCard
        expanded={expanded}
        onExpandedChange={setExpanded}
        expandLabel={`Afficher les détails de la photo ${viewLabel.toLocaleLowerCase('fr')} du ${dateLabel}`}
        collapseLabel={`Masquer les détails de la photo ${viewLabel.toLocaleLowerCase('fr')} du ${dateLabel}`}
        className="overflow-hidden"
        summaryClassName="min-w-0"
        summary={(
          <div className="flex min-w-0 gap-3">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={`Photo de progression ${viewLabel.toLocaleLowerCase('fr')} du ${dateLabel}`}
                className="h-24 w-20 shrink-0 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-muted)] object-cover"
              />
            ) : (
              <span className="grid h-24 w-20 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-muted)] text-[var(--sp-text-muted)]">
                <ImageIcon aria-hidden="true" className="size-6" />
              </span>
            )}
            <div className="min-w-0 py-1">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--sp-accent-primary)]">
                {viewLabel}
              </p>
              <h2 className="mt-1 text-base font-semibold text-[var(--sp-text-primary)]">
                {dateLabel}
              </h2>
              {photo.weightKg === undefined ? null : (
                <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
                  {photo.weightKg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg
                </p>
              )}
              {photo.note ? (
                <p className="mt-1 line-clamp-2 text-sm text-[var(--sp-text-muted)]">
                  {photo.note}
                </p>
              ) : null}
            </div>
          </div>
        )}
        actions={(
          <IconAction
            icon={Trash2}
            label={`Supprimer la photo du ${dateLabel}`}
            variant="danger"
            onClick={() => setConfirmationOpen(true)}
          />
        )}
        details={(
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-[var(--sp-text-primary)]">Vue</dt>
              <dd className="mt-1 text-[var(--sp-text-secondary)]">{viewLabel}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--sp-text-primary)]">Fichier local</dt>
              <dd className="mt-1 text-[var(--sp-text-secondary)]">
                {photo.width} × {photo.height} · {formatProgressPhotoSize(photo.byteSize)}
              </dd>
            </div>
            {photo.weightKg === undefined ? null : (
              <div>
                <dt className="font-semibold text-[var(--sp-text-primary)]">Poids associé</dt>
                <dd className="mt-1 text-[var(--sp-text-secondary)]">
                  {photo.weightKg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg
                </dd>
              </div>
            )}
            {photo.note ? (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-[var(--sp-text-primary)]">Note</dt>
                <dd className="mt-1 whitespace-pre-wrap leading-6 text-[var(--sp-text-secondary)]">
                  {photo.note}
                </dd>
              </div>
            ) : null}
          </dl>
        )}
      />

      <ConfirmationDialog
        open={confirmationOpen}
        title="Supprimer cette photo ?"
        description={`La photo ${viewLabel.toLocaleLowerCase('fr')} du ${dateLabel} sera supprimée définitivement de cet appareil.`}
        confirmLabel="Supprimer"
        tone="danger"
        isPending={deleting}
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => {
          setDeleting(true);
          void onDelete(photo.id).then(() => {
            setConfirmationOpen(false);
          }).finally(() => setDeleting(false));
        }}
      />
    </>
  );
}
