import {
  Activity,
  Apple,
  CalendarRange,
  Dumbbell,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useProfile } from "@/app/providers/profile/useProfile";
import { routePaths } from "@/app/routePaths";
import type { PerformanceAnalyticsSnapshot } from "@/application/analytics/performanceAnalyticsService";
import { activityTypeLabels } from "@/features/activities/utils/activityLabels";
import { usePerformanceAnalytics } from "@/features/analytics/hooks/usePerformanceAnalytics";
import { inputClassName } from "@/shared/forms/formStyles";
import {
  SportPilotAccessibleSummary,
  SportPilotChartCard,
  SportPilotChartContainer,
  SportPilotChartTooltip,
  SportPilotEmptyChart,
  SportPilotHeatmap,
  SportPilotLegend,
  useSportPilotChartAnimation,
} from "@/shared/charts/SportPilotCharts";
import { InlineNotice } from "@/shared/ui/InlineNotice";
import { PageSkeleton } from "@/shared/ui/PageSkeleton";
import { SportPilotAnimatedTabs } from "@/shared/ui/SportPilotAnimatedTabs";
import { formatLocalDate, toLocalDate } from "@/shared/utils/dates";

const analyticsTabs = [
  { id: "overview", label: "Vue d’ensemble" },
  { id: "body", label: "Corps" },
  { id: "nutrition", label: "Nutrition" },
  { id: "activity", label: "Activité" },
  { id: "strength", label: "Musculation" },
  { id: "regularity", label: "Régularité" },
] as const;

type AnalyticsTabId = (typeof analyticsTabs)[number]["id"];
type AnalyticsPeriod = 4 | 8 | 12;

const chartMargin = { top: 8, right: 8, left: -20, bottom: 0 };
const chartColors = {
  primary: "var(--sp-chart-1)",
  secondary: "var(--sp-chart-2)",
  success: "var(--sp-chart-3)",
  accent: "var(--sp-chart-4)",
  warning: "var(--sp-chart-5)",
  grid: "var(--sp-border-subtle)",
  text: "var(--sp-text-muted)",
} as const;

function validTab(value: string | null): AnalyticsTabId {
  return analyticsTabs.some(({ id }) => id === value)
    ? value as AnalyticsTabId
    : "overview";
}

function validPeriod(value: string | null): AnalyticsPeriod {
  return value === "4" || value === "8" ? Number(value) as 4 | 8 : 12;
}

function formatNumber(value: number | undefined, digits = 0): string {
  return value === undefined
    ? "—"
    : value.toLocaleString("fr-FR", { maximumFractionDigits: digits });
}

