import {
  AlertTriangle,
  Archive,
  CheckSquare2,
  Download,
  FileUp,
  LoaderCircle,
  RotateCcw,
  Search,
  Square,
  Trash2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';

import {
  deleteTrashItemsPermanently,
  emptyTrash,
  restoreTrashItems,
} from '@/application/trash/trashBulkService';
import {
  downloadTrashArchive,
  importTrashArchive,
  MAX_TRASH_ARCHIVE_FILE_SIZE_BYTES,
} from '@/application/trash/trashArchiveService';
import type {
  TrashEntityType,
  TrashItem,
} from '@/domain/models/trash';
import { appDatabase } from '@/infrastructure/database/database';
import {
  deleteTrashItemPermanently,
  listTrashItems,
  purgeExpiredTrashItems,
  restoreTrashItem,
} from '@/infrastructure/repositories/dexie/trashService';

interface Feedback {
  tone: 'success' | 'error' | 'info';
  message: string;
}

type BulkConfirmation = 'delete-selected' | 'empty';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function formatFileSize(bytes: number): string {
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 1,
  }).format(bytes / 1024 / 1024)} Mo`;
}

function daysRemaining(value: string): number {
  const purgeAt = new Date(value).getTime();

  if (!Number.isFinite(purgeAt)) return 0;

  return Math.max(
    0,
    Math.ceil((purgeAt - Date.now()) / MILLISECONDS_PER_DAY),
  );
}

function typeLabel(item: TrashItem): string {
  switch (item.entityType) {
    case 'activity':
      return 'Activité';
    case 'weight':
      return 'Pesée';
    case 'foodEntry':
      return 'Entrée alimentaire';
    case 'meal':
      return 'Repas';
    case 'favoriteMeal':
      return 'Repas favori';
    case 'recipe':
      return 'Recette';
    case 'strengthSet':
      return 'Série de musculation';
    case 'workoutSessionExercise':
      return 'Exercice de séance';
  }
}

export function TrashPage() {
  const archiveInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string>();
  const [confirmDeleteId, setConfirmDeleteId] =
    useState<string>();
  const [bulkConfirmation, setBulkConfirmation] =
    useState<BulkConfirmation>();
  const [isBulkPending, setIsBulkPending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] =
    useState<TrashEntityType | 'all'>('all');
  const [feedback, setFeedback] = useState<Feedback>();

  const loadItems = useCallback(async () => {
    setIsLoading(true);

    try {
      await purgeExpiredTrashItems(appDatabase);
      const loadedItems = await listTrashItems(appDatabase);
      const availableIds = new Set(
        loadedItems.map((item) => item.id),
      );

      setItems(loadedItems);
      setSelectedIds((current) =>
        current.filter((id) => availableIds.has(id)),
      );
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'La corbeille n’a pas pu être chargée.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const availableTypes = useMemo(
    () =>
      [...new Set(items.map((item) => item.entityType))].sort(),
    [items],
  );

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');

    return items.filter((item) => {
      if (
        typeFilter !== 'all' &&
        item.entityType !== typeFilter
      ) {
        return false;
      }

      if (!normalizedQuery) return true;

      return (
        item.label
          .toLocaleLowerCase('fr')
          .includes(normalizedQuery) ||
        typeLabel(item)
          .toLocaleLowerCase('fr')
          .includes(normalizedQuery)
      );
    });
  }, [items, query, typeFilter]);

  const selectedItems = useMemo(() => {
    const selected = new Set(selectedIds);
    return items.filter((item) => selected.has(item.id));
  }, [items, selectedIds]);

  const allVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selectedIds.includes(item.id));

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id],
    );
  };

  const toggleVisibleSelection = () => {
    const visibleIds = visibleItems.map((item) => item.id);

    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return [...new Set([...current, ...visibleIds])];
    });
  };

  const handleRestore = async (item: TrashItem) => {
    setPendingId(item.id);
    setFeedback(undefined);

    try {
      await restoreTrashItem(appDatabase, item.id);
      setFeedback({
        tone: 'success',
        message: `${item.label} a été restauré.`,
      });
      await loadItems();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'La restauration a échoué.',
      });
    } finally {
      setPendingId(undefined);
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    setPendingId(item.id);
    setFeedback(undefined);

    try {
      downloadTrashArchive([item], 'before-delete');
      await deleteTrashItemPermanently(appDatabase, item.id);
      setConfirmDeleteId(undefined);
      setFeedback({
        tone: 'info',
        message:
          `${item.label} a été archivé puis supprimé définitivement.`,
      });
      await loadItems();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'La suppression définitive a échoué.',
      });
    } finally {
      setPendingId(undefined);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;

    setIsBulkPending(true);
    setFeedback(undefined);

    try {
      const result = await restoreTrashItems(
        appDatabase,
        selectedIds,
      );

      setSelectedIds(
        result.failures.map((failure) => failure.id),
      );

      if (result.failures.length === 0) {
        setFeedback({
          tone: 'success',
          message: `${result.restoredIds.length} élément(s) ont été restaurés.`,
        });
      } else {
        setFeedback({
          tone: 'info',
          message:
            `${result.restoredIds.length} élément(s) restauré(s), ${result.failures.length} conflit(s) conservé(s) dans la sélection.`,
        });
      }

      await loadItems();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'La restauration groupée a échoué.',
      });
    } finally {
      setIsBulkPending(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;

    setIsBulkPending(true);
    setFeedback(undefined);

    try {
      downloadTrashArchive(
        selectedItems,
        'before-delete',
      );
      const deletedCount =
        await deleteTrashItemsPermanently(
          appDatabase,
          selectedItems.map((item) => item.id),
        );

      setSelectedIds([]);
      setBulkConfirmation(undefined);
      setFeedback({
        tone: 'info',
        message:
          `${deletedCount} élément(s) ont été archivés puis supprimés définitivement.`,
      });
      await loadItems();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'La suppression groupée a échoué.',
      });
    } finally {
      setIsBulkPending(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (items.length === 0) return;

    setIsBulkPending(true);
    setFeedback(undefined);

    try {
      downloadTrashArchive(items, 'before-empty');
      const deletedCount = await emptyTrash(appDatabase);

      setSelectedIds([]);
      setBulkConfirmation(undefined);
      setFeedback({
        tone: 'info',
        message:
          `${deletedCount} élément(s) ont été archivés puis supprimés de la corbeille.`,
      });
      await loadItems();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Le vidage de la corbeille a échoué.',
      });
    } finally {
      setIsBulkPending(false);
    }
  };

  const handleManualArchive = () => {
    setFeedback(undefined);

    try {
      const prepared = downloadTrashArchive(items, 'manual');
      setFeedback({
        tone: 'success',
        message:
          `${prepared.itemCount} élément(s) ont été exportés dans ${prepared.fileName}.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'L’archive n’a pas pu être créée.',
      });
    }
  };

  const handleArchiveImport = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setIsBulkPending(true);
    setFeedback(undefined);

    try {
      if (file.size > MAX_TRASH_ARCHIVE_FILE_SIZE_BYTES) {
        throw new Error(
          `La taille maximale autorisée est ${formatFileSize(
            MAX_TRASH_ARCHIVE_FILE_SIZE_BYTES,
          )}.`,
        );
      }

      const importedCount = await importTrashArchive(
        appDatabase,
        await file.text(),
      );

      setFeedback({
        tone: 'success',
        message:
          `${importedCount} élément(s) ont été replacés dans la corbeille pour 30 jours.`,
      });
      await loadItems();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'L’archive n’a pas pu être importée.',
      });
    } finally {
      if (archiveInputRef.current) {
        archiveInputRef.current.value = '';
      }
      setIsBulkPending(false);
    }
  };

  return (
    <section
      aria-labelledby="trash-title"
      className="min-w-0 overflow-x-clip"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <Trash2 aria-hidden="true" className="size-6" />
          </span>

          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Protection contre les erreurs
            </p>
            <h1
              id="trash-title"
              className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
            >
              Corbeille
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
              Recherche, sélectionne et restaure plusieurs éléments.
              Avant toute suppression définitive, SportPilot
              télécharge une archive réimportable de la corbeille.
            </p>
          </div>
        </div>
      </div>

      {feedback ? (
        <div
          aria-live="polite"
          className={[
            'mt-4 rounded-2xl border px-4 py-3 text-sm',
            feedback.tone === 'error'
              ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
              : feedback.tone === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                : 'border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
          ].join(' ')}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        {!isLoading && items.length > 0 ? (
          <>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.35fr)]">
              <label className="relative block">
                <span className="sr-only">
                  Rechercher dans la corbeille
                </span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher un élément…"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label>
                <span className="sr-only">
                  Filtrer par type
                </span>
                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(
                      event.target.value as
                        | TrashEntityType
                        | 'all',
                    )
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="all">Tous les types</option>
                  {availableTypes.map((entityType) => {
                    const sample = items.find(
                      (item) => item.entityType === entityType,
                    );

                    return (
                      <option
                        key={entityType}
                        value={entityType}
                      >
                        {sample ? typeLabel(sample) : entityType}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleVisibleSelection}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100"
              >
                {allVisibleSelected ? (
                  <CheckSquare2
                    aria-hidden="true"
                    className="size-4"
                  />
                ) : (
                  <Square
                    aria-hidden="true"
                    className="size-4"
                  />
                )}
                {allVisibleSelected
                  ? 'Désélectionner les résultats'
                  : 'Sélectionner les résultats'}
              </button>

              <span className="text-sm text-slate-600 dark:text-slate-300">
                {visibleItems.length} affiché(s) ·{' '}
                {selectedIds.length} sélectionné(s)
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <button
                type="button"
                disabled={
                  selectedIds.length === 0 || isBulkPending
                }
                onClick={() => void handleBulkRestore()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <RotateCcw
                  aria-hidden="true"
                  className="size-4"
                />
                Restaurer la sélection
              </button>

              <button
                type="button"
                disabled={
                  selectedIds.length === 0 || isBulkPending
                }
                onClick={() =>
                  setBulkConfirmation('delete-selected')
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-50 dark:border-red-900 dark:text-red-200"
              >
                <Trash2
                  aria-hidden="true"
                  className="size-4"
                />
                Supprimer la sélection
              </button>

              <button
                type="button"
                disabled={isBulkPending}
                onClick={handleManualArchive}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100"
              >
                <Download
                  aria-hidden="true"
                  className="size-4"
                />
                Exporter la corbeille
              </button>

              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">
                <FileUp
                  aria-hidden="true"
                  className="size-4"
                />
                Importer une archive
                <input
                  ref={archiveInputRef}
                  type="file"
                  accept="application/json,.json"
                  disabled={isBulkPending}
                  onChange={(event) =>
                    void handleArchiveImport(event)
                  }
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                disabled={isBulkPending}
                onClick={() => setBulkConfirmation('empty')}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Archive
                  aria-hidden="true"
                  className="size-4"
                />
                Vider la corbeille
              </button>
            </div>

            {bulkConfirmation ? (
              <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0"
                  />
                  <div>
                    <h2 className="font-semibold">
                      Confirmer la suppression définitive
                    </h2>
                    <p className="mt-1 text-sm leading-6">
                      {bulkConfirmation === 'empty'
                        ? `Les ${items.length} éléments seront d’abord archivés, puis retirés de la corbeille.`
                        : `Les ${selectedItems.length} éléments sélectionnés seront d’abord archivés, puis supprimés.`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={isBulkPending}
                    onClick={() =>
                      void (bulkConfirmation === 'empty'
                        ? handleEmptyTrash()
                        : handleBulkDelete())
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isBulkPending ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-4 animate-spin"
                      />
                    ) : (
                      <Trash2
                        aria-hidden="true"
                        className="size-4"
                      />
                    )}
                    Archiver et supprimer
                  </button>

                  <button
                    type="button"
                    disabled={isBulkPending}
                    onClick={() =>
                      setBulkConfirmation(undefined)
                    }
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-3 py-8 text-slate-600 dark:text-slate-300">
            <LoaderCircle
              aria-hidden="true"
              className="size-5 animate-spin"
            />
            Chargement de la corbeille…
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <Trash2
              aria-hidden="true"
              className="mx-auto size-8 text-slate-400"
            />
            <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
              La corbeille est vide
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Les prochaines données supprimées apparaîtront ici.
            </p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="py-10 text-center">
            <Search
              aria-hidden="true"
              className="mx-auto size-8 text-slate-400"
            />
            <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
              Aucun résultat
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Modifie la recherche ou le filtre pour retrouver
              d’autres éléments.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {visibleItems.map((item) => {
              const isPending = pendingId === item.id;
              const isConfirming =
                confirmDeleteId === item.id;
              const isSelected = selectedIds.includes(item.id);
              const remaining = daysRemaining(item.purgeAt);

              return (
                <li
                  key={item.id}
                  className={[
                    'rounded-2xl border p-4',
                    isSelected
                      ? 'border-brand-400 bg-brand-50/60 dark:border-brand-700 dark:bg-brand-950/20'
                      : 'border-slate-200 dark:border-slate-700',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(item.id)}
                      aria-label={`Sélectionner ${item.label}`}
                      className="mt-1 size-5 shrink-0 rounded border-slate-300"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {typeLabel(item)}
                      </p>
                      <h2 className="mt-1 font-semibold text-slate-950 dark:text-white">
                        {item.label}
                      </h2>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Supprimé le{' '}
                        <time dateTime={item.deletedAt}>
                          {formatDate(item.deletedAt)}
                        </time>
                        . Suppression automatique le{' '}
                        <time dateTime={item.purgeAt}>
                          {formatDate(item.purgeAt)}
                        </time>
                        {' · '}
                        {remaining > 1
                          ? `${remaining} jours restants`
                          : remaining === 1
                            ? '1 jour restant'
                            : 'expiration imminente'}
                        .
                      </p>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          disabled={
                            isPending || isBulkPending
                          }
                          onClick={() =>
                            void handleRestore(item)
                          }
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {isPending ? (
                            <LoaderCircle
                              aria-hidden="true"
                              className="size-4 animate-spin"
                            />
                          ) : (
                            <RotateCcw
                              aria-hidden="true"
                              className="size-4"
                            />
                          )}
                          Restaurer
                        </button>

                        {isConfirming ? (
                          <>
                            <button
                              type="button"
                              disabled={
                                isPending || isBulkPending
                              }
                              onClick={() =>
                                void handlePermanentDelete(item)
                              }
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              <AlertTriangle
                                aria-hidden="true"
                                className="size-4"
                              />
                              Archiver et confirmer
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                setConfirmDeleteId(undefined)
                              }
                              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100"
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              isPending || isBulkPending
                            }
                            onClick={() =>
                              setConfirmDeleteId(item.id)
                            }
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-60 dark:border-red-900 dark:text-red-200"
                          >
                            <Trash2
                              aria-hidden="true"
                              className="size-4"
                            />
                            Supprimer définitivement
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
        Les archives de corbeille sont distinctes des sauvegardes
        complètes SportPilot. Leur import replace les éléments dans
        la corbeille et renouvelle leur conservation pendant 30 jours.
      </p>
    </section>
  );
}
