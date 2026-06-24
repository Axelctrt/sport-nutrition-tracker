import { CalendarDays, Dumbbell, Flame, Layers3, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { editActivityPath, routePaths } from '@/app/routePaths';
import { useActivityJournal } from '@/features/activities/hooks/useActivityJournal';
import { presentActivity } from '@/features/activities/utils/activityPresentation';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

export function ActivityJournalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedDate = searchParams.get('date') ?? '';
  const date = isValidLocalDate(requestedDate) ? requestedDate : toLocalDate();
  const { activities, status, errorMessage, deletingId, refresh, remove } = useActivityJournal(date);
  const totalDuration = activities.reduce((sum, activity) => sum + activity.durationMinutes, 0);
  const totalCalories = activities.reduce((sum, activity) => sum + presentActivity(activity).caloriesKcal, 0);

  const changeDate = (nextDate: string) => {
    setSearchParams({ date: nextDate });
  };

  const confirmDelete = async (activityId: string, title: string) => {
    if (window.confirm(`Supprimer « ${title} » ? Cette action est définitive.`)) {
      await remove(activityId);
    }
  };

  return (
    <section aria-labelledby="activity-journal-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Suivi sportif</p>
          <h1 id="activity-journal-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Journal des activités</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            Consulte, corrige ou supprime les séances enregistrées. Chaque modification recalcule automatiquement les objectifs de la journée.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            to={routePaths.workoutTemplates}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Layers3 aria-hidden="true" className="size-5" />
            Séances modèles
          </Link>
          <Link
            to={routePaths.strengthExercises}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Dumbbell aria-hidden="true" className="size-5" />
            Catalogue d’exercices
          </Link>
          <Link
            to={routePaths.addActivity}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white shadow-sm hover:bg-brand-800"
          >
            <Plus aria-hidden="true" className="size-5" />
            Ajouter une activité
          </Link>
        </div>
      </div>

      <Card className="mt-8 p-5 sm:p-6">
        <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <div className="min-w-0">
            <label htmlFor="activity-journal-date" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Journée consultée</label>
            <input
              id="activity-journal-date"
              type="date"
              value={date}
              onChange={(event) => changeDate(event.target.value)}
              className={`${inputClassName} mt-2`}
            />
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Temps sportif</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">{totalDuration} min</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Calories retenues</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">{Math.round(totalCalories)} kcal</p>
          </div>
        </div>
      </Card>

      {errorMessage ? (
        <InlineNotice className="mt-6" tone="error" title="Journal indisponible" role="alert">
          <p>{errorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button>
        </InlineNotice>
      ) : null}

      {status === 'loading' ? (
        <Card className="mt-6 p-8 text-center" role="status">
          <LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" />
          <p className="mt-3 font-semibold text-slate-900 dark:text-white">Chargement des activités…</p>
        </Card>
      ) : null}

      {status === 'ready' && activities.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <CalendarDays aria-hidden="true" className="mx-auto size-10 text-slate-400" />
          <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Aucune activité le {formatLocalDate(date)}</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Ajoute une séance pour alimenter la dépense énergétique et les analyses futures.</p>
          <Link to={routePaths.addActivity} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 font-semibold text-white hover:bg-brand-800">
            <Plus aria-hidden="true" className="size-4" />
            Ajouter une activité
          </Link>
        </Card>
      ) : null}

      {status === 'ready' && activities.length > 0 ? (
        <div className="mt-6 space-y-4">
          {activities.map((activity) => {
            const presentation = presentActivity(activity);
            return (
              <Card key={activity.id} className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{presentation.title}</h2>
                      {activity.time ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{activity.time}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-medium text-brand-700 dark:text-brand-300">{presentation.subtitle}</p>
                    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Données de la séance">
                      {presentation.metrics.map((metric) => (
                        <li key={metric} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">{metric}</li>
                      ))}
                    </ul>
                    {activity.notes ? <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{activity.notes}</p> : null}
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                    <div className="rounded-xl bg-orange-50 px-4 py-3 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Flame aria-hidden="true" className="size-4" />
                        {Math.round(presentation.caloriesKcal)} kcal
                      </div>
                      <p className="mt-1 text-xs opacity-80">{presentation.usesManualCalories ? 'Correction manuelle' : 'Estimation'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={editActivityPath(activity.id)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                        Modifier
                      </Link>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={deletingId === activity.id}
                        onClick={() => void confirmDelete(activity.id, presentation.title)}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        {deletingId === activity.id ? 'Suppression…' : 'Supprimer'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <InlineNotice className="mt-6" title="Dépenses estimées">
        Les calories calculées servent au pilotage quotidien. Elles ne constituent pas une mesure physiologique exacte et peuvent être corrigées manuellement séance par séance.
      </InlineNotice>
    </section>
  );
}
