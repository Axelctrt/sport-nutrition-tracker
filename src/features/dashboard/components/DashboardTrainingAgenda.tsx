import {
  Activity,
  Bike,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Footprints,
  HeartPulse,
  Waves,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type {
  TrainingAgendaEntry,
} from '@/application/planning/trainingAgendaService';
import {
  routePaths,
  weeklyPlanningSessionPath,
} from '@/app/routePaths';
import type {
  PlannedEnduranceActivityType,
} from '@/domain/planning/endurancePlanningState';
import {
  useTrainingAgenda,
  type TrainingAgendaLoader,
} from '@/features/dashboard/hooks/useTrainingAgenda';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface DashboardTrainingAgendaProps {
  loadAgenda?: TrainingAgendaLoader;
  className?: string;
}

const activityIcons = {
  running: Activity,
  swimming: Waves,
  cycling: Bike,
  walking: Footprints,
  otherCardio: HeartPulse,
} satisfies Record<
  PlannedEnduranceActivityType,
  typeof Activity
>;

function activityPath(
  entry: TrainingAgendaEntry,
): string {
  if (entry.source === 'strength') {
    return weeklyPlanningSessionPath(
      entry.date,
      entry.id,
    );
  }

  const base =
    entry.activityType === 'running'
      ? routePaths.addRunningActivity
      : entry.activityType === 'swimming'
        ? routePaths.addSwimmingActivity
        : routePaths.addOtherActivity;
  const params = new URLSearchParams({
    date: entry.date,
  });

  if (entry.activityType) {
    params.set(
      'type',
      entry.activityType,
    );
  }

  return `${base}?${params.toString()}`;
}

function upcomingPlanningPath(
  today: string,
): string {
  const params = new URLSearchParams({
    date: today,
    section: 'upcoming',
  });

  return `${routePaths.weeklyPlanning}?${params.toString()}`;
}

function targetLabel(
  entry: TrainingAgendaEntry,
): string | undefined {
  const parts: string[] = [];

  if (entry.targetDurationMinutes) {
    parts.push(
      `${entry.targetDurationMinutes} min`,
    );
  }
  if (entry.targetDistanceKm) {
    parts.push(
      `${entry.targetDistanceKm} km`,
    );
  }
  if (entry.targetDistanceMeters) {
    parts.push(
      `${entry.targetDistanceMeters} m`,
    );
  }

  return parts.length > 0
    ? parts.join(' · ')
    : undefined;
}

function TodayEntry({
  entry,
}: {
  entry: TrainingAgendaEntry;
}) {
  const Icon =
    entry.source === 'strength'
      ? Dumbbell
      : activityIcons[
          entry.activityType ??
            'otherCardio'
        ];
  const target = targetLabel(entry);

  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300">
          <Icon
            aria-hidden="true"
            className="size-4"
          />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-950 dark:text-white">
            {entry.title}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {entry.source === 'strength'
              ? 'Musculation'
              : 'Endurance'}
            {target
              ? ` · ${target}`
              : ''}
          </p>
        </div>

        <Link
          to={activityPath(entry)}
          aria-label={`Ouvrir : ${entry.title}`}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronRight
            aria-hidden="true"
            className="size-5"
          />
        </Link>
      </div>
    </li>
  );
}

export function DashboardTrainingAgenda({
  loadAgenda,
  className = '',
}: DashboardTrainingAgendaProps) {
  const {
    status,
    agenda,
    errorMessage,
    refresh,
  } = useTrainingAgenda(loadAgenda);
  const todayEntries =
    agenda?.entries.filter(
      ({ status: entryStatus }) =>
        entryStatus === 'today',
    ) ?? [];

  return (
    <Card
      className={`p-4 sm:p-5 ${className}`}
      aria-label="Programme du jour"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
          <CalendarDays
            aria-hidden="true"
            className="size-5"
          />
        </span>

        <div>
          <h2 className="font-bold text-slate-950 dark:text-white">
            Aujourd’hui
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Les activités prévues pour la journée.
          </p>
        </div>
      </div>

      {status === 'loading' && !agenda ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Chargement du programme…
        </p>
      ) : null}

      {status === 'error' && !agenda ? (
        <InlineNotice
          className="mt-4"
          tone="error"
          title="Programme indisponible"
        >
          <p>{errorMessage}</p>
          <Button
            className="mt-3"
            size="sm"
            variant="secondary"
            onClick={() =>
              void refresh()
            }
          >
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {agenda ? (
        <>
          {todayEntries.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
              Aucune activité prévue aujourd’hui.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {todayEntries.map((entry) => (
                <TodayEntry
                  key={`${entry.source}-${entry.id}`}
                  entry={entry}
                />
              ))}
            </ul>
          )}

          <Link
            to={upcomingPlanningPath(
              agenda.today,
            )}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Voir les activités à venir
            <ChevronRight
              aria-hidden="true"
              className="size-5"
            />
          </Link>
        </>
      ) : null}
    </Card>
  );
}
