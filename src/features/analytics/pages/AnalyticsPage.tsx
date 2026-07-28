import {
  Activity,
  Apple,
  BarChart3,
  CalendarRange,
  Dumbbell,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { Fragment, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
import { muscleGroupLabel } from "@/features/strength-exercises/utils/exerciseLabels";
import { inputClassName } from "@/shared/forms/formStyles";
import {
  SportPilotAccessibleSummary,
  SportPilotChartCard,
  SportPilotChartContainer,
  SportPilotChartTooltip,
  SportPilotEmptyChart,
  SportPilotHeatmap,
  SportPilotLegend,
} from "@/shared/charts/SportPilotCharts";
import { useSportPilotChartAnimation } from "@/shared/charts/useSportPilotChartAnimation";
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
type BodyPeriod = "30" | "90" | "180" | "365" | "all";

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

function validBodyPeriod(value: string | null): BodyPeriod {
  return value === "30"
    || value === "90"
    || value === "180"
    || value === "365"
    || value === "all"
    ? value
    : "90";
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
  sourcePoints,
}: {
  data: PerformanceAnalyticsSnapshot;
  compact?: boolean;
  sourcePoints?: PerformanceAnalyticsSnapshot["allWeightPoints"];
}) {
  const animate = useSportPilotChartAnimation();
  const weightPoints = sourcePoints ?? data.base.weight.movingAverage;
  const points = weightPoints.map((point) => ({
    label: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    }).format(new Date(`${point.date}T12:00:00`)),
    poids: point.weightKg,
    moyenne: point.movingAverageKg,
    objectif: point.targetWeightKg,
  }));
  if (new Set(weightPoints.map(({ date }) => date)).size < 2) {
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
  const points = data.nutritionDays.slice(-7).map((day) => ({
    label: day.label,
    calories: day.caloriesKcal,
    cible: day.targetCaloriesKcal,
  }));
  if (!points.some(({ calories }) => calories !== undefined)) {
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
      <SportPilotChartContainer label="Calories consommées et cibles quotidiennes variables, en kilocalories">
        <ComposedChart data={points} margin={chartMargin} accessibilityLayer>
          {chartAxes()}
          <Tooltip content={<SportPilotChartTooltip />} />
          <Bar dataKey="calories" name="Consommé" unit=" kcal" fill={chartColors.primary} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
          <Line type="linear" dataKey="cible" name="Cible" unit=" kcal" stroke={chartColors.success} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={animate} />
        </ComposedChart>
      </SportPilotChartContainer>
      <SportPilotLegend items={[
        { label: "Consommé", color: chartColors.primary },
        { label: "Cible calculée du jour", color: chartColors.success },
      ]} />
      <SportPilotAccessibleSummary
        caption="Calories et cible des sept derniers jours disponibles"
        rows={points.map((point) => ({
          label: point.label,
          values: [
            { label: "Consommé", value: `${formatNumber(point.calories)} kcal` },
            { label: "Cible", value: `${formatNumber(point.cible)} kcal` },
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
  const [metric, setMetric] = useState<"duration" | "sessions">("duration");
  const animate = useSportPilotChartAnimation();
  const activityTypes = [...new Set(
    data.base.activity.flatMap((week) => week.breakdown.map(({ type }) => type)),
  )];
  const points: Array<Record<string, string | number> & {
    label: string;
    totalDuration: number;
    totalSessions: number;
  }> = data.base.activity.map((week) => ({
    label: week.label,
    totalDuration: week.totalSportMinutes,
    totalSessions: week.sessionCount,
    ...Object.fromEntries(week.breakdown.map((item) => [
      `${item.type}-${metric}`,
      metric === "duration" ? item.durationMinutes : item.sessionCount,
    ])),
  }));
  if (!points.some(({ totalDuration }) => totalDuration > 0)) {
    return (
      <SportPilotEmptyChart
        title="Aucune activité sur cette période"
        description="Termine une activité pour commencer à comparer ton volume sportif."
        action={{ label: "Ajouter une activité", to: routePaths.addActivity }}
      />
    );
  }
  const unit = metric === "duration" ? " min" : "";
  return (
    <>
      <div className="mb-3">
        <label htmlFor="analytics-activity-volume-metric" className="text-sm font-bold text-[var(--sp-text-primary)]">
          Mesure
        </label>
        <select
          id="analytics-activity-volume-metric"
          value={metric}
          onChange={(event) => setMetric(
            event.target.value as "duration" | "sessions",
          )}
          className={`${inputClassName} mt-2`}
        >
          <option value="duration">Durée</option>
          <option value="sessions">Nombre de séances</option>
        </select>
      </div>
      <SportPilotChartContainer label={`${metric === "duration" ? "Durée" : "Nombre de séances"} par sport et par semaine`}>
        <BarChart data={points} margin={chartMargin} accessibilityLayer>
          {chartAxes()}
          <Tooltip content={<SportPilotChartTooltip />} />
          {activityTypes.map((type, index) => (
            <Bar
              key={type}
              dataKey={`${type}-${metric}`}
              name={activityTypeLabels[type]}
              unit={unit}
              stackId="sport-volume"
              fill={[
                chartColors.primary,
                chartColors.secondary,
                chartColors.success,
                chartColors.accent,
                chartColors.warning,
              ][index % 5] ?? chartColors.primary}
              radius={index === activityTypes.length - 1 ? [4, 4, 0, 0] : 0}
              isAnimationActive={animate}
            />
          ))}
        </BarChart>
      </SportPilotChartContainer>
      <SportPilotLegend items={activityTypes.map((type, index) => ({
        label: activityTypeLabels[type],
        color: [
          chartColors.primary,
          chartColors.secondary,
          chartColors.success,
          chartColors.accent,
          chartColors.warning,
        ][index % 5]!,
      }))} />
      <SportPilotAccessibleSummary
        caption={`${metric === "duration" ? "Durée sportive" : "Séances"} par semaine`}
        rows={points.map((point) => ({
          label: point.label,
          values: [
            ...activityTypes.map((type) => ({
              label: activityTypeLabels[type],
              value: `${formatNumber(Number(point[`${type}-${metric}`] ?? 0))}${unit}`,
            })),
            {
              label: "Total",
              value: `${metric === "duration" ? point.totalDuration : point.totalSessions}${unit}`,
            },
          ],
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
  const bestPoint = [...selected.points].sort((left, right) => (
    (right.estimatedOneRepMaxKg ?? right.bestSetWeightKg)
      - (left.estimatedOneRepMaxKg ?? left.bestSetWeightKg)
    || right.date.localeCompare(left.date)
  ))[0];
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

      <SportPilotChartCard
        title="Meilleure série"
        description="Série de travail la plus forte sur la période, séparée du volume."
        metric={bestPoint?.personalRecord ? "Record personnel" : undefined}
        metricLabel={bestPoint?.personalRecord ? "sur les données enregistrées" : undefined}
      >
        {bestPoint ? (
          <dl className="grid gap-px overflow-hidden rounded-lg border border-[var(--sp-border-subtle)] bg-[var(--sp-border-subtle)] sm:grid-cols-4">
            {[
              { label: "Charge", value: `${formatNumber(bestPoint.bestSetWeightKg, 1)} kg` },
              { label: "Répétitions", value: String(bestPoint.bestSetRepetitions) },
              { label: "RPE", value: formatNumber(bestPoint.bestSetRpe, 1) },
              { label: "Date", value: bestPoint.label },
            ].map((item) => (
              <div key={item.label} className="bg-[var(--sp-surface-elevated)] p-3">
                <dt className="text-xs text-[var(--sp-text-muted)]">{item.label}</dt>
                <dd className="mt-1 font-bold text-[var(--sp-text-primary)]">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </SportPilotChartCard>

      <SportPilotChartCard
        title="Groupes musculaires"
        description="Présence hebdomadaire fondée sur les séries de travail terminées."
      >
        <MuscleGroupHeatmap data={data} />
      </SportPilotChartCard>
    </div>
  );
}

function MacroChart({ data }: { data: PerformanceAnalyticsSnapshot }) {
  const latest = data.nutritionDays.filter(
    ({ caloriesKcal }) => caloriesKcal !== undefined,
  ).at(-1);
  if (!latest) {
    return (
      <SportPilotEmptyChart
        title="Macros encore indisponibles"
        description="Renseigne quelques journées de repas pour comparer protéines, glucides et lipides."
        action={{ label: "Renseigner un repas", to: routePaths.food }}
      />
    );
  }
  const rows = [
    {
      label: "Protéines",
      value: latest.proteinGrams,
      target: latest.targetProteinGrams,
      color: chartColors.primary,
    },
    {
      label: "Glucides",
      value: latest.carbohydratesGrams,
      target: latest.targetCarbohydratesGrams,
      color: chartColors.secondary,
    },
    {
      label: "Lipides",
      value: latest.fatGrams,
      target: latest.targetFatGrams,
      color: chartColors.warning,
    },
  ];
  return (
    <div aria-label={`Macronutriments du ${latest.label}`} className="space-y-4">
      <p className="text-xs text-[var(--sp-text-muted)]">
        Dernière journée renseignée : {latest.label}
      </p>
      {rows.map((row) => {
        const value = row.value ?? 0;
        const percentage = row.target && row.target > 0
          ? Math.min(100, value / row.target * 100)
          : 0;
        return (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-[var(--sp-text-primary)]">{row.label}</span>
              <span className="tabular-nums text-[var(--sp-text-secondary)]">
                {formatNumber(row.value, 1)} / {formatNumber(row.target, 1)} g
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-[var(--sp-surface-muted)]"
              role={row.target === undefined ? undefined : "progressbar"}
              aria-label={row.target === undefined ? undefined : `${row.label} consommées`}
              aria-valuemin={row.target === undefined ? undefined : 0}
              aria-valuemax={row.target}
              aria-valuenow={row.value}
            >
              <span
                className="block h-full rounded-full"
                style={{ width: `${percentage}%`, background: row.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MealBreakdown({ data }: { data: PerformanceAnalyticsSnapshot }) {
  const animate = useSportPilotChartAnimation();
  const labels = {
    breakfast: "Petit-déjeuner",
    lunch: "Déjeuner",
    dinner: "Dîner",
    snacks: "Collations",
  } as const;
  const totals = data.nutritionDays.reduce(
    (current, day) => ({
      breakfast: current.breakfast + day.mealCalories.breakfast,
      lunch: current.lunch + day.mealCalories.lunch,
      dinner: current.dinner + day.mealCalories.dinner,
      snacks: current.snacks + day.mealCalories.snacks,
    }),
    { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 },
  );
  const items = Object.entries(totals)
    .map(([slot, value]) => ({
      name: labels[slot as keyof typeof labels],
      value: roundForDisplay(value),
    }))
    .filter(({ value }) => value > 0);
  if (items.length === 0) {
    return (
      <SportPilotEmptyChart
        title="Répartition des repas indisponible"
        description="Ajoute des aliments à un repas pour afficher sa part calorique."
        action={{ label: "Renseigner un repas", to: routePaths.food }}
      />
    );
  }
  return (
    <>
      <SportPilotChartContainer label="Répartition des calories par repas">
        <PieChart accessibilityLayer>
          <Tooltip content={<SportPilotChartTooltip />} />
          <Pie
            data={items}
            dataKey="value"
            nameKey="name"
            innerRadius="50%"
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
                  chartColors.warning,
                ][index % 4] ?? chartColors.primary}
              />
            ))}
          </Pie>
        </PieChart>
      </SportPilotChartContainer>
      <SportPilotLegend items={items.map((item, index) => ({
        label: item.name,
        detail: `${item.value.toLocaleString("fr-FR")} kcal`,
        color: [
          chartColors.primary,
          chartColors.secondary,
          chartColors.success,
          chartColors.warning,
        ][index % 4]!,
      }))} />
    </>
  );
}

function roundForDisplay(value: number): number {
  return Math.round(value);
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

function EnduranceVolumeChart({
  data,
}: {
  data: PerformanceAnalyticsSnapshot;
}) {
  const available = [
    { id: "running", label: "Course", rows: data.base.running },
    { id: "cycling", label: "Vélo", rows: data.base.cycling },
    { id: "swimming", label: "Natation", rows: data.base.swimming },
  ].filter(({ rows }) => rows.some(({ sessionCount }) => sessionCount > 0));
  const [discipline, setDiscipline] = useState(
    () => available[0]?.id ?? "running",
  );
  const [metric, setMetric] = useState<"duration" | "distance" | "sessions">(
    "duration",
  );
  const animate = useSportPilotChartAnimation();
  const selected = available.find(({ id }) => id === discipline) ?? available[0];
  if (!selected) {
    return (
      <SportPilotEmptyChart
        title="Aucune donnée d’endurance"
        description="Termine une sortie de course, vélo ou natation pour comparer ton volume."
        action={{ label: "Ajouter une activité", to: routePaths.addActivity }}
      />
    );
  }

  const points = selected.rows.map((row) => {
    const distance = "distanceMeters" in row
      ? row.distanceMeters
      : row.distanceKm;
    return {
      label: row.label,
      duration: row.durationMinutes,
      distance,
      sessions: row.sessionCount,
    };
  });
  const unit = metric === "duration"
    ? " min"
    : metric === "sessions"
      ? ""
      : selected.id === "swimming"
        ? " m"
        : " km";
  const metricLabel = metric === "duration"
    ? "Durée"
    : metric === "sessions"
      ? "Séances"
      : "Distance";

  return (
    <>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="analytics-endurance-discipline" className="text-sm font-bold text-[var(--sp-text-primary)]">
            Discipline
          </label>
          <select
            id="analytics-endurance-discipline"
            value={selected.id}
            onChange={(event) => setDiscipline(event.target.value)}
            className={`${inputClassName} mt-2`}
          >
            {available.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="analytics-endurance-metric" className="text-sm font-bold text-[var(--sp-text-primary)]">
            Mesure
          </label>
          <select
            id="analytics-endurance-metric"
            value={metric}
            onChange={(event) => setMetric(
              event.target.value as "duration" | "distance" | "sessions",
            )}
            className={`${inputClassName} mt-2`}
          >
            <option value="duration">Durée</option>
            <option value="distance">Distance</option>
            <option value="sessions">Nombre de séances</option>
          </select>
        </div>
      </div>
      <SportPilotChartContainer label={`${metricLabel} de ${selected.label} par semaine${unit ? `, en ${unit.trim()}` : ""}`}>
        <BarChart data={points} margin={chartMargin} accessibilityLayer>
          {chartAxes()}
          <Tooltip content={<SportPilotChartTooltip />} />
          <Bar
            dataKey={metric}
            name={metricLabel}
            unit={unit}
            fill={chartColors.secondary}
            radius={[4, 4, 0, 0]}
            isAnimationActive={animate}
          />
        </BarChart>
      </SportPilotChartContainer>
      <SportPilotAccessibleSummary
        caption={`${metricLabel} de ${selected.label}`}
        rows={points.map((point) => ({
          label: point.label,
          values: [{
            label: metricLabel,
            value: `${formatNumber(point[metric], metric === "distance" ? 1 : 0)}${unit}`,
          }],
        }))}
      />
    </>
  );
}

const recoveryOptions = [
  { id: "energy", label: "Énergie", unit: "niveau" },
  { id: "readiness", label: "Préparation", unit: "niveau" },
  { id: "sleepHours", label: "Sommeil", unit: "h" },
  { id: "hunger", label: "Faim", unit: "niveau" },
] as const;

type RecoveryMetric = (typeof recoveryOptions)[number]["id"];

function signalLabel(value: number): string {
  if (value === 1) return "Faible";
  if (value === 2) return "Normal";
  return "Élevé";
}

function RecoveryChart({ data }: { data: PerformanceAnalyticsSnapshot }) {
  const firstAvailable = recoveryOptions.find(({ id }) => (
    data.recoveryDays.some((day) => day[id] !== undefined)
  ));
  const [metric, setMetric] = useState<RecoveryMetric>(
    () => firstAvailable?.id ?? "energy",
  );
  const animate = useSportPilotChartAnimation();
  const option = recoveryOptions.find(({ id }) => id === metric)!;
  const points = data.recoveryDays
    .filter((day) => day[metric] !== undefined)
    .map((day) => ({
      label: day.label,
      value: day[metric],
    }));
  if (!firstAvailable) {
    return (
      <SportPilotEmptyChart
        title="Récupération encore indisponible"
        description="Renseigne un check-in ou un check-out pour suivre les signaux disponibles."
        action={{ label: "Revenir à l’accueil", to: routePaths.dashboard }}
      />
    );
  }
  return (
    <>
      <div className="mb-3">
        <label htmlFor="analytics-recovery-metric" className="text-sm font-bold text-[var(--sp-text-primary)]">
          Signal
        </label>
        <select
          id="analytics-recovery-metric"
          value={metric}
          onChange={(event) => setMetric(event.target.value as RecoveryMetric)}
          className={`${inputClassName} mt-2`}
        >
          {recoveryOptions.map((item) => (
            <option
              key={item.id}
              value={item.id}
              disabled={!data.recoveryDays.some((day) => day[item.id] !== undefined)}
            >
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <SportPilotChartContainer label={`${option.label} renseigné au fil des check-ins et check-outs`}>
        <LineChart data={points} margin={chartMargin} accessibilityLayer>
          <CartesianGrid vertical={false} stroke={chartColors.grid} strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: chartColors.text, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            domain={metric === "sleepHours" ? ["auto", "auto"] : [1, 3]}
            {...(metric === "sleepHours"
              ? {}
              : { ticks: [1, 2, 3], tickFormatter: signalLabel })}
            tick={{ fill: chartColors.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip
            content={(
              <SportPilotChartTooltip
                valueFormatter={(value) => (
                  metric === "sleepHours"
                    ? `${formatNumber(Number(value), 1)} h`
                    : signalLabel(Number(value))
                )}
              />
            )}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={option.label}
            stroke={chartColors.accent}
            strokeWidth={3}
            dot={{ r: 3 }}
            connectNulls={false}
            isAnimationActive={animate}
          />
        </LineChart>
      </SportPilotChartContainer>
      <SportPilotAccessibleSummary
        caption={`${option.label} par journée renseignée`}
        rows={points.map((point) => ({
          label: point.label,
          values: [{
            label: option.label,
            value: metric === "sleepHours"
              ? `${formatNumber(point.value, 1)} h`
              : signalLabel(Number(point.value)),
          }],
        }))}
      />
    </>
  );
}

function MuscleGroupHeatmap({
  data,
}: {
  data: PerformanceAnalyticsSnapshot;
}) {
  const end = parseISO(data.base.to);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = format(subDays(end, 6 - index), "yyyy-MM-dd");
    return {
      date,
      label: new Intl.DateTimeFormat("fr-FR", { weekday: "narrow" }).format(
        parseISO(date),
      ),
    };
  });
  const groups = [...new Set(
    data.muscleGroupCells
      .filter(({ date }) => dates.some((item) => item.date === date))
      .map(({ muscleGroup }) => muscleGroup),
  )];
  if (groups.length === 0) {
    return (
      <SportPilotEmptyChart
        title="Aucun groupe musculaire à comparer"
        description="Termine une séance avec des séries de travail pour remplir la heatmap."
        action={{ label: "Voir mes séances", to: routePaths.workoutSessions }}
      />
    );
  }
  const maximum = Math.max(
    1,
    ...data.muscleGroupCells.map(({ workingSets }) => workingSets),
  );
  return (
    <div
      role="grid"
      aria-label="Séries de travail par groupe musculaire sur sept jours"
      className="grid grid-cols-[minmax(4.75rem,1fr)_repeat(7,minmax(1.5rem,2rem))] gap-1"
    >
      <span aria-hidden="true" />
      {dates.map((date) => (
        <span key={date.date} role="columnheader" className="text-center text-xs font-bold text-[var(--sp-text-muted)]">
          {date.label}
        </span>
      ))}
      {groups.map((group) => (
        <Fragment key={group}>
          <span key={`${group}-label`} role="rowheader" className="self-center text-xs font-semibold text-[var(--sp-text-secondary)]">
            {muscleGroupLabel(group)}
          </span>
          {dates.map((date) => {
            const workingSets = data.muscleGroupCells.find(
              (cell) => cell.date === date.date && cell.muscleGroup === group,
            )?.workingSets ?? 0;
            return (
              <span
                key={`${group}-${date.date}`}
                role="gridcell"
                aria-label={`${muscleGroupLabel(group)}, ${date.date} : ${workingSets} série${workingSets > 1 ? "s" : ""} de travail`}
                className="aspect-square rounded-[3px] border border-[var(--sp-border-subtle)]"
                style={{
                  background: workingSets === 0
                    ? "var(--sp-surface-muted)"
                    : `color-mix(in srgb, var(--sp-chart-4) ${35 + workingSets / maximum * 60}%, var(--sp-surface-card))`,
                }}
              />
            );
          })}
        </Fragment>
      ))}
      <p className="col-span-full mt-2 text-xs text-[var(--sp-text-muted)]">
        Unité : séries de travail terminées, attribuées au groupe principal de l’exercice.
      </p>
    </div>
  );
}

function ThemeProgressBars({
  data,
}: {
  data: PerformanceAnalyticsSnapshot;
}) {
  const themes = data.themeProgress.filter(({ theme }) => theme.id !== "core");
  if (themes.length === 0) {
    return (
      <SportPilotEmptyChart
        title="Progression des thèmes indisponible"
        description="Ouvre la collection pour consulter les critères de déblocage."
        action={{ label: "Voir la collection", to: routePaths.rewards }}
      />
    );
  }
  return (
    <div className="space-y-4">
      {themes.map((progress) => (
        <div key={progress.theme.id}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-bold text-[var(--sp-text-primary)]">{progress.theme.name}</span>
            <span className="tabular-nums text-[var(--sp-text-secondary)]">
              {progress.unlocked ? "Débloqué" : `${progress.progressPercent} %`}
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-[var(--sp-surface-muted)]"
            role="progressbar"
            aria-label={`Progression vers ${progress.theme.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.unlocked ? 100 : progress.progressPercent}
          >
            <span
              className="block h-full rounded-full bg-[var(--sp-accent-primary)]"
              style={{
                width: `${progress.unlocked ? 100 : progress.progressPercent}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-[var(--sp-text-muted)]">
            {progress.requirementLabel}
          </p>
        </div>
      ))}
      <Link
        to={routePaths.rewards}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--sp-accent-primary)]"
      >
        Voir la collection
        <BarChart3 aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}

export function AnalyticsPage() {
  const { profile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [referenceDate, setReferenceDate] = useState(toLocalDate());
  const activeTab = validTab(searchParams.get("tab"));
  const period = validPeriod(searchParams.get("weeks"));
  const bodyPeriod = validBodyPeriod(searchParams.get("bodyPeriod"));
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
      nutritionDays: fullData.nutritionDays.filter(({ date }) => date >= firstWeek),
      recoveryDays: fullData.recoveryDays.filter(({ date }) => date >= firstWeek),
      muscleGroupCells: fullData.muscleGroupCells.filter(
        ({ date }) => date >= firstWeek,
      ),
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

  const bodyWeightPoints = useMemo(() => {
    if (!fullData || bodyPeriod === "all") {
      return fullData?.allWeightPoints ?? [];
    }
    const days = Number(bodyPeriod);
    const from = format(subDays(parseISO(referenceDate), days - 1), "yyyy-MM-dd");
    return fullData.allWeightPoints.filter(({ date }) => date >= from);
  }, [bodyPeriod, fullData, referenceDate]);

  const updateFilter = (
    key: "tab" | "weeks" | "bodyPeriod",
    value: string,
  ) => {
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
                <div className="mb-4">
                  <label htmlFor="analytics-body-period" className="text-sm font-bold text-[var(--sp-text-primary)]">
                    Période du poids
                  </label>
                  <select
                    id="analytics-body-period"
                    value={bodyPeriod}
                    onChange={(event) => updateFilter(
                      "bodyPeriod",
                      event.target.value,
                    )}
                    className={`${inputClassName} mt-2`}
                  >
                    <option value="30">30 jours</option>
                    <option value="90">3 mois</option>
                    <option value="180">6 mois</option>
                    <option value="365">1 an</option>
                    <option value="all">Tout</option>
                  </select>
                </div>
                <WeightChart data={data} sourcePoints={bodyWeightPoints} />
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
                  description="Progression quotidienne vers les trois cibles, toutes en grammes."
                >
                  <MacroChart data={data} />
                </SportPilotChartCard>
                <SportPilotChartCard
                  title="Répartition des repas"
                  description="Part calorique des repas sur la période sélectionnée."
                  className="xl:col-span-2"
                >
                  <MealBreakdown data={data} />
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
                <SportPilotChartCard
                  title="Volume d’endurance"
                  description="Une discipline et une unité à la fois pour préserver le sens de la donnée."
                  className="xl:col-span-2"
                >
                  <EnduranceVolumeChart data={data} />
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
                <SportPilotChartCard
                  title="Check-in et check-out"
                  description="Un signal déclaré à la fois, sans diagnostic ni recommandation médicale."
                >
                  <RecoveryChart data={data} />
                </SportPilotChartCard>
                <SportPilotChartCard
                  title="Progression vers les thèmes"
                  description="Critères calculés sur les données réelles de suivi et d’activité."
                >
                  <ThemeProgressBars data={data} />
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
