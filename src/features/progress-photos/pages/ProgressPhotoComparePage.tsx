import {
  ArrowLeft,
  GitCompareArrows,
  Images,
  Repeat2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { routePaths } from '@/app/routePaths';
import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhoto,
  type ProgressPhotoView,
} from '@/domain/models/progressPhoto';
import { useProgressPhotoAssetUrl } from '@/features/progress-photos/hooks/useProgressPhotoAssetUrl';
import { useProgressPhotos } from '@/features/progress-photos/hooks/useProgressPhotos';
import {
  formatProgressPhotoDate,
  progressPhotoViewLabels,
} from '@/features/progress-photos/progressPhotoLabels';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';

function photoLabel(photo: ProgressPhoto): string {
  const weight = photo.weightKg === undefined
    ? ''
    : ` · ${photo.weightKg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg`;
  return `${formatProgressPhotoDate(photo.date)}${weight}`;
}

function countByView(
  photos: readonly ProgressPhoto[],
): Record<ProgressPhotoView, number> {
  const counts: Record<ProgressPhotoView, number> = {
    front: 0,
    left: 0,
    right: 0,
    back: 0,
    free: 0,
  };
  for (const photo of photos) {
    counts[photo.view] = (counts[photo.view] ?? 0) + 1;
  }
  return counts;
}

