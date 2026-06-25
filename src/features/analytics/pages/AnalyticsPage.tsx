import {
  Activity,
  Apple,
  CalendarRange,
  Footprints,
  History,
  Scale,
  Waves,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { routePaths } from '@/app/routePaths';
import { useProfile } from '@/app/providers/profile/useProfile';
import { formatPace } from '@/domain/calculations/running';
import type { ActivityType } from '@/domain/models/activity';
import { AnalyticsMetric } from '@/features/analytics/components/AnalyticsMetric';
import { useTwelveWeekAnalytics } from '@/features/analytics/hooks/useTwelveWeekAnalytics';
import { activityTypeLabels } from '@/features/activities/utils/activityLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { ChartCard } from '@/shared/charts/ChartCard';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';

const COLORS = {
  running: '#ea580c',
  swimming: '#0891b2',
  nutrition: '#059669',
  nutritionTarget: '#64748b',
  weight: '#7c3aed',
  target: '#475569',
  activity: '#d97706',
  steps: '#2563eb',
} as const;

const ACTIVITY_COLORS = ['#ea580c', '#0891b2', '#7c3aed', '#2563eb', '#059669', '#d97706'];

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (hours === 0) return `${remaining} min`;
  return `${hours} h ${remaining.toString().padStart(2, '0')}`;
}

function formatOptionalPace(seconds: number | undefined): string {
  return seconds === undefined ? '—' : `${formatPace(seconds)} min`;
}

