import {
  Activity,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  History,
  Layers3,
  LibraryBig,
  ListChecks,
  Play,
  Plus,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { SportHubSnapshot } from '@/application/sport/sportHubService';
import { routePaths } from '@/app/routePaths';
import type { ActivityJournalNavigationState } from '@/features/activities/navigation/activityJournalNavigation';
import { presentActivity } from '@/features/activities/utils/activityPresentation';
import { sportAgendaEntryPath } from '@/features/sport/sportHubNavigation';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate } from '@/shared/utils/dates';

interface SportHubOverviewProps {
  snapshot: SportHubSnapshot;
  navigationState: ActivityJournalNavigationState;
  onRecord: () => void;
}

function todayStatusLabel(status: string): string {
  if (status === 'inProgress') return 'En cours';
  if (status === 'overdue') return 'À replanifier';
  return 'Prévue';
}

export function SportHubOverview({
  snapshot,
  navigationState,
  onRecord,
}: SportHubOverviewProps) {
  const [programsOpen, setProgramsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const todayPlannedEntries = snapshot.plannedEntries.filter(
    (entry) => entry.date === snapshot.today || entry.status === 'overdue',
  );
  const todayActivities = snapshot.recentActivities.filter(
    (activity) => activity.date === snapshot.today,
  );

  return (
    <div className="mt-5 space-y-6">
      <section aria-labelledby="sport-today-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Aujourd’hui
            </p>
            <h2 id="sport-today-title" className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Ma journée sportive
            </h2>
          </div>
          <Link
            to={`${routePaths.weeklyPlanning}?date=${encodeURIComponent(snapshot.today)}&section=upcoming`}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            <Plus aria-hidden="true" className="size-4" />
            Prévoir
          </Link>
        </div>

        <Card className="mt-3 overflow-hidden">
          {snapshot.currentSession ? (
            <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                <Dumbbell aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-950 dark:text-white">
                  {snapshot.currentSession.title}
                </p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">En cours</p>
              </div>
              <Link
                to={sportAgendaEntryPath(snapshot.currentSession)}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-violet-700 px-3 text-sm font-semibold text-white hover:bg-violet-800"
              >
                <Play aria-hidden="true" className="size-4" />
                Reprendre
              </Link>
            </div>
          ) : null}

          {todayPlannedEntries.map((entry) => (
            <div
              key={`${entry.source}-${entry.id}`}
              className="flex items-center gap-3 border-b border-slate-200 p-4 last:border-b-0 dark:border-slate-800"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {entry.source === 'strength'
                  ? <Dumbbell aria-hidden="true" className="size-5" />
                  : <Activity aria-hidden="true" className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-950 dark:text-white">{entry.title}</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {todayStatusLabel(entry.status)}
                  {'targetDurationMinutes' in entry && entry.targetDurationMinutes
                    ? ` · ${entry.targetDurationMinutes} min`
                    : ''}
                </p>
              </div>
              <Link
                to={sportAgendaEntryPath(entry)}
                state={navigationState}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Play aria-hidden="true" className="size-4" />
                Démarrer
              </Link>
            </div>
          ))}

          {todayActivities.map((activity) => {
            const presentation = presentActivity(activity);
            return (
              <Link
                key={activity.id}
                to={`${routePaths.activities}?view=history&date=${encodeURIComponent(activity.date)}`}
                className="flex min-h-16 items-center gap-3 border-b border-slate-200 p-4 last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  <ListChecks aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-950 dark:text-white">{presentation.title}</span>
                  <span className="mt-0.5 block text-sm text-emerald-700 dark:text-emerald-300">
                    Terminée · {activity.durationMinutes} min
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
              </Link>
            );
          })}

          {!snapshot.currentSession && todayPlannedEntries.length === 0 && todayActivities.length === 0 ? (
            <div className="p-5 text-center">
              <p className="font-semibold text-slate-900 dark:text-white">Aucune activité aujourd’hui</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Prévois une séance ou enregistre une activité déjà réalisée.
              </p>
            </div>
          ) : null}

          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={onRecord}>
              Enregistrer une activité déjà réalisée
            </Button>
          </div>
        </Card>
      </section>

      <section aria-labelledby="sport-organize-title">
        <h2 id="sport-organize-title" className="text-xl font-bold text-slate-950 dark:text-white">Organiser</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
            onClick={() => setProgramsOpen(true)}
          >
            <Layers3 aria-hidden="true" className="size-5 shrink-0 text-brand-700 dark:text-brand-300" />
            <span className="font-semibold text-slate-950 dark:text-white">Mes programmes</span>
          </button>
          <Link
            to={routePaths.weeklyPlanning}
            className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
          >
            <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-brand-700 dark:text-brand-300" />
            <span className="font-semibold text-slate-950 dark:text-white">Planification</span>
          </Link>
          <button
            type="button"
            className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
            onClick={() => setLibraryOpen(true)}
          >
            <LibraryBig aria-hidden="true" className="size-5 shrink-0 text-brand-700 dark:text-brand-300" />
            <span className="font-semibold text-slate-950 dark:text-white">Bibliothèque sportive</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="sport-recent-title">
        <div className="flex items-end justify-between gap-3">
          <h2 id="sport-recent-title" className="text-xl font-bold text-slate-950 dark:text-white">
            Dernières activités
          </h2>
          <Link
            to={`${routePaths.activities}?view=history&date=${encodeURIComponent(snapshot.today)}`}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            Voir tout l’historique
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <Card className="mt-3 overflow-hidden">
          {snapshot.recentActivities.length > 0 ? (
            snapshot.recentActivities.map((activity) => {
              const presentation = presentActivity(activity);
              return (
                <Link
                  key={activity.id}
                  to={`${routePaths.activities}?view=history&date=${encodeURIComponent(activity.date)}`}
                  className="flex min-h-16 items-center gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                >
                  <Activity aria-hidden="true" className="size-5 shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-950 dark:text-white">{presentation.title}</span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">
                      {formatLocalDate(activity.date)} · {activity.durationMinutes} min
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
                </Link>
              );
            })
          ) : (
            <p className="p-5 text-center text-sm text-slate-500 dark:text-slate-400">
              Aucune activité enregistrée.
            </p>
          )}
        </Card>
      </section>

      <BottomSheet
        open={programsOpen}
        title="Mes programmes"
        description="Choisis le type de modèles à organiser."
        onClose={() => setProgramsOpen(false)}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to={routePaths.workoutTemplates}
            className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-brand-300 dark:border-slate-800 dark:hover:border-brand-700"
            onClick={() => setProgramsOpen(false)}
          >
            <Dumbbell aria-hidden="true" className="size-5 shrink-0 text-violet-700 dark:text-violet-300" />
            <span>
              <span className="block font-semibold text-slate-950 dark:text-white">Musculation</span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">Modèles de séances</span>
            </span>
          </Link>
          <Link
            to={routePaths.enduranceTemplates}
            className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-brand-300 dark:border-slate-800 dark:hover:border-brand-700"
            onClick={() => setProgramsOpen(false)}
          >
            <Activity aria-hidden="true" className="size-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
            <span>
              <span className="block font-semibold text-slate-950 dark:text-white">Endurance</span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">Course, vélo, natation et cardio</span>
            </span>
          </Link>
        </div>
      </BottomSheet>

      <BottomSheet
        open={libraryOpen}
        title="Bibliothèque sportive"
        description="Retrouve les exercices et les historiques détaillés."
        onClose={() => setLibraryOpen(false)}
      >
        <nav className="space-y-2" aria-label="Bibliothèque sportive">
          {[
            { path: routePaths.strengthExercises, label: 'Exercices', icon: BookOpen },
            { path: routePaths.workoutSessions, label: 'Historique de musculation', icon: Dumbbell },
            {
              path: `${routePaths.activities}?view=history&date=${encodeURIComponent(snapshot.today)}`,
              label: 'Historique complet des activités',
              icon: History,
            },
          ].map((destination) => {
            const Icon = destination.icon;
            return (
              <Link
                key={destination.path}
                to={destination.path}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 px-3 hover:border-brand-300 dark:border-slate-800 dark:hover:border-brand-700"
                onClick={() => setLibraryOpen(false)}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0 text-brand-700 dark:text-brand-300" />
                <span className="font-semibold text-slate-950 dark:text-white">{destination.label}</span>
              </Link>
            );
          })}
        </nav>
      </BottomSheet>
    </div>
  );
}