export function ProgressPhotoComparePage() {
  const progressPhotos = useProgressPhotos();
  const photos = useMemo(
    () => progressPhotos.items.map(({ photo }) => photo),
    [progressPhotos.items],
  );
  const counts = useMemo(() => countByView(photos), [photos]);
  const firstComparableView: ProgressPhotoView = PROGRESS_PHOTO_VIEWS.find(
    (candidate) => (counts[candidate] ?? 0) >= 2,
  ) ?? 'front';
  const [view, setView] = useState<ProgressPhotoView>(firstComparableView);
  const [beforeId, setBeforeId] = useState('');
  const [afterId, setAfterId] = useState('');
  const [position, setPosition] = useState(50);

  const candidates = useMemo(
    () => photos.filter((photo) => photo.view === view),
    [photos, view],
  );

  useEffect(() => {
    if ((counts[view] ?? 0) < 2 && (counts[firstComparableView] ?? 0) >= 2) {
      setView(firstComparableView);
    }
  }, [counts, firstComparableView, view]);

  useEffect(() => {
    const newest = candidates.at(0);
    const oldest = candidates.at(-1);
    if (!newest || !oldest) {
      setBeforeId('');
      setAfterId('');
      return;
    }
    setBeforeId((current) => candidates.some(({ id }) => id === current)
      ? current
      : oldest.id);
    setAfterId((current) => candidates.some(({ id }) => id === current)
      ? current
      : newest.id);
  }, [candidates]);

  const before = candidates.find(({ id }) => id === beforeId);
  const after = candidates.find(({ id }) => id === afterId);
  const comparison = before && after && before.id !== after.id
    ? { before, after }
    : undefined;
  const beforeAsset = useProgressPhotoAssetUrl(comparison?.before.originalAssetId);
  const afterAsset = useProgressPhotoAssetUrl(comparison?.after.originalAssetId);
  const hasComparableView = PROGRESS_PHOTO_VIEWS.some(
    (candidate) => (counts[candidate] ?? 0) >= 2,
  );

  return (
    <section aria-labelledby="progress-photo-compare-title" className="space-y-5 pb-8">
      <Link
        to={routePaths.progressPhotos}
        className="hidden min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline lg:inline-flex dark:text-brand-300"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour aux photos
      </Link>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Avant / après privé
        </p>
        <h1 id="progress-photo-compare-title" className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
          Comparer deux photos
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Choisis deux dates prises sous le même angle, puis déplace le séparateur au toucher ou avec les flèches du clavier.
        </p>
      </div>

      {progressPhotos.errorMessage ? (
        <InlineNotice tone="error" title="Comparateur indisponible" role="alert">
          {progressPhotos.errorMessage}
        </InlineNotice>
      ) : null}

      {progressPhotos.status === 'ready' && !hasComparableView ? (
        <EmptyState
          icon={Images}
          title="Deux photos comparables sont nécessaires"
          description="Ajoute au moins deux photos avec la même vue pour utiliser le comparateur."
          variant="first-use"
          primaryAction={(
            <Link to={routePaths.progressPhotos} className="sp-button sp-button--primary inline-flex min-h-11 items-center justify-center px-4 text-sm font-bold">
              Ajouter des photos
            </Link>
          )}
        />
      ) : null}

      {hasComparableView ? (
        <>
          <Card className="grid gap-4 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Vue commune
                <select
                  value={view}
                  onChange={(event) => setView(event.currentTarget.value as ProgressPhotoView)}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {PROGRESS_PHOTO_VIEWS.map((candidate) => (
                    <option
                      key={candidate}
                      value={candidate}
                      disabled={(counts[candidate] ?? 0) < 2}
                    >
                      {progressPhotoViewLabels[candidate]} ({counts[candidate] ?? 0})
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Avant
                <select
                  value={beforeId}
                  onChange={(event) => setBeforeId(event.currentTarget.value)}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {candidates.map((photo) => (
                    <option key={photo.id} value={photo.id}>{photoLabel(photo)}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Après
                <select
                  value={afterId}
                  onChange={(event) => setAfterId(event.currentTarget.value)}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {candidates.map((photo) => (
                    <option key={photo.id} value={photo.id}>{photoLabel(photo)}</option>
                  ))}
                </select>
              </label>
            </div>
            <Button
              variant="secondary"
              className="w-full sm:w-fit"
              disabled={!before || !after}
              onClick={() => {
                setBeforeId(afterId);
                setAfterId(beforeId);
              }}
            >
              <Repeat2 aria-hidden="true" className="size-4" />
              Inverser avant et après
            </Button>
          </Card>

          {!comparison ? (
            <InlineNotice tone="info" title="Choisis deux photos différentes">
              Les sélections avant et après doivent correspondre à deux dates distinctes.
            </InlineNotice>
          ) : null}

          {comparison ? (
            <Card className="overflow-hidden p-3 sm:p-4" aria-labelledby="photo-comparison-heading">
              <div className="flex items-center justify-between gap-3 px-1 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase text-brand-700 dark:text-brand-300">Avant</p>
                  <h2 id="photo-comparison-heading" className="text-sm font-semibold text-slate-950 dark:text-white">
                    {photoLabel(comparison.before)}
                  </h2>
                </div>
                <GitCompareArrows aria-hidden="true" className="size-5 text-slate-400" />
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-brand-700 dark:text-brand-300">Après</p>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {photoLabel(comparison.after)}
                  </p>
                </div>
              </div>

              {beforeAsset.errorMessage || afterAsset.errorMessage ? (
                <InlineNotice tone="error" title="Image introuvable" role="alert">
                  {beforeAsset.errorMessage ?? afterAsset.errorMessage}
                </InlineNotice>
              ) : null}

              <div className="relative mx-auto aspect-[3/4] w-full max-w-2xl overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                {beforeAsset.url ? (
                  <img
                    src={beforeAsset.url}
                    alt={`Avant : ${photoLabel(comparison.before)}`}
                    className="absolute inset-0 size-full object-contain"
                  />
                ) : null}
                {afterAsset.url ? (
                  <div
                    className="absolute inset-0 motion-reduce:transition-none"
                    style={{ clipPath: `inset(0 0 0 ${position}%)` }}
                  >
                    <img
                      src={afterAsset.url}
                      alt={`Après : ${photoLabel(comparison.after)}`}
                      className="size-full object-contain"
                    />
                  </div>
                ) : null}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.35)]"
                  style={{ left: `${position}%` }}
                >
                  <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-slate-950/70 text-white shadow-lg">
                    <GitCompareArrows className="size-4" />
                  </span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={position}
                  aria-label="Position du séparateur avant après"
                  onChange={(event) => setPosition(Number(event.currentTarget.value))}
                  className="absolute inset-0 z-10 size-full cursor-ew-resize opacity-0"
                />
              </div>
              <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                {position} % · glisse sur l’image ou utilise les flèches gauche et droite.
              </p>
            </Card>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
