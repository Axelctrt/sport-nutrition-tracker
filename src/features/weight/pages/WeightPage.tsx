import { CalendarDays, Scale, Trash2, TrendingDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { calculateAndPersistDailyTarget } from '@/application/daily/dailyTargetCoordinator';
import { useProfile } from '@/app/providers/profile/useProfile';
import type { WeightEntry } from '@/domain/models/weight';
import { WeightEntryForm } from '@/features/weight/components/WeightEntryForm';
import { WeightHistoryChart } from '@/features/weight/components/WeightHistoryChart';
import { WeightHistoryEntryCard } from '@/features/weight/components/WeightHistoryEntryCard';
import { WeightSummary } from '@/features/weight/components/WeightSummary';
import { useWeightHistory } from '@/features/weight/hooks/useWeightHistory';
import type { WeightEntryFormValues } from '@/features/weight/schemas/weightEntrySchema';
import { weightFormValuesToEntity } from '@/features/weight/utils';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';

function isLocalDate(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function WeightPage() {
  const { profile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedDate = searchParams.get('date');
  const {
    status,
    entries,
    errorMessage,
    refresh,
    save,
    remove,
    getApplicableWeight,
  } = useWeightHistory();
  const [selectedDate, setSelectedDate] = useState(
    isLocalDate(requestedDate) ? requestedDate : toLocalDate(),
  );
  const [feedback, setFeedback] = useState<
    { tone: 'success' | 'error'; message: string } | undefined
  >();
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<WeightEntry>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [highlightedEntryId, setHighlightedEntryId] = useState<string>();
  const highlightTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (isLocalDate(requestedDate) && requestedDate !== selectedDate) {
      setSelectedDate(requestedDate);
    }
  }, [requestedDate, selectedDate]);

  useEffect(() => () => {
    if (highlightTimerRef.current !== undefined) {
      window.clearTimeout(highlightTimerRef.current);
    }
  }, []);

  const exactEntry = entries.find((entry) => entry.date === selectedDate);
  const applicableWeight = getApplicableWeight(selectedDate);
  const initialValues = useMemo<WeightEntryFormValues>(() => ({
    date: selectedDate,
    weightKg: exactEntry?.weightKg ?? applicableWeight.weightKg,
    note: exactEntry?.note ?? '',
  }), [applicableWeight.weightKg, exactEntry, selectedDate]);
  const descendingEntries = useMemo(
    () => [...entries].sort((left, right) => right.date.localeCompare(left.date)),
    [entries],
  );
  const previousWeightById = useMemo(() => {
    const ordered = [...entries].sort((left, right) => left.date.localeCompare(right.date));
    return new Map(ordered.map((entry, index) => [entry.id, ordered[index - 1]?.weightKg]));
  }, [entries]);

  if (!profile) {
    return null;
  }

  const selectDate = (date: string, scrollToForm = false) => {
    setSelectedDate(date);
    setFeedback(undefined);
    setSearchParams({ date }, { replace: true });
    if (scrollToForm) {
      window.requestAnimationFrame(() => {
        document.getElementById('weight-entry-panel')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    }
  };

  const highlightEntry = (entryId: string) => {
    if (highlightTimerRef.current !== undefined) {
      window.clearTimeout(highlightTimerRef.current);
    }
    setHighlightedEntryId(entryId);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedEntryId(undefined);
      highlightTimerRef.current = undefined;
    }, 2_500);
  };

  const recalculateTarget = async (date: string) => {
    await calculateAndPersistDailyTarget(date, profile);
  };

  const handleSubmit = async (values: WeightEntryFormValues) => {
    setFeedback(undefined);

    try {
      const saved = await save(weightFormValuesToEntity(values));
      await recalculateTarget(values.date);
      highlightEntry(saved.id);
      setFeedback({
        tone: 'success',
        message: `La pesée du ${formatLocalDate(values.date)} a été enregistrée sans recharger la page.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'La pesée n’a pas pu être enregistrée.',
      });
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteEntry) return;
    setFeedback(undefined);
    setIsDeleting(true);

    try {
      await remove(pendingDeleteEntry.date);
      await recalculateTarget(pendingDeleteEntry.date);
      setFeedback({
        tone: 'success',
        message: `La pesée du ${formatLocalDate(pendingDeleteEntry.date)} a été supprimée. Le dernier poids antérieur disponible sera utilisé.`,
      });
      setPendingDeleteEntry(undefined);
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'La pesée n’a pas pu être supprimée.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="min-w-0" aria-labelledby="weight-title">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Suivi quotidien
        </p>
        <h1 id="weight-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Poids
        </h1>
        <p className="mt-2 hidden max-w-3xl text-slate-600 dark:text-slate-300 sm:block">
          Enregistre une pesée, consulte la moyenne mobile et compare-la à la trajectoire définie par ton profil.
        </p>
      </div>

      {feedback ? (
        <InlineNotice
          className="mt-5"
          tone={feedback.tone}
          title={feedback.tone === 'success' ? 'Historique mis à jour' : 'Modification impossible'}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      {status === 'error' ? (
        <InlineNotice className="mt-5" tone="error" title="Historique indisponible" role="alert">
          <p>{errorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {status === 'loading' ? <PageSkeleton className="mt-5" variant="detail" /> : null}

      {status === 'ready' ? (
        <>
          <WeightSummary entries={entries} profile={profile} />

          <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,400px)_1fr]">
            <Card id="weight-entry-panel" className="min-w-0 scroll-mt-24 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                  <Scale aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-950 dark:text-white">Pesée du jour sélectionné</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {exactEntry ? 'Modifier la valeur existante' : 'Ajouter une nouvelle valeur'}
                  </p>
                </div>
              </div>

              <div className="mt-5 min-w-0">
                <label htmlFor="weight-selected-date" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Journée
                </label>
                <div className="relative mt-2 min-w-0 max-w-full">
                  <CalendarDays
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="weight-selected-date"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => selectDate(event.target.value)}
                    className={`${inputClassName} pl-10`}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-950/70">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Poids applicable : {applicableWeight.weightKg.toLocaleString('fr-FR')} kg
                </p>
                <p className="mt-1 leading-5 text-slate-600 dark:text-slate-300">
                  {applicableWeight.source === 'entry'
                    ? `Dernière pesée disponible le ${formatLocalDate(applicableWeight.entry.date)}.`
                    : 'Aucune pesée antérieure : le poids initial du profil est utilisé.'}
                </p>
              </div>

              <div className="mt-5">
                <WeightEntryForm
                  key={`${selectedDate}-${exactEntry?.updatedAt ?? 'new'}`}
                  formId="weight-page-form"
                  showDate={false}
                  collapseNote
                  initialValues={initialValues}
                  submitLabel={exactEntry ? 'Mettre à jour la pesée' : 'Ajouter la pesée'}
                  onSubmit={handleSubmit}
                />
              </div>

              {exactEntry ? (
                <Button
                  className="mt-2 w-full lg:w-auto"
                  variant="dangerGhost"
                  onClick={() => setPendingDeleteEntry(exactEntry)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Supprimer cette pesée
                </Button>
              ) : null}
            </Card>

            <Card className="min-w-0 overflow-hidden">
              <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                    <TrendingDown aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-950 dark:text-white">Historique des pesées</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Appuie sur une pesée pour la modifier
                    </p>
                  </div>
                </div>
              </div>

              {entries.length > 0 ? <WeightHistoryChart entries={entries} profile={profile} /> : null}

              {descendingEntries.length === 0 ? (
                <EmptyState
                  className="m-4 border-0 shadow-none sm:m-5"
                  icon={Scale}
                  title="Aucune pesée enregistrée"
                  description="Le poids initial du profil reste utilisé tant qu’aucune pesée n’est ajoutée."
                  primaryAction={(
                    <Button onClick={() => selectDate(toLocalDate(), true)}>
                      Ajouter la pesée du jour
                    </Button>
                  )}
                />
              ) : (
                <div className="space-y-3 p-4 sm:p-5">
                  {descendingEntries.map((entry) => (
                    <WeightHistoryEntryCard
                      key={entry.id}
                      entry={entry}
                      previousWeightKg={previousWeightById.get(entry.id)}
                      selected={entry.date === selectedDate}
                      highlighted={entry.id === highlightedEntryId}
                      deleting={isDeleting && pendingDeleteEntry?.id === entry.id}
                      onEdit={(selectedEntry) => selectDate(selectedEntry.date, true)}
                      onDelete={setPendingDeleteEntry}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      ) : null}

      <ConfirmationDialog
        open={Boolean(pendingDeleteEntry)}
        title="Supprimer cette pesée ?"
        description={pendingDeleteEntry
          ? `La pesée du ${formatLocalDate(pendingDeleteEntry.date)} (${pendingDeleteEntry.weightKg.toLocaleString('fr-FR')} kg) sera supprimée définitivement.`
          : ''}
        confirmLabel="Supprimer"
        tone="danger"
        isPending={isDeleting}
        onCancel={() => setPendingDeleteEntry(undefined)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
