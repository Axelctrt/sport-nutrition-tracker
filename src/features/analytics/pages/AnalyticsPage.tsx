import {
  Activity,
  Apple,
  CalendarRange,
  ClipboardCheck,
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
import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import { formatPace } from '@/domain/calculations/running';
import type { ActivityType } from '@/domain/models/activity';
import { activityTypeLabels } from '@/features/activities/utils/activityLabels';
import { AnalyticsOverview } from '@/features/analytics/components/AnalyticsOverview';
import { AnalyticsSection } from '@/features/analytics/components/AnalyticsSection';
import { AnalyticsWeekList } from '@/features/analytics/components/AnalyticsWeekList';
import { useTwelveWeekAnalytics } from '@/features/analytics/hooks/useTwelveWeekAnalytics';
import { inputClassName } from '@/shared/forms/formStyles';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
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

function EmptyAnalyticsState({ children }: { children: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
      {children}
    </div>
  );
}

function WeeklyDetails({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <summary className="min-h-11 cursor-pointer list-none px-3 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
        Détails des {count} semaines
      </summary>
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">{children}</div>
    </details>
  );
}

export function AnalyticsPage() {
  const { profile } = useProfile();
  const [referenceDate, setReferenceDate] = useState(toLocalDate());
  const { data, status, errorMessage, refresh } = useTwelveWeekAnalytics(referenceDate, profile);

  const summary = useMemo(() => {
    if (!data) return undefined;
    const runningDistance = sum(data.running.map((week) => week.distanceKm));
    const swimmingDistance = sum(data.swimming.map((week) => week.distanceMeters));
    const runningSessions = sum(data.running.map((week) => week.sessionCount));
    const swimmingSessions = sum(data.swimming.map((week) => week.sessionCount));
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
    return {
      runningDistance,
      swimmingDistance,
      runningSessions,
      swimmingSessions,
      calorieAdherence,
      latestWeight,
    };
  }, [data]);

  const runningChartData = data?.running.map((week) => ({
    week: week.label,
    kilometres: week.distanceKm,
    minutes: week.durationMinutes,
  })) ?? [];

  const swimmingChartData = data?.swimming.map((week) => ({
    week: week.label,
    distanceKm: week.distanceMeters / 1000,
    minutes: week.durationMinutes,
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
  })) ?? [];

  const activityPieData = data?.activityBreakdown.map((item) => ({
    name: activityTypeLabels[item.type],
    value: item.durationMinutes,
    type: item.type,
  })) ?? [];

  if (!profile) return null;

  return (
    <section className="min-w-0" aria-labelledby="analytics-title">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          Pilotage sur 12 semaines
        </p>
        <h1 id="analytics-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Analyses
        </h1>
        <p className="mt-2 hidden max-w-3xl text-slate-600 dark:text-slate-300 sm:block">
          Consulte d’abord la synthèse, puis ouvre uniquement les graphiques et détails utiles.
        </p>
      </div>

      <Card className="mt-5 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,260px)_1fr] sm:items-end">
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
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Link
              to={routePaths.weeklyReview}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              <ClipboardCheck aria-hidden="true" className="size-4" />
              Bilan
            </Link>
            <Link
              to={routePaths.history}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <History aria-hidden="true" className="size-4" />
              Historique
            </Link>
          </div>
        </div>
      </Card>

      {status === 'error' ? (
        <InlineNotice className="mt-5" tone="error" title="Analyses indisponibles" role="alert">
          <p>{errorMessage}</p>
          <button
            type="button"
            className="mt-3 min-h-10 rounded-lg border border-red-300 px-3 text-sm font-semibold dark:border-red-800"
            onClick={() => void refresh()}
          >
            Réessayer
          </button>
        </InlineNotice>
      ) : null}

      {status === 'loading' || !data || !summary ? <PageSkeleton className="mt-5" variant="dashboard" /> : null}

      {status === 'ready' && data && summary ? (
        <>
          <AnalyticsOverview
            runningDistanceKm={summary.runningDistance}
            runningSessions={summary.runningSessions}
            swimmingDistanceMeters={summary.swimmingDistance}
            swimmingSessions={summary.swimmingSessions}
            calorieAdherencePercent={summary.calorieAdherence}
            latestWeightKg={summary.latestWeight?.averageWeightKg}
            latestWeightWeighIns={summary.latestWeight?.weighInCount}
          />

          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <CalendarRange aria-hidden="true" className="size-4 shrink-0" />
            Du {formatLocalDate(data.from)} au {formatLocalDate(data.to)}. Les semaines sans donnée restent visibles.
          </p>

          <div className="mt-4 space-y-3">
            <AnalyticsSection
              title="Course"
              description="Distance, durée, allure et sortie longue"
              summary={`${summary.runningDistance.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`}
              icon={Footprints}
              defaultOpen={summary.runningSessions > 0}
              toneClassName="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200"
            >
              {summary.runningSessions === 0 ? (
                <EmptyAnalyticsState>Aucune course enregistrée sur cette période.</EmptyAnalyticsState>
              ) : (
                <>
                  <div className="h-64 sm:h-80" aria-label="Graphique de course sur douze semaines">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={runningChartData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" fontSize={11} interval="preserveStartEnd" />
                        <YAxis yAxisId="distance" fontSize={11} />
                        <YAxis yAxisId="duration" orientation="right" fontSize={11} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="distance" dataKey="kilometres" name="Kilomètres" fill={COLORS.running} radius={[5, 5, 0, 0]} />
                        <Line yAxisId="duration" dataKey="minutes" name="Minutes" stroke={COLORS.target} strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <WeeklyDetails count={data.running.length}>
                    <AnalyticsWeekList
                      items={data.running.map((week) => ({
                        id: week.weekStart,
                        label: week.label,
                        metrics: [
                          { label: 'Distance', value: `${week.distanceKm.toLocaleString('fr-FR')} km` },
                          { label: 'Durée', value: formatDuration(week.durationMinutes) },
                          { label: 'Allure', value: `${formatOptionalPace(week.weightedPaceSecondsPerKm)}/km` },
                          { label: 'Sortie longue', value: `${week.longestDistanceKm.toLocaleString('fr-FR')} km` },
                        ],
                      }))}
                    />
                  </WeeklyDetails>
                </>
              )}
            </AnalyticsSection>

            <AnalyticsSection
              title="Natation"
              description="Distance, durée, allure et séance la plus longue"
              summary={`${(summary.swimmingDistance / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`}
              icon={Waves}
              toneClassName="bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200"
            >
              {summary.swimmingSessions === 0 ? (
                <EmptyAnalyticsState>Aucune séance de natation enregistrée sur cette période.</EmptyAnalyticsState>
              ) : (
                <>
                  <div className="h-64 sm:h-80" aria-label="Graphique de natation sur douze semaines">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={swimmingChartData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" fontSize={11} interval="preserveStartEnd" />
                        <YAxis yAxisId="distance" fontSize={11} />
                        <YAxis yAxisId="duration" orientation="right" fontSize={11} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="distance" dataKey="distanceKm" name="Kilomètres" fill={COLORS.swimming} radius={[5, 5, 0, 0]} />
                        <Line yAxisId="duration" dataKey="minutes" name="Minutes" stroke={COLORS.target} strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <WeeklyDetails count={data.swimming.length}>
                    <AnalyticsWeekList
                      items={data.swimming.map((week) => ({
                        id: week.weekStart,
                        label: week.label,
                        metrics: [
                          { label: 'Distance', value: `${week.distanceMeters.toLocaleString('fr-FR')} m` },
                          { label: 'Durée', value: formatDuration(week.durationMinutes) },
                          { label: 'Allure', value: `${formatOptionalPace(week.weightedPaceSecondsPer100m)}/100 m` },
                          { label: 'Plus longue', value: `${week.longestDistanceMeters.toLocaleString('fr-FR')} m` },
                        ],
                      }))}
                    />
                  </WeeklyDetails>
                </>
              )}
            </AnalyticsSection>

            <AnalyticsSection
              title="Nutrition"
              description="Calories et protéines comparées aux objectifs"
              summary={summary.calorieAdherence === undefined ? '—' : `${Math.round(summary.calorieAdherence)} %`}
              icon={Apple}
              toneClassName="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
            >
              {data.nutrition.every((week) => week.trackedDayCount === 0) ? (
                <EmptyAnalyticsState>Aucune journée alimentaire suivie sur cette période.</EmptyAnalyticsState>
              ) : (
                <>
                  <div className="h-64 sm:h-80" aria-label="Graphique nutritionnel sur douze semaines">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={nutritionChartData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" fontSize={11} interval="preserveStartEnd" />
                        <YAxis yAxisId="calories" fontSize={11} />
                        <YAxis yAxisId="protein" orientation="right" fontSize={11} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line yAxisId="calories" type="monotone" dataKey="calories" name="Calories" stroke={COLORS.nutrition} strokeWidth={3} connectNulls />
                        <Line yAxisId="calories" type="monotone" dataKey="cibleCalories" name="Cible kcal" stroke={COLORS.nutritionTarget} strokeDasharray="6 4" strokeWidth={2} connectNulls />
                        <Line yAxisId="protein" type="monotone" dataKey="proteines" name="Protéines" stroke="#16a34a" strokeWidth={2} connectNulls />
                        <Line yAxisId="protein" type="monotone" dataKey="cibleProteines" name="Cible prot." stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={2} connectNulls />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <WeeklyDetails count={data.nutrition.length}>
                    <AnalyticsWeekList
                      items={data.nutrition.map((week) => ({
                        id: week.weekStart,
                        label: week.label,
                        metrics: [
                          { label: 'Jours suivis', value: `${week.trackedDayCount}/7` },
                          { label: 'Jours terminés', value: `${week.completedDayCount}/7` },
                          { label: 'Adhérence kcal', value: week.calorieAdherencePercent === undefined ? '—' : `${Math.round(week.calorieAdherencePercent)} %` },
                          { label: 'Adhérence protéines', value: week.proteinAdherencePercent === undefined ? '—' : `${Math.round(week.proteinAdherencePercent)} %` },
                        ],
                      }))}
                    />
                  </WeeklyDetails>
                </>
              )}
            </AnalyticsSection>

            <AnalyticsSection
              title="Activité générale"
              description="Pas moyens et temps sportif hebdomadaire"
              summary={formatDuration(sum(data.activity.map((week) => week.totalSportMinutes)))}
              icon={Activity}
              toneClassName="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
            >
              {data.activity.every((week) => week.recordedStepDays === 0 && week.sessionCount === 0) ? (
                <EmptyAnalyticsState>Aucune donnée de pas ou d’activité sur cette période.</EmptyAnalyticsState>
              ) : (
                <>
                  <div className="h-64 sm:h-80" aria-label="Graphique des pas et du temps sportif">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={activityChartData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" fontSize={11} interval="preserveStartEnd" />
                        <YAxis yAxisId="steps" fontSize={11} />
                        <YAxis yAxisId="minutes" orientation="right" fontSize={11} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="steps" dataKey="pas" name="Pas moyens" fill={COLORS.steps} radius={[5, 5, 0, 0]} />
                        <Line yAxisId="minutes" dataKey="minutes" name="Minutes sportives" stroke={COLORS.activity} strokeWidth={3} connectNulls />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <WeeklyDetails count={data.activity.length}>
                    <AnalyticsWeekList
                      items={data.activity.map((week) => ({
                        id: week.weekStart,
                        label: week.label,
                        metrics: [
                          { label: 'Pas moyens', value: week.averageSteps === undefined ? '—' : week.averageSteps.toLocaleString('fr-FR') },
                          { label: 'Jours avec pas', value: `${week.recordedStepDays}/7` },
                          { label: 'Temps sportif', value: formatDuration(week.totalSportMinutes) },
                          { label: 'Séances', value: week.sessionCount.toLocaleString('fr-FR') },
                        ],
                      }))}
                    />
                  </WeeklyDetails>
                </>
              )}
            </AnalyticsSection>

            <AnalyticsSection
              title="Poids et trajectoire"
              description="Moyenne réelle comparée à la cible"
              summary={summary.latestWeight?.averageWeightKg === undefined ? '—' : `${summary.latestWeight.averageWeightKg.toLocaleString('fr-FR')} kg`}
              icon={Scale}
              toneClassName="bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200"
            >
              {data.weight.weekly.every((week) => week.averageWeightKg === undefined) ? (
                <EmptyAnalyticsState>Aucune moyenne de poids disponible sur cette période.</EmptyAnalyticsState>
              ) : (
                <>
                  <div className="h-64 sm:h-80" aria-label="Graphique du poids et de la trajectoire">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightChartData} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" fontSize={11} interval="preserveStartEnd" />
                        <YAxis domain={['auto', 'auto']} fontSize={11} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="poids" name="Moyenne réelle" stroke={COLORS.weight} strokeWidth={3} connectNulls />
                        <Line type="monotone" dataKey="cible" name="Trajectoire" stroke={COLORS.target} strokeDasharray="6 4" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <WeeklyDetails count={data.weight.weekly.length}>
                    <AnalyticsWeekList
                      items={data.weight.weekly.map((week) => ({
                        id: week.weekStart,
                        label: week.label,
                        metrics: [
                          { label: 'Poids moyen', value: week.averageWeightKg === undefined ? '—' : `${week.averageWeightKg.toLocaleString('fr-FR')} kg` },
                          { label: 'Trajectoire', value: `${week.targetWeightKg.toLocaleString('fr-FR')} kg` },
                          { label: 'Pesées', value: week.weighInCount.toLocaleString('fr-FR') },
                        ],
                      }))}
                    />
                  </WeeklyDetails>
                </>
              )}
            </AnalyticsSection>

            <AnalyticsSection
              title="Répartition du temps sportif"
              description="Durée cumulée par type d’activité"
              summary={formatDuration(sum(data.activityBreakdown.map((item) => item.durationMinutes)))}
              icon={CalendarRange}
              toneClassName="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
            >
              {activityPieData.length === 0 ? (
                <EmptyAnalyticsState>Aucune activité à répartir sur cette période.</EmptyAnalyticsState>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] lg:items-center">
                  <div className="h-64" aria-label="Répartition du temps sportif par activité">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={activityPieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={2}>
                          {activityPieData.map((entry, index) => (
                            <Cell key={`${entry.type}-${index}`} fill={ACTIVITY_COLORS[index % ACTIVITY_COLORS.length] ?? '#64748b'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-sm">
                    {data.activityBreakdown.map((item) => (
                      <div key={item.type} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                        <span>{activityTypeLabels[item.type as ActivityType]}</span>
                        <span className="text-right font-semibold tabular-nums">
                          {formatDuration(item.durationMinutes)} · {item.sessionCount} séance(s)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </AnalyticsSection>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Les moyennes utilisent uniquement les données disponibles. Les dépenses énergétiques restent des estimations.
          </p>
        </>
      ) : null}
    </section>
  );
}
