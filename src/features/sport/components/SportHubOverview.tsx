import {
  Activity,
  Bike,
  CalendarDays,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  Layers3,
  PersonStanding,
  Play,
  Plus,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type {
  SportHubSnapshot,
} from '@/application/sport/sportHubService';
import { routePaths } from '@/app/routePaths';
import type { ActivityType } from '@/domain/models/activity';
import type { ActivityJournalNavigationState } from '@/features/activities/navigation/activityJournalNavigation';
import { presentActivity } from '@/features/activities/utils/activityPresentation';
import {
  sportActivityCreationPath,
  sportAgendaEntryPath,
} from '@/features/sport/sportHubNavigation';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate } from '@/shared/utils/dates';

interface SportHubOverviewProps {
  snapshot: SportHubSnapshot;
  navigationState: ActivityJournalNavigationState;
  onStart: () => void;
}

const activityChoices: Record<ActivityType, { label: string; icon: LucideIcon }> = {
  running: { label: 'Course', icon: PersonStanding },
  strengthTraining: { label: 'Musculation', icon: Dumbbell },
  walking: { label: 'Marche', icon: Footprints },
  cycling: { label: 'Vélo', icon: Bike },
  swimming: { label: 'Natation', icon: Waves },
  otherCardio: { label: 'Autre cardio', icon: HeartPulse },
};

function agendaStatusLabel(status: string): string {
  if (status === 'overdue') return 'En retard';
  if (status === 'today') return 'Aujourd’hui';
  if (status === 'inProgress') return 'En cours';
  return 'À venir';
}

export function SportHubOverview({
  snapshot,
  navigationState,
  onStart,
}: SportHubOverviewProps) {
  const latestPresentation = snapshot.latestActivity
    ? presentActivity(snapshot.latestActivity)
    : undefined;
  const currentSession = snapshot.currentSession;

  return (
    <div className="mt-5 space-y-4">
      <Card className="overflow-hidden border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4 dark:border-brand-900 dark:from-brand-950/50 dark:to-slate-900 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">
              Que vas-tu faire aujourd’hui ?
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Démarre rapidement ton activité
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Course, musculation, marche, vélo, natation ou autre cardio.
            </p>
          </div>
          <Button size="lg" className="w-full sm:w-auto" onClick={onStart}>
            <Play aria-hidden="true" className="size-5" />
            Démarrer une activité
          </Button>
        </div>
      </Card>

      {currentSession ? (
        <Card className="border-violet-300 p-4 dark:border-violet-800 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                <Dumbbell aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Séance en cours
                </p>
                <h2 className="mt-1 truncate text-lg font-bold text-slate-950 dark:text-white">
                  {currentSession.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Commencée le {formatLocalDate(currentSession.date)}
                </p>
              </div>
            </div>
            <Link
              to={sportAgendaEntryPath(currentSession)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 font-semibold text-white hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500"
            >
              <Play aria-hidden="true" className="size-4" />
              Reprendre
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5" aria-label="Programme sportif">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
                <CalendarDays aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">Programme</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Les prochaines séances à réaliser.
                </p>
              </div>
            </div>
            <Link
              to={routePaths.weeklyPlanning}
              className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
            >
              Planning
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          {snapshot.plannedEntries.length === 0 ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-950/50">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Aucune séance planifiée
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Planifie une séance ou démarre librement.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {snapshot.plannedEntries.map((entry) => (
                <li key={`${entry.source}-${entry.id}`}>
                  <Link
                    to={sportAgendaEntryPath(entry)}
                    className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {entry.source === 'strength' ? (
                        <Dumbbell aria-hidden="true" className="size-4" />
                      ) : (
                        <Activity aria-hidden="true" className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-950 dark:text-white">
                        {entry.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                        {agendaStatusLabel(entry.status)} · {formatLocalDate(entry.date)}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 sm:p-5" aria-label="Dernier entraînement">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200">
              <Clock3 aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">Dernier entraînement</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Ton activité la plus récente.
              </p>
            </div>
          </div>

          {snapshot.latestActivity && latestPresentation ? (
            <Link
              to={`${routePaths.activities}?date=${encodeURIComponent(snapshot.latestActivity.date)}`}
              className="mt-4 block rounded-xl border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-950 dark:text-white">
                    {latestPresentation.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {formatLocalDate(snapshot.latestActivity.date)} · {snapshot.latestActivity.durationMinutes} min
                  </p>
                </div>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-slate-400" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {latestPresentation.metrics.slice(0, 2).map((metric) => (
                  <span key={metric} className="rounded-lg bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {metric}
                  </span>
                ))}
              </div>
            </Link>
          ) : (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-950/50">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Aucun entraînement enregistré
              </p>
              <Button className="mt-3" size="sm" onClick={onStart}>
                <Plus aria-hidden="true" className="size-4" />
                Ajouter le premier
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Card role="group" className="p-4 sm:p-5" aria-label="Résumé de la semaine">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <Activity aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="font-bold text-slate-950 dark:text-white">Cette semaine</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Du {formatLocalDate(snapshot.week.startDate)} au {formatLocalDate(snapshot.week.endDate)}.
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Séances</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">
              {snapshot.week.activityCount}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Durée</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">
              {snapshot.week.totalDurationMinutes} min
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
            <dt className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Flame aria-hidden="true" className="size-3.5" /> Calories
            </dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">
              {Math.round(snapshot.week.totalCaloriesKcal)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Distance</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">
              {snapshot.week.distanceKm.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km
            </dd>
          </div>
        </dl>
        {snapshot.week.swimmingDistanceMeters > 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Natation : {snapshot.week.swimmingDistanceMeters.toLocaleString('fr-FR')} m.
          </p>
        ) : null}
      </Card>

      <Card role="group" className="p-4 sm:p-5" aria-label="Activités fréquentes">
        <div>
          <h2 className="font-bold text-slate-950 dark:text-white">Activités fréquentes</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            L’ordre s’adapte à ton historique.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {snapshot.activityTypeOrder.map((type) => {
            const choice = activityChoices[type];
            const Icon = choice.icon;
            return (
              <Link
                key={type}
                to={sportActivityCreationPath(type, snapshot.today)}
                state={navigationState}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:text-slate-100 dark:hover:border-brand-800 dark:hover:bg-brand-950/30"
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 text-brand-700 dark:text-brand-300" />
                {choice.label}
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 sm:p-5" aria-label="Accès musculation">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
            <Dumbbell aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="font-bold text-slate-950 dark:text-white">Musculation</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Séance libre, modèles, planning et exercices.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link to={routePaths.workoutSessions} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-700 px-3 text-sm font-semibold text-white hover:bg-violet-800">
            <Play aria-hidden="true" className="size-4" /> Carnet
          </Link>
          <Link to={routePaths.workoutTemplates} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
            <Layers3 aria-hidden="true" className="size-4" /> Modèles
          </Link>
          <Link to={routePaths.weeklyPlanning} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
            <CalendarDays aria-hidden="true" className="size-4" /> Planning
          </Link>
          <Link to={routePaths.strengthExercises} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
            <Dumbbell aria-hidden="true" className="size-4" /> Exercices
          </Link>
        </div>
      </Card>
    </div>
  );
}
