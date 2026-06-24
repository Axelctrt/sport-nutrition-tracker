import { CalendarDays, CircleAlert, Scale, Trash2, TrendingDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { calculateAndPersistDailyTarget } from '@/application/daily/dailyTargetCoordinator';
import { useProfile } from '@/app/providers/profile/useProfile';
import { WeightEntryForm } from '@/features/weight/components/WeightEntryForm';
import { WeightHistoryChart } from '@/features/weight/components/WeightHistoryChart';
import { useWeightHistory } from '@/features/weight/hooks/useWeightHistory';
import type { WeightEntryFormValues } from '@/features/weight/schemas/weightEntrySchema';
import { weightFormValuesToEntity } from '@/features/weight/utils';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';

export function WeightPage() {
  const { profile } = useProfile();
  const {
    status,
    entries,
    errorMessage,
    save,
    remove,
    getApplicableWeight,
  } = useWeightHistory();
  const [selectedDate, setSelectedDate] = useState(toLocalDate());
  const [feedback, setFeedback] = useState<
    { tone: 'success' | 'error'; message: string } | undefined
  >();

  const exactEntry = entries.find((entry) => entry.date === selectedDate);
  const applicableWeight = getApplicableWeight(selectedDate);
  const initialValues = useMemo<WeightEntryFormValues>(() => ({
    date: selectedDate,
    weightKg: exactEntry?.weightKg ?? applicableWeight.weightKg,
    note: exactEntry?.note ?? '',
  }), [applicableWeight.weightKg, exactEntry, selectedDate]);
  const descendingEntries = useMemo(
    () => [...entries].reverse(),
    [entries],
  );

  if (!profile) {
    return null;
  }

  const recalculateTarget = async () => {
    await calculateAndPersistDailyTarget(selectedDate, profile);
  };

  const handleSubmit = async (values: WeightEntryFormValues) => {
    setFeedback(undefined);

    try {
      await save(weightFormValuesToEntity(values));
      await recalculateTarget();
      setFeedback({
        tone: 'success',
        message: `La pesée du ${formatLocalDate(values.date)} a été enregistrée.`,
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
    setFeedback(undefined);

    try {
      await remove(selectedDate);
      await recalculateTarget();
      setFeedback({
        tone: 'success',
        message: `La pesée du ${formatLocalDate(selectedDate)} a été supprimée. Le calcul revient au dernier poids antérieur disponible.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'La pesée n’a pas pu être supprimée.',
      });
    }
  };

  return (
    <section aria-labelledby="weight-title">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Suivi quotidien
        </p>
        <h1 id="weight-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Poids
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          Une seule pesée est conservée par date. La dernière valeur disponible à la date calculée remplace le poids initial du profil.
        </p>
      </div>

      {feedback ? (
        <InlineNotice
          className="mt-6"
          tone={feedback.tone}
          title={feedback.tone === 'success' ? 'Historique mis à jour' : 'Modification impossible'}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      {status === 'error' ? (
        <InlineNotice className="mt-6" tone="error" title="Historique indisponible" role="alert">
          {errorMessage}
        </InlineNotice>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
              <Scale aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                Saisie quotidienne
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Création ou remplacement de la valeur du jour sélectionné
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="weight-selected-date" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Jour à modifier
            </label>
            <div className="relative mt-2">
              <CalendarDays
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400"
              />
              <input
                id="weight-selected-date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className={`${inputClassName} pl-10`}
              />
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
            <p className="font-semibold text-slate-900 dark:text-white">
              Poids applicable : {applicableWeight.weightKg.toLocaleString('fr-FR')} kg
            </p>
            <p className="mt-1 leading-5 text-slate-600 dark:text-slate-300">
              {applicableWeight.source === 'entry'
                ? `Issu de la pesée du ${formatLocalDate(applicableWeight.entry.date)}.`
                : 'Aucune pesée antérieure : utilisation du poids initial du profil.'}
            </p>
          </div>

          <div className="mt-6">
            <WeightEntryForm
              key={`${selectedDate}-${exactEntry?.updatedAt ?? 'new'}`}
              formId="weight-page-form"
              showDate={false}
              initialValues={initialValues}
              submitLabel={exactEntry ? 'Mettre à jour la pesée' : 'Ajouter la pesée'}
              onSubmit={handleSubmit}
            />
          </div>

          {exactEntry ? (
            <Button
              className="mt-3 w-full sm:w-auto"
              variant="danger"
              onClick={() => void handleDelete()}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Supprimer cette pesée
            </Button>
          ) : null}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 p-5 sm:p-6 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                <TrendingDown aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                  Historique des pesées
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {entries.length} {entries.length > 1 ? 'pesées enregistrées' : 'pesée enregistrée'}
                </p>
              </div>
            </div>
          </div>

          {entries.length > 0 ? (
            <WeightHistoryChart entries={entries} profile={profile} />
          ) : null}

          {status === 'loading' ? (
            <div className="p-6" role="status">
              <p className="text-slate-600 dark:text-slate-300">Chargement de l’historique…</p>
            </div>
          ) : descendingEntries.length === 0 ? (
            <div className="p-6 text-center">
              <CircleAlert aria-hidden="true" className="mx-auto size-8 text-slate-400" />
              <p className="mt-3 font-semibold text-slate-900 dark:text-white">Aucune pesée enregistrée</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Le poids initial du profil reste utilisé tant qu’aucune pesée n’est ajoutée.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Date</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Poids</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {descendingEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900 dark:text-white">
                        {formatLocalDate(entry.date)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 tabular-nums text-slate-700 dark:text-slate-200">
                        {entry.weightKg.toLocaleString('fr-FR')} kg
                      </td>
                      <td className="min-w-48 px-5 py-4 text-slate-600 dark:text-slate-300">
                        {entry.note ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