export function AnalyticsPage() {
  const { profile } = useProfile();
  const [referenceDate, setReferenceDate] = useState(toLocalDate());
  const { data, status, errorMessage } = useTwelveWeekAnalytics(referenceDate, profile);

  const summary = useMemo(() => {
    if (!data) return undefined;
    const runningDistance = sum(data.running.map((week) => week.distanceKm));
    const swimmingDistance = sum(data.swimming.map((week) => week.distanceMeters));
    const nutritionWeeks = data.nutrition.filter((week) => (
      week.calorieAdherencePercent !== undefined && week.trackedDayCount > 0
    ));
    const trackedNutritionDays = sum(nutritionWeeks.map((week) => week.trackedDayCount));
    const calorieAdherence = trackedNutritionDays === 0
      ? undefined
      : sum(nutritionWeeks.map((week) => (
          (week.calorieAdherencePercent ?? 0) * week.trackedDayCount
        ))) / trackedNutritionDays;
    const latestWeight = [...data.weight.weekly].reverse().find((week) => week.averageWeightKg !== undefined);
    return { runningDistance, swimmingDistance, calorieAdherence, latestWeight };
  }, [data]);

  const runningChartData = data?.running.map((week) => ({
    week: week.label,
    kilometres: week.distanceKm,
    minutes: week.durationMinutes,
    allure: week.weightedPaceSecondsPerKm,
  })) ?? [];

  const swimmingChartData = data?.swimming.map((week) => ({
    week: week.label,
    distanceKm: week.distanceMeters / 1000,
    minutes: week.durationMinutes,
    allure: week.weightedPaceSecondsPer100m,
  })) ?? [];

  const nutritionChartData = data?.nutrition.map((week) => ({
    week: week.label,
    calories: week.averageConsumedCaloriesKcal,
    cibleCalories: week.averageTargetCaloriesKcal,
    proteines: week.averageConsumedProteinGrams,
    cibleProteines: week.averageTargetProteinGrams,
  })) ?? [];

  const activityChartData = data?.activity.map((week) => ({
    week: week.label,
    pas: week.averageSteps,
    minutes: week.totalSportMinutes,
  })) ?? [];

  const weightChartData = data?.weight.weekly.map((week) => ({
    week: week.label,
    poids: week.averageWeightKg,
    cible: week.targetWeightKg,
    pesees: week.weighInCount,
  })) ?? [];

  const activityPieData = data?.activityBreakdown.map((item) => ({
    name: activityTypeLabels[item.type],
    value: item.durationMinutes,
    type: item.type,
  })) ?? [];

  if (!profile) return null;

  return (
    <section aria-labelledby="analytics-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Pilotage sur 12 semaines
          </p>
          <h1 id="analytics-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Analyses
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            Les moyennes sont pondérées lorsqu’une distance est disponible. Les semaines sans donnée restent visibles afin de préserver une lecture chronologique fiable.
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
          <div className="min-w-0">
            <label htmlFor="analytics-reference-date" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Semaine de référence
            </label>
            <input
              id="analytics-reference-date"
              type="date"
              value={referenceDate}
              onChange={(event) => setReferenceDate(event.target.value)}
              className={`${inputClassName} mt-2`}
            />
          </div>
          <Link
            to={routePaths.history}
            className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <History aria-hidden="true" className="size-4" />
            Historique détaillé
          </Link>
        </div>
      </div>

      {status === 'error' ? (
        <InlineNotice className="mt-6" tone="error" title="Analyses indisponibles" role="alert">
          {errorMessage}
        </InlineNotice>
      ) : null}

      {status === 'loading' || !data || !summary ? (
        <div className="mt-8 py-16 text-center" role="status">
          <p className="font-semibold text-slate-700 dark:text-slate-200">Calcul des analyses…</p>
        </div>
      ) : (
        <>
          <InlineNotice className="mt-6" tone="info" title="Période analysée">
            Du {formatLocalDate(data.from)} au {formatLocalDate(data.to)}. Les données absentes ne sont jamais inventées ou interpolées.
          </InlineNotice>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsMetric
              label="Course"
              value={`${summary.runningDistance.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`}
              detail={`${sum(data.running.map((week) => week.sessionCount))} séances sur la période`}
              icon={Footprints}
              tone="orange"
            />
            <AnalyticsMetric
              label="Natation"
              value={`${(summary.swimmingDistance / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`}
              detail={`${sum(data.swimming.map((week) => week.sessionCount))} séances sur la période`}
              icon={Waves}
              tone="cyan"
            />
            <AnalyticsMetric
              label="Adhérence calorique"
              value={summary.calorieAdherence === undefined ? '—' : `${Math.round(summary.calorieAdherence)} %`}
              detail="Jours suivis dans une marge de ±10 % de la cible"
              icon={Apple}
              tone="emerald"
            />
            <AnalyticsMetric
              label="Poids hebdomadaire récent"
              value={summary.latestWeight?.averageWeightKg === undefined
                ? '—'
                : `${summary.latestWeight.averageWeightKg.toLocaleString('fr-FR')} kg`}
              detail={summary.latestWeight
                ? `${summary.latestWeight.weighInCount} pesée(s), cible ${summary.latestWeight.targetWeightKg.toLocaleString('fr-FR')} kg`
                : 'Aucune moyenne hebdomadaire disponible'}
              icon={Scale}
              tone="violet"
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <ChartCard
              title="Course"
              description="Kilomètres et durée par semaine. L’allure affichée dans le tableau est pondérée par la distance."
              empty={sum(data.running.map((week) => week.sessionCount)) === 0}
            >
              <div className="h-80" aria-label="Graphique des kilomètres et minutes de course par semaine">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={runningChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" fontSize={12} />
                    <YAxis yAxisId="distance" fontSize={12} />
                    <YAxis yAxisId="duration" orientation="right" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="distance" dataKey="kilometres" name="Kilomètres" fill={COLORS.running} radius={[5, 5, 0, 0]} />
                    <Line yAxisId="duration" dataKey="minutes" name="Minutes" stroke={COLORS.target} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 dark:text-slate-400">
                    <tr><th className="py-2">Semaine</th><th>Allure</th><th>Sortie longue</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {data.running.map((week) => (
                      <tr key={week.weekStart}>
                        <td className="py-2 font-medium">{week.label}</td>
                        <td>{formatOptionalPace(week.weightedPaceSecondsPerKm)}/km</td>
                        <td>{week.longestDistanceKm.toLocaleString('fr-FR')} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard
              title="Natation"
              description="Distance et durée hebdomadaires. L’allure est pondérée sur la distance totale nagée."
              empty={sum(data.swimming.map((week) => week.sessionCount)) === 0}
            >
              <div className="h-80" aria-label="Graphique des distances et minutes de natation par semaine">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={swimmingChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" fontSize={12} />
                    <YAxis yAxisId="distance" fontSize={12} />
                    <YAxis yAxisId="duration" orientation="right" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="distance" dataKey="distanceKm" name="Kilomètres" fill={COLORS.swimming} radius={[5, 5, 0, 0]} />
                    <Line yAxisId="duration" dataKey="minutes" name="Minutes" stroke={COLORS.target} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 dark:text-slate-400">
                    <tr><th className="py-2">Semaine</th><th>Allure</th><th>Plus longue</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {data.swimming.map((week) => (
                      <tr key={week.weekStart}>
                        <td className="py-2 font-medium">{week.label}</td>
                        <td>{formatOptionalPace(week.weightedPaceSecondsPer100m)}/100 m</td>
                        <td>{week.longestDistanceMeters.toLocaleString('fr-FR')} m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard
              title="Nutrition"
              description="Moyennes réelles comparées aux cibles sur les journées comportant des aliments et un objectif calculé."
              empty={data.nutrition.every((week) => week.trackedDayCount === 0)}
            >
              <div className="h-80" aria-label="Graphique des calories consommées et cibles par semaine">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={nutritionChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" fontSize={12} />
                    <YAxis yAxisId="calories" fontSize={12} />
                    <YAxis yAxisId="protein" orientation="right" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="calories" type="monotone" dataKey="calories" name="Calories consommées" stroke={COLORS.nutrition} strokeWidth={3} connectNulls />
                    <Line yAxisId="calories" type="monotone" dataKey="cibleCalories" name="Cible calorique" stroke={COLORS.nutritionTarget} strokeDasharray="6 4" strokeWidth={2} connectNulls />
                    <Line yAxisId="protein" type="monotone" dataKey="proteines" name="Protéines consommées (g)" stroke="#16a34a" strokeWidth={2} connectNulls />
                    <Line yAxisId="protein" type="monotone" dataKey="cibleProteines" name="Cible protéines (g)" stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={2} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {data.nutrition.slice(-3).map((week) => (
                  <div key={week.weekStart} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950">
                    <p className="font-semibold">Semaine du {week.label}</p>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">Calories : {week.calorieAdherencePercent ?? '—'} % d’adhérence</p>
                    <p className="text-slate-600 dark:text-slate-300">Protéines : {week.proteinAdherencePercent ?? '—'} %</p>
                    <p className="text-xs text-slate-500">{week.completedDayCount}/{week.trackedDayCount} journées terminées</p>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard
              title="Activité générale"
              description="Pas moyens sur les jours renseignés et temps sportif total par semaine."
              empty={data.activity.every((week) => week.recordedStepDays === 0 && week.sessionCount === 0)}
            >
              <div className="h-80" aria-label="Graphique des pas moyens et minutes sportives par semaine">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={activityChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" fontSize={12} />
                    <YAxis yAxisId="steps" fontSize={12} />
                    <YAxis yAxisId="minutes" orientation="right" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="steps" dataKey="pas" name="Pas moyens" fill={COLORS.steps} radius={[5, 5, 0, 0]} />
                    <Line yAxisId="minutes" dataKey="minutes" name="Minutes sportives" stroke={COLORS.activity} strokeWidth={3} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Poids et trajectoire"
              description="Moyenne hebdomadaire réelle contre trajectoire calculée à partir de l’objectif du profil."
              empty={data.weight.weekly.every((week) => week.averageWeightKg === undefined)}
            >
              <div className="h-80" aria-label="Graphique du poids hebdomadaire réel et cible">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" fontSize={12} />
                    <YAxis domain={['auto', 'auto']} fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="poids" name="Moyenne réelle (kg)" stroke={COLORS.weight} strokeWidth={3} connectNulls />
                    <Line type="monotone" dataKey="cible" name="Trajectoire cible (kg)" stroke={COLORS.target} strokeDasharray="6 4" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                La moyenne mobile sur 7 jours utilise uniquement les pesées disponibles dans les 7 jours calendaires précédents, sans interpolation.
              </p>
            </ChartCard>

            <ChartCard
              title="Répartition du temps sportif"
              description="Durée cumulée par type d’activité sur la période analysée."
              empty={activityPieData.length === 0}
            >
              <div className="h-80" aria-label="Diagramme de répartition du temps sportif">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={activityPieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={105} paddingAngle={2}>
                      {activityPieData.map((entry, index) => (
                        <Cell key={`${entry.type}-${index}`} fill={ACTIVITY_COLORS[index % ACTIVITY_COLORS.length] ?? '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-2 text-sm">
                {data.activityBreakdown.map((item) => (
                  <div key={item.type} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950">
                    <span>{activityTypeLabels[item.type as ActivityType]}</span>
                    <span className="font-semibold tabular-nums">{formatDuration(item.durationMinutes)} · {item.sessionCount} séance(s)</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <CalendarRange aria-hidden="true" className="size-4" />
            Les graphiques couvrent toujours douze semaines calendaires complètes.
            <Activity aria-hidden="true" className="ml-2 size-4" />
            Les dépenses énergétiques restent des estimations.
          </div>
        </>
      )}
    </section>
  );
}
