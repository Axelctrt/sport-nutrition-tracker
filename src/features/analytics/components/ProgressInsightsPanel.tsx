import {
  Activity,
  ArrowRight,
  CalendarCheck,
  Dumbbell,
  Route,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { routePaths } from '@/app/routePaths';
import { formatPace } from '@/domain/calculations/running';
import type {
  DisciplineAdherence,
  PlanningAdherenceWeek,
} from '@/domain/analytics/progressInsights';
import type { LocalDate } from '@/domain/models/common';
import {
  useProgressInsights,
} from '@/features/analytics/hooks/useProgressInsights';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate } from '@/shared/utils/dates';

function formatPercent(value: number | undefined): string {
  return value === undefined ? '—' : `${value} %`;
}

function formatKilometers(value: number | undefined): string {
  return value === undefined
    ? 'distance non renseignée'
    : `${value.toLocaleString('fr-FR', {
        maximumFractionDigits: 2,
      })} km`;
}

function formatMeters(value: number | undefined): string {
  return value === undefined
    ? 'distance non renseignée'
    : `${value.toLocaleString('fr-FR')} m`;
}

function metric(
  label: string,
  value: string,
  description: string,
) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
        {value}
      </dd>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function aggregateDiscipline(
  weeks: readonly PlanningAdherenceWeek[],
  key: 'strength' | 'endurance',
): DisciplineAdherence {
  const plannedCount = weeks.reduce(
    (total, week) => total + week[key].plannedCount,
    0,
  );
  const completedCount = weeks.reduce(
    (total, week) => total + week[key].completedCount,
    0,
  );
  const skippedCount = weeks.reduce(
    (total, week) => total + week[key].skippedCount,
    0,
  );
  const pendingCount = weeks.reduce(
    (total, week) => total + week[key].pendingCount,
    0,
  );

  return {
    plannedCount,
    completedCount,
    skippedCount,
    pendingCount,
    ...(plannedCount > 0
      ? {
          adherencePercent: Math.round(
            (completedCount / plannedCount) * 100,
          ),
        }
      : {}),
  };
}

function disciplineLabel(
  label: string,
  adherence: DisciplineAdherence,
) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-950 dark:text-white">
          {label}
        </p>
        <p className="font-bold text-brand-700 dark:text-brand-300">
          {formatPercent(adherence.adherencePercent)}
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {adherence.completedCount} réalisée(s) sur {adherence.plannedCount} prévue(s)
      </p>
    </div>
  );
}

