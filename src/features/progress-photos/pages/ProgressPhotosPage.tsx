import {
  ArrowLeft,
  GitCompareArrows,
  Images,
  LockKeyhole,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  readProgressPhotoStorageEstimate,
  type ProgressPhotoStorageEstimate,
} from '@/application/progress-photos/progressPhotoService';
import { routePaths } from '@/app/routePaths';
import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoView,
} from '@/domain/models/progressPhoto';
import { ProgressPhotoAddForm } from '@/features/progress-photos/components/ProgressPhotoAddForm';
import { ProgressPhotoArchivePanel } from '@/features/progress-photos/components/ProgressPhotoArchivePanel';
import { ProgressPhotoCard } from '@/features/progress-photos/components/ProgressPhotoCard';
import { useProgressPhotos } from '@/features/progress-photos/hooks/useProgressPhotos';
import { progressPhotoViewLabels } from '@/features/progress-photos/progressPhotoLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { UnsavedChangesGuard } from '@/shared/ui/UnsavedChangesGuard';

function formatStorage(bytes: number | undefined): string {
  if (bytes === undefined) return 'indisponible';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1).replace('.', ',')} Go`;
}

export function ProgressPhotosPage() {
  const progressPhotos = useProgressPhotos();
  const [viewFilter, setViewFilter] = useState<'all' | ProgressPhotoView>('all');
  const [storage, setStorage] = useState<ProgressPhotoStorageEstimate>({});
  const [localError, setLocalError] = useState<string>();
  const [isAddFormDirty, setIsAddFormDirty] = useState(false);

  useEffect(() => {
    void readProgressPhotoStorageEstimate().then(setStorage).catch(() => setStorage({}));
  }, [progressPhotos.items.length]);

  const visibleItems = useMemo(() =>
    viewFilter === 'all'
      ? progressPhotos.items
      : progressPhotos.items.filter(({ photo }) => photo.view === viewFilter),
  [progressPhotos.items, viewFilter]);

  const canCompare = progressPhotos.items.length >= 2;

  return (
    <section aria-labelledby="progress-photos-title" className="space-y-5 pb-8">
      <Link
        to={routePaths.progression}
        className="hidden min-h-11 items-center gap-2 text-sm font-semibold text-[var(--sp-accent-primary)] hover:underline lg:inline-flex"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour à la progression
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sp-accent-primary)]">
            Progression privée
          </p>
          <h1 id="progress-photos-title" className="mt-1 text-3xl font-bold text-[var(--sp-text-primary)]">
            Photos de progression
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sp-text-secondary)]">
            Suis visuellement ton évolution avec des photos conservées uniquement dans l’espace local actuellement ouvert.
          </p>
        </div>
        <Link
          to={routePaths.progressPhotoCompare}
          aria-disabled={!canCompare}
          tabIndex={canCompare ? undefined : -1}
          className={`sp-button sp-button--secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-bold ${canCompare ? '' : 'pointer-events-none opacity-50'}`}
        >
          <GitCompareArrows aria-hidden="true" className="size-4" />
          Comparer
        </Link>
      </div>

      <InlineNotice title="Privées et locales" tone="info">
        <div className="flex gap-3">
          <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p>
            Ces images ne sont ni publiées, ni analysées par une IA, ni envoyées dans Dexie Cloud. Une personne ayant accès à cet appareil et à ce navigateur peut toutefois les consulter.
          </p>
        </div>
      </InlineNotice>

      <ProgressPhotoAddForm
        onDirtyChange={setIsAddFormDirty}
        onSave={async (input) => {
          setLocalError(undefined);
          await progressPhotos.save(input);
        }}
      />

      <section aria-labelledby="progress-photo-gallery-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="progress-photo-gallery-title" className="text-xl font-semibold text-[var(--sp-text-primary)]">
              Galerie
            </h2>
            <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
              {progressPhotos.items.length} photo{progressPhotos.items.length > 1 ? 's' : ''} · stockage restant estimé : {formatStorage(storage.remaining)}
            </p>
          </div>
          {progressPhotos.items.length ? (
            <label className="grid gap-1 text-sm font-semibold text-[var(--sp-text-secondary)]">
              Filtrer par vue
              <select
                value={viewFilter}
                onChange={(event) => setViewFilter(event.currentTarget.value as 'all' | ProgressPhotoView)}
                className={inputClassName}
              >
                <option value="all">Toutes les vues</option>
                {PROGRESS_PHOTO_VIEWS.map((view) => (
                  <option key={view} value={view}>{progressPhotoViewLabels[view]}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {progressPhotos.errorMessage || localError ? (
          <InlineNotice className="mt-4" tone="error" title="Galerie indisponible" role="alert">
            <p>{localError ?? progressPhotos.errorMessage}</p>
            <Button className="mt-3" variant="secondary" onClick={() => void progressPhotos.refresh()}>
              <RefreshCw aria-hidden="true" className="size-4" />
              Réessayer
            </Button>
          </InlineNotice>
        ) : null}

        {progressPhotos.status === 'loading' ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Chargement des photos de progression">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-[var(--sp-radius-card)] bg-[var(--sp-surface-muted)] motion-reduce:animate-none" />
            ))}
          </div>
        ) : null}

        {progressPhotos.status === 'ready' && progressPhotos.items.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={Images}
            title="Aucune photo de progression"
            description="Ajoute une première photo pour créer une référence privée sur cet appareil."
            variant="first-use"
          />
        ) : null}

        {progressPhotos.status === 'ready' && progressPhotos.items.length > 0 && visibleItems.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={Images}
            title="Aucune photo pour cette vue"
            description="Les autres photos sont toujours présentes. Réinitialise le filtre pour les retrouver."
            variant="filtered"
            primaryAction={(
              <Button variant="secondary" onClick={() => setViewFilter('all')}>
                Voir toutes les vues
              </Button>
            )}
          />
        ) : null}

        {visibleItems.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {visibleItems.map(({ photo, thumbnailUrl }) => (
              <ProgressPhotoCard
                key={photo.id}
                photo={photo}
                thumbnailUrl={thumbnailUrl}
                onDelete={async (photoId) => {
                  setLocalError(undefined);
                  try {
                    await progressPhotos.remove(photoId);
                  } catch (error) {
                    setLocalError(
                      error instanceof Error
                        ? error.message
                        : 'La photo ne peut pas être supprimée.',
                    );
                    throw error;
                  }
                }}
              />
            ))}
          </div>
        ) : null}
      </section>

      <ProgressPhotoArchivePanel
        photoCount={progressPhotos.items.length}
        onImported={() => progressPhotos.refresh(true)}
      />

      <UnsavedChangesGuard when={isAddFormDirty} />
    </section>
  );
}
