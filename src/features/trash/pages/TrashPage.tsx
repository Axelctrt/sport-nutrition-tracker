import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  LoaderCircle,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import type { TrashItem } from '@/domain/models/trash';
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

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
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
  }
}

export function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>();
  const [feedback, setFeedback] = useState<Feedback>();

  const loadItems = useCallback(async () => {
    setIsLoading(true);

    try {
      await purgeExpiredTrashItems(appDatabase);
      setItems(await listTrashItems(appDatabase));
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
      await deleteTrashItemPermanently(appDatabase, item.id);
      setConfirmDeleteId(undefined);
      setFeedback({
        tone: 'info',
        message: `${item.label} a été supprimé définitivement.`,
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
              Les données supprimées restent restaurables pendant 30 jours.
              Elles ne participent plus aux calculs tant qu’elles se trouvent
              ici.
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
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const isPending = pendingId === item.id;
              const isConfirming = confirmDeleteId === item.id;

              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
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
                        .
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => void handleRestore(item)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                          disabled={isPending}
                          onClick={() =>
                            void handlePermanentDelete(item)
                          }
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <AlertTriangle
                            aria-hidden="true"
                            className="size-4"
                          />
                          Confirmer la suppression
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setConfirmDeleteId(undefined)}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40"
                      >
                        <Trash2
                          aria-hidden="true"
                          className="size-4"
                        />
                        Supprimer définitivement
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
        La corbeille protège maintenant les activités, les pesées, le journal
        alimentaire, les repas favoris et les recettes. La musculation sera
        raccordée dans un lot dédié.
      </p>
    </section>
  );
}