function WeeklyAdherenceList({
  weeks,
}: {
  weeks: readonly PlanningAdherenceWeek[];
}) {
  return (
    <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <summary className="cursor-pointer font-semibold text-slate-950 dark:text-white">
        Détail des 12 semaines
      </summary>
      <div className="mt-3 space-y-3">
        {weeks.map((week) => (
          <div
            className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"
            key={week.weekStart}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">
                  {week.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Du {formatLocalDate(week.weekStart)} au {formatLocalDate(week.weekEnd)}
                </p>
              </div>
              <p className="font-bold text-brand-700 dark:text-brand-300">
                {week.plannedCount === 0
                  ? 'Sans planning'
                  : formatPercent(week.adherencePercent)}
              </p>
            </div>

            {week.plannedCount > 0 ? (
              <>
                <div
                  aria-label={`Adhérence ${week.adherencePercent ?? 0} %`}
                  className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                >
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${week.adherencePercent ?? 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  {week.completedCount} réalisée(s) · {week.skippedCount} ignorée(s) ou abandonnée(s) · {week.pendingCount} encore prévue(s)
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                {week.recordedActivityCount > 0
                  ? `${week.recordedActivityCount} activité(s) libre(s) enregistrée(s).`
                  : 'Aucune activité ni planning enregistré.'}
              </p>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

export function ProgressInsightsPanel({
  referenceDate,
}: {
  referenceDate: LocalDate;
}) {
  const {
    data,
    status,
    errorMessage,
    refresh,
  } = useProgressInsights(referenceDate);

  if (status === 'loading') {
    return (
      <Card className="p-4 sm:p-5">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Calcul de l’adhérence et des records…
        </p>
      </Card>
    );
  }

  if (status === 'error' || !data) {
    return (
      <InlineNotice
        title="Indicateurs indisponibles"
        tone="error"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{errorMessage ?? 'Impossible de charger les indicateurs.'}</span>
          <button
            className="font-semibold underline"
            onClick={() => void refresh()}
            type="button"
          >
            Réessayer
          </button>
        </div>
      </InlineNotice>
    );
  }

  const {
    overall,
    trend,
    consistency,
    personalRecords,
  } = data;
  const trendText = trend.deltaPoints === undefined
    ? 'Pas assez de semaines planifiées closes pour comparer deux périodes.'
    : trend.deltaPoints === 0
      ? 'Adhérence stable entre les deux périodes.'
      : `${trend.deltaPoints > 0 ? '+' : ''}${trend.deltaPoints} points par rapport aux semaines précédentes.`;

  return (
    <section
      aria-label="Analyse de l’adhérence et des records"
      className="space-y-4"
    >
      <CollapsibleSection
        defaultOpen={false}
        description="Comparaison prévu/réalisé sur douze semaines. Les semaines sans planning ne sont pas considérées comme des échecs."
        icon={CalendarCheck}
        sectionId="analytics-planning-adherence"
        storageKey="sportpilot:analytics:planning-adherence"
        summary={formatPercent(overall.adherencePercent)}
        title="Adhérence au planning"
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metric(
            'Adhérence globale',
            formatPercent(overall.adherencePercent),
            `${overall.completedCount} séance(s) réalisée(s) sur ${overall.plannedCount} prévue(s).`,
          )}
          {metric(
            'Série active',
            `${consistency.currentActiveWeekStreak} sem.`,
            `Meilleure série : ${consistency.bestActiveWeekStreak} semaine(s).`,
          )}
          {metric(
            'Planning parfait',
            `${consistency.currentPerfectPlanningStreak} sem.`,
            `Record : ${consistency.bestPerfectPlanningStreak} semaine(s) closes à 100 %.`,
          )}
          {metric(
            'Tendance récente',
            formatPercent(trend.recentPercent),
            trendText,
          )}
        </dl>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {disciplineLabel(
            'Musculation',
            aggregateDiscipline(data.weeks, 'strength'),
          )}
          {disciplineLabel(
            'Endurance',
            aggregateDiscipline(data.weeks, 'endurance'),
          )}
        </div>

        <div className="mt-4">
          <WeeklyAdherenceList weeks={data.weeks} />
        </div>

        <Link
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
          to={routePaths.weeklyPlanning}
        >
          Ouvrir le planning sportif
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </CollapsibleSection>

      <CollapsibleSection
        defaultOpen={false}
        description="Recalculés à partir de toutes les activités présentes dans SportPilot."
        icon={Trophy}
        sectionId="analytics-personal-records"
        storageKey="sportpilot:analytics:personal-records"
        summary="Tous temps"
        title="Records personnels"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <Route aria-hidden="true" className="size-5 text-orange-600" />
            <p className="mt-2 font-semibold text-slate-950 dark:text-white">
              Course
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Plus longue : {personalRecords.running.longest
                ? `${personalRecords.running.longest.value.toLocaleString('fr-FR')} km`
                : '—'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Meilleure allure : {personalRecords.running.fastestPace
                ? `${formatPace(personalRecords.running.fastestPace.value)} min/km sur ${formatKilometers(personalRecords.running.fastestPace.activity.distanceKm)}`
                : '—'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <Activity aria-hidden="true" className="size-5 text-cyan-600" />
            <p className="mt-2 font-semibold text-slate-950 dark:text-white">
              Natation
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Plus longue : {personalRecords.swimming.longest
                ? `${personalRecords.swimming.longest.value.toLocaleString('fr-FR')} m`
                : '—'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Meilleure allure : {personalRecords.swimming.fastestPace
                ? `${formatPace(personalRecords.swimming.fastestPace.value)} min/100 m sur ${formatMeters(personalRecords.swimming.fastestPace.activity.distanceMeters)}`
                : '—'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <Route aria-hidden="true" className="size-5 text-emerald-600" />
            <p className="mt-2 font-semibold text-slate-950 dark:text-white">
              Vélo
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Plus longue : {personalRecords.cycling.longest
                ? `${personalRecords.cycling.longest.value.toLocaleString('fr-FR')} km`
                : '—'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Meilleure vitesse : {personalRecords.cycling.fastestSpeed
                ? `${personalRecords.cycling.fastestSpeed.value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h sur ${formatKilometers(personalRecords.cycling.fastestSpeed.activity.distanceKm)}`
                : '—'}
            </p>
          </div>
        </div>

        {consistency.bestAdherenceWeek ? (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Meilleure semaine planifiée : <strong>{consistency.bestAdherenceWeek.label}</strong> avec {formatPercent(consistency.bestAdherenceWeek.adherencePercent)} et {consistency.bestAdherenceWeek.completedCount} séance(s) réalisée(s).
          </p>
        ) : (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Planifie puis réalise des séances pour faire apparaître un record d’adhérence.
          </p>
        )}

        <Link
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          to={routePaths.strengthExercises}
        >
          <Dumbbell aria-hidden="true" className="size-4" />
          Consulter les records de musculation
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </CollapsibleSection>
    </section>
  );
}