function chartAxes() {
  return (
    <>
      <CartesianGrid vertical={false} stroke={chartColors.grid} strokeDasharray="3 3" />
      <XAxis
        dataKey="label"
        tick={{ fill: chartColors.text, fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        interval="preserveStartEnd"
      />
      <YAxis
        tick={{ fill: chartColors.text, fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        width={44}
      />
    </>
  );
}

function WeightChart({
  data,
  compact = false,
}: {
  data: PerformanceAnalyticsSnapshot;
  compact?: boolean;
}) {
  const animate = useSportPilotChartAnimation();
  const points = data.base.weight.movingAverage.map((point) => ({
    label: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    }).format(new Date(`${point.date}T12:00:00`)),
    poids: point.weightKg,
    moyenne: point.movingAverageKg,
    objectif: point.targetWeightKg,
  }));
  if (new Set(data.base.weight.movingAverage.map(({ date }) => date)).size < 2) {
    return (
      <SportPilotEmptyChart
        title="Tendance encore indisponible"
        description="Ajoute au moins deux pesées sur des jours différents pour faire apparaître une tendance."
        action={{ label: "Ajouter une pesée", to: routePaths.weight }}
      />
    );
  }
  return (
    <>
      <SportPilotChartContainer
        label="Poids brut, moyenne mobile sur sept jours et objectif, en kilogrammes"
        height={compact ? "compact" : "standard"}
      >
        <LineChart data={points} margin={chartMargin} accessibilityLayer>
          {chartAxes()}
          <Tooltip content={<SportPilotChartTooltip />} />
          <Line type="monotone" dataKey="poids" name="Poids" unit=" kg" stroke={chartColors.primary} strokeWidth={1.5} dot={{ r: 2 }} isAnimationActive={animate} />
          <Line type="monotone" dataKey="moyenne" name="Moyenne 7 jours" unit=" kg" stroke={chartColors.accent} strokeWidth={3} dot={false} isAnimationActive={animate} />
          <Line type="monotone" dataKey="objectif" name="Objectif" unit=" kg" stroke={chartColors.success} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={animate} />
        </LineChart>
      </SportPilotChartContainer>
      <SportPilotLegend items={[
        { label: "Poids brut", color: chartColors.primary },
        { label: "Moyenne 7 jours", color: chartColors.accent },
        { label: "Objectif", color: chartColors.success },
      ]} />
      <SportPilotAccessibleSummary
        caption="Évolution du poids en kilogrammes"
        rows={points.map((point) => ({
          label: point.label,
          values: [
            { label: "Poids", value: `${formatNumber(point.poids, 2)} kg` },
            { label: "Moyenne 7 jours", value: `${formatNumber(point.moyenne, 2)} kg` },
            { label: "Objectif", value: `${formatNumber(point.objectif, 2)} kg` },
          ],
        }))}
      />
    </>
  );
}

function NutritionCaloriesChart({
  data,
}: {
  data: PerformanceAnalyticsSnapshot;
}) {
  const animate = useSportPilotChartAnimation();
  const points = data.base.nutrition.map((week) => ({
    label: week.label,
    calories: week.averageConsumedCaloriesKcal,
    cible: week.averageTargetCaloriesKcal,
    jours: week.trackedDayCount,
  }));
  if (!points.some(({ jours }) => jours > 0)) {
    return (
      <SportPilotEmptyChart
        title="Aucune moyenne nutritionnelle"
        description="Renseigne quelques journées de repas pour obtenir une moyenne fiable."
        action={{ label: "Renseigner un repas", to: routePaths.food }}
      />
    );
  }
  return (
    <>
      <SportPilotChartContainer label="Calories moyennes consommées et cibles variables, en kilocalories">
        <BarChart data={points} margin={chartMargin} accessibilityLayer>
          {chartAxes()}
          <Tooltip content={<SportPilotChartTooltip />} />
          <Bar dataKey="calories" name="Consommé" unit=" kcal" fill={chartColors.primary} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
          <Bar dataKey="cible" name="Cible" unit=" kcal" fill={chartColors.success} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
        </BarChart>
      </SportPilotChartContainer>
      <SportPilotLegend items={[
        { label: "Consommé", color: chartColors.primary },
        { label: "Cible du jour", color: chartColors.success },
      ]} />
      <SportPilotAccessibleSummary
        caption="Calories moyennes par semaine"
        rows={points.map((point) => ({
          label: point.label,
          values: [
            { label: "Consommé", value: `${formatNumber(point.calories)} kcal` },
            { label: "Cible", value: `${formatNumber(point.cible)} kcal` },
            { label: "Jours renseignés", value: String(point.jours) },
          ],
        }))}
      />
    </>
  );
}

function ActivityMinutesChart({
  data,
}: {
  data: PerformanceAnalyticsSnapshot;
}) {
  const animate = useSportPilotChartAnimation();
  const points = data.base.activity.map((week) => ({
    label: week.label,
    minutes: week.totalSportMinutes,
  }));
  if (!points.some(({ minutes }) => minutes > 0)) {
    return (
      <SportPilotEmptyChart
        title="Aucune activité sur cette période"
        description="Termine une activité pour commencer à comparer ton volume sportif."
        action={{ label: "Ajouter une activité", to: routePaths.addActivity }}
      />
    );
  }
  return (
    <>
      <SportPilotChartContainer label="Durée sportive terminée par semaine, en minutes">
        <BarChart data={points} margin={chartMargin} accessibilityLayer>
          {chartAxes()}
          <Tooltip content={<SportPilotChartTooltip />} />
          <Bar dataKey="minutes" name="Durée" unit=" min" fill={chartColors.warning} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
        </BarChart>
      </SportPilotChartContainer>
      <SportPilotAccessibleSummary
        caption="Durée sportive hebdomadaire"
        rows={points.map((point) => ({
          label: point.label,
          values: [{ label: "Durée", value: `${formatNumber(point.minutes)} min` }],
        }))}
      />
    </>
  );
}

function PlannedActualChart({
  data,
}: {
  data: PerformanceAnalyticsSnapshot;
}) {
  const animate = useSportPilotChartAnimation();
  if (!data.plannedActual.some(({ plannedActivities, completedActivities }) => (
    plannedActivities > 0 || completedActivities > 0
  ))) {
    return (
      <SportPilotEmptyChart
        title="Aucune semaine à comparer"
        description="Planifie puis termine des activités pour comparer ce qui était prévu et réalisé."
        action={{ label: "Ouvrir le planning", to: routePaths.weeklyPlanning }}
      />
    );
  }
  return (
    <>
      <SportPilotChartContainer label="Nombre d'activités planifiées et terminées par semaine">
        <BarChart data={data.plannedActual} margin={chartMargin} accessibilityLayer>
          {chartAxes()}
          <Tooltip content={<SportPilotChartTooltip />} />
          <Bar dataKey="plannedActivities" name="Planifiées" fill={chartColors.secondary} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
          <Bar dataKey="completedActivities" name="Réalisées" fill={chartColors.success} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
        </BarChart>
      </SportPilotChartContainer>
      <SportPilotLegend items={[
        { label: "Planifiées", color: chartColors.secondary },
        { label: "Réalisées", color: chartColors.success },
      ]} />
      <SportPilotAccessibleSummary
        caption="Activités prévues et réalisées par semaine"
        rows={data.plannedActual.map((week) => ({
          label: week.label,
          values: [
            { label: "Planifiées", value: String(week.plannedActivities) },
            { label: "Réalisées", value: String(week.completedActivities) },
            {
              label: "Reliées au planning",
              value: String(week.realizedPlannedActivities),
            },
          ],
        }))}
      />
    </>
  );
}

function RegularityChart({
  data,
}: {
  data: PerformanceAnalyticsSnapshot;
}) {
  const animate = useSportPilotChartAnimation();
  if (!data.regularity.some(({ trackingDays, nutritionDays, completedActivities }) => (
    trackingDays > 0 || nutritionDays > 0 || completedActivities > 0
  ))) {
    return (
      <SportPilotEmptyChart
        title="Régularité encore indisponible"
        description="Continue à renseigner tes journées pour faire apparaître une tendance fiable."
        action={{ label: "Revenir à l’accueil", to: routePaths.dashboard }}
      />
    );
  }
  return (
    <>
      <SportPilotChartContainer label="Jours de suivi et de nutrition renseignés chaque semaine">
        <BarChart data={data.regularity} margin={chartMargin} accessibilityLayer>
          {chartAxes()}
          <Tooltip content={<SportPilotChartTooltip />} />
          <Bar dataKey="trackingDays" name="Suivi quotidien" unit=" jours" fill={chartColors.primary} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
          <Bar dataKey="nutritionDays" name="Nutrition" unit=" jours" fill={chartColors.success} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
        </BarChart>
      </SportPilotChartContainer>
      <SportPilotLegend items={[
        { label: "Suivi quotidien", color: chartColors.primary },
        { label: "Nutrition", color: chartColors.success },
      ]} />
      <SportPilotAccessibleSummary
        caption="Régularité hebdomadaire"
        rows={data.regularity.map((week) => ({
          label: week.label,
          values: [
            { label: "Suivi quotidien", value: `${week.trackingDays} jours` },
            { label: "Nutrition", value: `${week.nutritionDays} jours` },
            {
              label: "Activités terminées",
              value: String(week.completedActivities),
            },
          ],
        }))}
      />
    </>
  );
}

function StrengthCharts({
  data,
}: {
  data: PerformanceAnalyticsSnapshot;
}) {
  const [exerciseId, setExerciseId] = useState(
    () => data.strengthExercises[0]?.exerciseId ?? "",
  );
  const animate = useSportPilotChartAnimation();
  const selected = data.strengthExercises.find(
    (exercise) => exercise.exerciseId === exerciseId,
  ) ?? data.strengthExercises[0];

  if (!selected) {
    return (
      <SportPilotEmptyChart
        title="Aucune progression de musculation"
        description="Termine plusieurs séances avec un exercice pour comparer ta progression."
        action={{ label: "Voir mes séances", to: routePaths.workoutSessions }}
      />
    );
  }

  const oneRepMaxPoints = selected.points.filter(
    ({ estimatedOneRepMaxKg }) => estimatedOneRepMaxKg !== undefined,
  );
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="analytics-strength-exercise" className="text-sm font-bold text-[var(--sp-text-primary)]">
          Exercice
        </label>
        <select
          id="analytics-strength-exercise"
          className={`${inputClassName} mt-2`}
          value={selected.exerciseId}
          onChange={(event) => setExerciseId(event.target.value)}
        >
          {data.strengthExercises.map((exercise) => (
            <option key={exercise.exerciseId} value={exercise.exerciseId}>
              {exercise.name}
            </option>
          ))}
        </select>
      </div>

      <SportPilotChartCard
        title="1RM estimé"
        description="Estimation Epley sur les séries de 1 à 12 répétitions."
        metric={selected.latestEstimatedOneRepMaxKg === undefined
          ? undefined
          : `${formatNumber(selected.latestEstimatedOneRepMaxKg, 1)} kg`}
        metricLabel={selected.oneRepMaxChangePercent === undefined
          ? undefined
          : `${selected.oneRepMaxChangePercent > 0 ? "+" : ""}${selected.oneRepMaxChangePercent} % sur la période`}
      >
        {oneRepMaxPoints.length < 2 ? (
          <SportPilotEmptyChart
            title="Deux séances comparables nécessaires"
            description="Termine plusieurs séances avec cet exercice pour tracer l’évolution du 1RM estimé."
            action={{ label: "Voir l’historique", to: routePaths.strengthExercises }}
          />
        ) : (
          <SportPilotChartContainer label={`1RM estimé de ${selected.name}, en kilogrammes`}>
            <LineChart data={oneRepMaxPoints} margin={chartMargin} accessibilityLayer>
              {chartAxes()}
              <Tooltip content={<SportPilotChartTooltip />} />
              <Line type="monotone" dataKey="estimatedOneRepMaxKg" name="1RM estimé" unit=" kg" stroke={chartColors.accent} strokeWidth={3} dot={{ r: 3 }} isAnimationActive={animate} />
            </LineChart>
          </SportPilotChartContainer>
        )}
      </SportPilotChartCard>

      <SportPilotChartCard
        title="Volume par séance"
        description="Charge multipliée par les répétitions terminées, en kilogrammes."
      >
        <SportPilotChartContainer label={`Volume de ${selected.name} par séance, en kilogrammes`}>
          <BarChart data={selected.points} margin={chartMargin} accessibilityLayer>
            {chartAxes()}
            <Tooltip content={<SportPilotChartTooltip />} />
            <Bar dataKey="volumeKg" name="Volume" unit=" kg" fill={chartColors.primary} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
          </BarChart>
        </SportPilotChartContainer>
        <SportPilotAccessibleSummary
          caption={`Volume et meilleure série de ${selected.name}`}
          rows={selected.points.map((point) => ({
            label: point.label,
            values: [
              { label: "Volume", value: `${formatNumber(point.volumeKg, 1)} kg` },
              { label: "Meilleure série", value: point.bestSetLabel },
            ],
          }))}
        />
      </SportPilotChartCard>
    </div>
  );
}

function MacroChart({ data }: { data: PerformanceAnalyticsSnapshot }) {
  const animate = useSportPilotChartAnimation();
  if (!data.macroWeeks.some(({ trackedDays }) => trackedDays > 0)) {
    return (
      <SportPilotEmptyChart
        title="Macros encore indisponibles"
        description="Renseigne quelques journées de repas pour comparer protéines, glucides et lipides."
        action={{ label: "Renseigner un repas", to: routePaths.food }}
      />
    );
  }
  return (
    <>
      <SportPilotChartContainer label="Moyennes hebdomadaires de protéines, glucides et lipides, en grammes">
        <BarChart data={data.macroWeeks} margin={chartMargin} accessibilityLayer>
          {chartAxes()}
          <Tooltip content={<SportPilotChartTooltip />} />
          <Bar dataKey="proteinGrams" name="Protéines" unit=" g" fill={chartColors.primary} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
          <Bar dataKey="carbohydratesGrams" name="Glucides" unit=" g" fill={chartColors.secondary} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
          <Bar dataKey="fatGrams" name="Lipides" unit=" g" fill={chartColors.warning} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
        </BarChart>
      </SportPilotChartContainer>
      <SportPilotLegend items={[
        { label: "Protéines", color: chartColors.primary },
        { label: "Glucides", color: chartColors.secondary },
        { label: "Lipides", color: chartColors.warning },
      ]} />
      <SportPilotAccessibleSummary
        caption="Macronutriments moyens par semaine"
        rows={data.macroWeeks.map((week) => ({
          label: week.label,
          values: [
            { label: "Protéines", value: `${formatNumber(week.proteinGrams, 1)} g` },
            { label: "Glucides", value: `${formatNumber(week.carbohydratesGrams, 1)} g` },
            { label: "Lipides", value: `${formatNumber(week.fatGrams, 1)} g` },
          ],
        }))}
      />
    </>
  );
}

function ActivityBreakdown({ data }: { data: PerformanceAnalyticsSnapshot }) {
  const animate = useSportPilotChartAnimation();
  const items = data.base.activityBreakdown.map((item) => ({
    name: activityTypeLabels[item.type],
    value: item.durationMinutes,
  }));
  if (items.length === 0) {
    return (
      <SportPilotEmptyChart
        title="Aucune répartition disponible"
        description="Termine une activité pour afficher la part de chaque discipline."
        action={{ label: "Ajouter une activité", to: routePaths.addActivity }}
      />
    );
  }
  return (
    <>
      <SportPilotChartContainer label="Répartition du temps sportif par discipline, en minutes">
        <PieChart accessibilityLayer>
          <Tooltip content={<SportPilotChartTooltip />} />
          <Pie
            data={items}
            dataKey="value"
            nameKey="name"
            innerRadius="48%"
            outerRadius="76%"
            paddingAngle={2}
            isAnimationActive={animate}
          >
            {items.map((item, index) => (
              <Cell
                key={item.name}
                fill={[
                  chartColors.primary,
                  chartColors.secondary,
                  chartColors.success,
                  chartColors.accent,
                  chartColors.warning,
                ][index % 5] ?? chartColors.primary}
              />
            ))}
          </Pie>
        </PieChart>
      </SportPilotChartContainer>
      <SportPilotLegend items={items.map((item, index) => ({
        label: item.name,
        detail: `${formatNumber(item.value)} min`,
        color: [
          chartColors.primary,
          chartColors.secondary,
          chartColors.success,
          chartColors.accent,
          chartColors.warning,
        ][index % 5]!,
      }))} />
      <SportPilotAccessibleSummary
        caption="Temps sportif par discipline"
        rows={items.map((item) => ({
          label: item.name,
          values: [
            { label: "Durée", value: `${formatNumber(item.value)} min` },
          ],
        }))}
      />
    </>
  );
}

export function AnalyticsPage() {
  const { profile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [referenceDate, setReferenceDate] = useState(toLocalDate());
  const activeTab = validTab(searchParams.get("tab"));
  const period = validPeriod(searchParams.get("weeks"));
  const { data: fullData, status, errorMessage, refresh } = usePerformanceAnalytics(
    referenceDate,
    profile,
  );

  const data = useMemo(() => {
    if (!fullData || period === 12) return fullData;
    const firstWeek = fullData.base.activity.slice(-period)[0]?.weekStart;
    if (!firstWeek) return fullData;
    const selectedActivityWeeks = fullData.base.activity.slice(-period);
    const breakdown = new Map<
      PerformanceAnalyticsSnapshot["base"]["activityBreakdown"][number]["type"],
      { durationMinutes: number; sessionCount: number }
    >();
    for (const week of selectedActivityWeeks) {
      for (const item of week.breakdown) {
        const current = breakdown.get(item.type) ?? {
          durationMinutes: 0,
          sessionCount: 0,
        };
        breakdown.set(item.type, {
          durationMinutes: current.durationMinutes + item.durationMinutes,
          sessionCount: current.sessionCount + item.sessionCount,
        });
      }
    }
    return {
      ...fullData,
      base: {
        ...fullData.base,
        from: firstWeek,
        running: fullData.base.running.slice(-period),
        swimming: fullData.base.swimming.slice(-period),
        cycling: fullData.base.cycling.slice(-period),
        nutrition: fullData.base.nutrition.slice(-period),
        activity: selectedActivityWeeks,
        activityBreakdown: [...breakdown.entries()].map(([type, values]) => ({
          type,
          ...values,
        })),
        weight: {
          movingAverage: fullData.base.weight.movingAverage.filter(
            ({ date }) => date >= firstWeek,
          ),
          weekly: fullData.base.weight.weekly.slice(-period),
        },
      },
      regularity: fullData.regularity.slice(-period),
      plannedActual: fullData.plannedActual.slice(-period),
      macroWeeks: fullData.macroWeeks.slice(-period),
      heatmap: fullData.heatmap.filter(({ date }) => date >= firstWeek),
      strengthExercises: fullData.strengthExercises.map((exercise) => {
        const points = exercise.points.filter(({ date }) => date >= firstWeek);
        const comparable = points.filter(
          ({ estimatedOneRepMaxKg }) => estimatedOneRepMaxKg !== undefined,
        );
        const firstEstimate = comparable[0]?.estimatedOneRepMaxKg;
        const latestEstimate = comparable.at(-1)?.estimatedOneRepMaxKg;
        const changePercent =
          firstEstimate === undefined
          || latestEstimate === undefined
          || firstEstimate === 0
            ? undefined
            : Math.round(
                (latestEstimate - firstEstimate) / firstEstimate * 1_000,
              ) / 10;
        return {
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          sessionCount: points.length,
          points,
          ...(latestEstimate === undefined
            ? {}
            : { latestEstimatedOneRepMaxKg: latestEstimate }),
          ...(changePercent === undefined
            ? {}
            : { oneRepMaxChangePercent: changePercent }),
        };
      }).filter(({ points }) => points.length > 0),
    };
  }, [fullData, period]);

  const updateFilter = (key: "tab" | "weeks", value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  if (!profile) return null;

  const latestWeight = data?.base.weight.movingAverage.at(-1)?.movingAverageKg;
  const latestNutrition = data?.base.nutrition.filter(
    ({ trackedDayCount }) => trackedDayCount > 0,
  ).at(-1);
  const currentActivity = data?.base.activity.at(-1);
  const balancedWeeks = data?.regularity.filter(({ balanced }) => balanced).length ?? 0;
  const currentPlan = data?.plannedActual.at(-1);

  return (
    <section className="min-w-0" aria-labelledby="analytics-title">
      <header className="border-b border-[var(--sp-border-subtle)] pb-5">
        <p className="text-xs font-bold uppercase text-[var(--sp-text-muted)]">
          Exploration détaillée
        </p>
        <h1 id="analytics-title" className="mt-1 text-2xl font-bold text-[var(--sp-text-primary)] sm:text-3xl">
          Analyses
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--sp-text-secondary)]">
          Compare les tendances utiles sans mélanger des unités incompatibles.
        </p>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="analytics-reference-date" className="text-sm font-bold text-[var(--sp-text-primary)]">
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
        <div>
          <label htmlFor="analytics-period" className="text-sm font-bold text-[var(--sp-text-primary)]">
            Période
          </label>
          <select
            id="analytics-period"
            value={period}
            onChange={(event) => updateFilter("weeks", event.target.value)}
            className={`${inputClassName} mt-2`}
          >
            <option value="4">4 semaines</option>
            <option value="8">8 semaines</option>
            <option value="12">12 semaines</option>
          </select>
        </div>
      </div>

      <SportPilotAnimatedTabs
        label="Domaines d’analyse"
        tabs={analyticsTabs}
        activeTab={activeTab}
        onChange={(tab) => updateFilter("tab", tab)}
        className="mt-5"
      />

      {status === "error" ? (
        <InlineNotice className="mt-5" tone="error" title="Analyses indisponibles" role="alert">
          <p>{errorMessage}</p>
          <button type="button" className="sp-button sp-button--secondary mt-3 min-h-11 rounded-[var(--sp-radius-control)] px-4 text-sm font-bold" onClick={() => void refresh()}>
            Réessayer
          </button>
        </InlineNotice>
      ) : null}

      {status === "loading" || !data ? <PageSkeleton className="mt-5" variant="dashboard" /> : null}

      {status === "ready" && data ? (
        <div className="mt-5">
          <p className="mb-4 flex items-center gap-2 text-xs text-[var(--sp-text-muted)]">
            <CalendarRange aria-hidden="true" className="size-4" />
            Du {formatLocalDate(data.base.from)} au {formatLocalDate(data.base.to)}
          </p>

          <div id={`${activeTab}-panel`} role="tabpanel" aria-labelledby={`${activeTab}-tab`}>
            {activeTab === "overview" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <SportPilotChartCard
                  title="Tendance du poids"
                  description="Valeur brute, moyenne mobile et trajectoire d’objectif."
                  metric={latestWeight === undefined ? undefined : `${formatNumber(latestWeight, 2)} kg`}
                  action={{ label: "Ouvrir Corps", to: `${routePaths.analytics}?tab=body&weeks=${period}` }}
                >
                  <WeightChart data={data} compact />
                </SportPilotChartCard>
                <SportPilotChartCard
                  title="Calories contre cible"
                  description="Moyenne des journées réellement renseignées."
                  metric={latestNutrition?.averageConsumedCaloriesKcal === undefined
                    ? undefined
                    : `${formatNumber(latestNutrition.averageConsumedCaloriesKcal)} kcal`}
                  action={{ label: "Ouvrir Nutrition", to: `${routePaths.analytics}?tab=nutrition&weeks=${period}` }}
                >
                  <NutritionCaloriesChart data={data} />
                </SportPilotChartCard>
                <SportPilotChartCard
                  title="Volume sportif"
                  description="Durée totale des activités terminées."
                  metric={`${formatNumber(currentActivity?.totalSportMinutes)} min`}
                  action={{ label: "Ouvrir Activité", to: `${routePaths.analytics}?tab=activity&weeks=${period}` }}
                >
                  <ActivityMinutesChart data={data} />
                </SportPilotChartCard>
                <SportPilotChartCard
                  title="Régularité"
                  description="Jours de suivi et de nutrition par semaine."
                  metric={`${balancedWeeks} sem.`}
                  metricLabel="équilibrées"
                  action={{ label: "Ouvrir Régularité", to: `${routePaths.analytics}?tab=regularity&weeks=${period}` }}
                >
                  <RegularityChart data={data} />
                </SportPilotChartCard>
                <SportPilotChartCard
                  title="Prévu contre réalisé"
                  description="Activités planifiées puis effectivement terminées."
                  metric={currentPlan
                    ? `${currentPlan.completedActivities} / ${currentPlan.plannedActivities}`
                    : undefined}
                  metricLabel="cette semaine"
                  className="lg:col-span-2"
                >
                  <PlannedActualChart data={data} />
                </SportPilotChartCard>
              </div>
            ) : null}

            {activeTab === "body" ? (
              <SportPilotChartCard
                title="Corps et poids"
                description="Le poids brut reste distinct de sa moyenne mobile sur sept jours."
                metric={latestWeight === undefined ? undefined : `${formatNumber(latestWeight, 2)} kg`}
                action={{ label: "Ajouter une pesée", to: routePaths.weight }}
              >
                <WeightChart data={data} />
              </SportPilotChartCard>
            ) : null}

            {activeTab === "nutrition" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <SportPilotChartCard
                  title="Calories contre cible"
                  description="Les changements de cible sont conservés semaine par semaine."
                >
                  <NutritionCaloriesChart data={data} />
                </SportPilotChartCard>
                <SportPilotChartCard
                  title="Répartition des macros"
                  description="Moyennes de protéines, glucides et lipides, toutes en grammes."
                >
                  <MacroChart data={data} />
                </SportPilotChartCard>
              </div>
            ) : null}

            {activeTab === "activity" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <SportPilotChartCard
                  title="Durée sportive"
                  description="Volume hebdomadaire des activités terminées, en minutes."
                >
                  <ActivityMinutesChart data={data} />
                </SportPilotChartCard>
                <SportPilotChartCard
                  title="Répartition des sports"
                  description="Part de chaque discipline dans le temps total enregistré."
                >
                  <ActivityBreakdown data={data} />
                </SportPilotChartCard>
                <SportPilotChartCard
                  title="Prévu contre réalisé"
                  description="Les plans réalisés sont reliés à une activité ou séance terminée."
                  className="xl:col-span-2"
                >
                  <PlannedActualChart data={data} />
                </SportPilotChartCard>
              </div>
            ) : null}

            {activeTab === "strength" ? <StrengthCharts data={data} /> : null}

            {activeTab === "regularity" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <SportPilotChartCard
                  title="Régularité hebdomadaire"
                  description="Suivi quotidien et nutrition, exprimés en jours renseignés."
                >
                  <RegularityChart data={data} />
                </SportPilotChartCard>
                <SportPilotChartCard
                  title="Heatmap de continuité"
                  description="Intensité fondée sur le suivi, la nutrition et l’activité ou le repos confirmé."
                  metric={`${balancedWeeks} / ${period}`}
                  metricLabel="semaines équilibrées"
                >
                  {data.heatmap.some(({ score }) => score > 0) ? (
                    <SportPilotHeatmap
                      label="Continuité quotidienne sur la période"
                      days={data.heatmap}
                    />
                  ) : (
                    <SportPilotEmptyChart
                      title="Aucune continuité à afficher"
                      description="Continue à renseigner tes journées pour faire apparaître une tendance fiable."
                      action={{ label: "Revenir à l’accueil", to: routePaths.dashboard }}
                    />
                  )}
                </SportPilotChartCard>
              </div>
            ) : null}
          </div>

          <nav className="mt-6 flex flex-wrap gap-3 border-t border-[var(--sp-border-subtle)] pt-5" aria-label="Analyses associées">
            <Link className="sp-button sp-button--secondary inline-flex min-h-11 items-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-bold" to={routePaths.reports}>
              <ShieldCheck aria-hidden="true" className="size-4" />
              Rapports
            </Link>
            <Link className="sp-button sp-button--secondary inline-flex min-h-11 items-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-bold" to={routePaths.progression}>
              <Scale aria-hidden="true" className="size-4" />
              Progression
            </Link>
            <Link className="sp-button sp-button--secondary inline-flex min-h-11 items-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-bold" to={routePaths.food}>
              <Apple aria-hidden="true" className="size-4" />
              Journal nutritionnel
            </Link>
            <Link className="sp-button sp-button--secondary inline-flex min-h-11 items-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-bold" to={routePaths.activities}>
              <Activity aria-hidden="true" className="size-4" />
              Activités
            </Link>
            <Link className="sp-button sp-button--secondary inline-flex min-h-11 items-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-bold" to={routePaths.strengthExercises}>
              <Dumbbell aria-hidden="true" className="size-4" />
              Exercices
            </Link>
          </nav>
        </div>
      ) : null}
    </section>
  );
}
