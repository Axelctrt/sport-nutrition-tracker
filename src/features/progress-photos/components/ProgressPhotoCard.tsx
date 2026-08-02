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
                className="h-24 w-20 shrink-0 rounded-xl bg-slate-100 object-cover dark:bg-slate-800"
              />
            ) : (
              <span className="grid h-24 w-20 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <ImageIcon aria-hidden="true" className="size-6" />
              </span>
            )}
            <div className="min-w-0 py-1">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                {viewLabel}
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                {dateLabel}
              </h2>
              {photo.weightKg === undefined ? null : (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {photo.weightKg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg
                </p>
              )}
              {photo.note ? (
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                  {photo.note}
                </p>
              ) : null}
            </div>
          </div>
        )}
        actions={(
          <button
            type="button"
            aria-label={`Supprimer la photo du ${dateLabel}`}
            className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
            onClick={() => setConfirmationOpen(true)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        )}
        details={(
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-950 dark:text-white">Vue</dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-300">{viewLabel}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-950 dark:text-white">Fichier local</dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-300">
                {photo.width} × {photo.height} · {formatProgressPhotoSize(photo.byteSize)}
              </dd>
            </div>
            {photo.weightKg === undefined ? null : (
              <div>
                <dt className="font-semibold text-slate-950 dark:text-white">Poids associé</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300">
                  {photo.weightKg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg
                </dd>
              </div>
            )}
            {photo.note ? (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-slate-950 dark:text-white">Note</dt>
                <dd className="mt-1 whitespace-pre-wrap leading-6 text-slate-600 dark:text-slate-300">
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
