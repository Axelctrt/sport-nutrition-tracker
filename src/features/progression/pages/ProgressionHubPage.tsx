import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Dumbbell,
  FileText,
  Flame,
  History,
  Plus,
  Scale,
  Target,
  Utensils,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { useProfile } from "@/app/providers/profile/useProfile";
import { routePaths } from "@/app/routePaths";
import type {
  ProgressionHubSummary,
  ProgressionMainSignal,
  ProgressionSignalDestination,
} from "@/application/progression/progressionHubSummaryService";
import { useProgressionHubSummary } from "@/features/progression/hooks/useProgressionHubSummary";
import { SportPilotMiniChart } from "@/shared/charts/SportPilotCharts";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { InlineNotice } from "@/shared/ui/InlineNotice";
import { SportPilotAnimatedTabs } from "@/shared/ui/SportPilotAnimatedTabs";
import { cn } from "@/shared/utils/cn";
import { toLocalDate } from "@/shared/utils/dates";

const destinationPaths: Record<ProgressionSignalDestination, string> = {
  weeklyReview: routePaths.weeklyReview,
  weight: `${routePaths.analytics}?tab=body`,
  nutrition: `${routePaths.analytics}?tab=nutrition`,
  activity: `${routePaths.analytics}?tab=activity`,
  strength: `${routePaths.analytics}?tab=strength`,
  regularity: `${routePaths.analytics}?tab=regularity`,
};

const progressionRanges = [
  { id: "7", label: "7 jours" },
  { id: "30", label: "30 jours" },
  { id: "90", label: "3 mois" },
] as const;

type ProgressionRange = (typeof progressionRanges)[number]["id"];

function validRange(value: string | null): ProgressionRange {
  return progressionRanges.some(({ id }) => id === value)
    ? value as ProgressionRange
    : "30";
}

function rangeWeeks(range: ProgressionRange): number {
  if (range === "7") return 1;
  if (range === "30") return 4;
  return 12;
}

function signed(value: number, unit: string): string {
  return `${value > 0 ? "+" : ""}${value.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  })} ${unit}`;
}

function weightValue(weight: ProgressionHubSummary["weight"]): string {
  if (weight.latestAverageKg === undefined) return "À renseigner";
  return `${weight.latestAverageKg.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  })} kg`;
}

function weightDetail(weight: ProgressionHubSummary["weight"]): string {
  if (weight.state === "empty") return "Ajoute une pesée pour commencer la tendance.";
  if (weight.state === "insufficient") return "Une autre semaine est nécessaire pour comparer.";
  if (weight.changeKg === undefined) return "Moyenne hebdomadaire";
  return `${signed(weight.changeKg, "kg")} depuis la semaine précédente`;
}

function nutritionValue(
  nutrition: ProgressionHubSummary["nutrition"],
): string {
  if (nutrition.averageCaloriesKcal === undefined) return "À renseigner";
  return `${Math.round(nutrition.averageCaloriesKcal).toLocaleString("fr-FR")} kcal`;
}

function nutritionDetail(
  nutrition: ProgressionHubSummary["nutrition"],
): string {
  if (nutrition.trackedDays === 0) {
    return "Ajoute des aliments pour obtenir une moyenne.";
  }
  const target = nutrition.averageTargetCaloriesKcal === undefined
    ? ""
    : `, cible ${Math.round(nutrition.averageTargetCaloriesKcal).toLocaleString("fr-FR")} kcal`;
  return `${nutrition.trackedDays} jour${nutrition.trackedDays > 1 ? "s" : ""} suivi${nutrition.trackedDays > 1 ? "s" : ""}${target}`;
}

function signalClasses(tone: ProgressionMainSignal["tone"]): string {
  if (tone === "positive") {
    return "border-[var(--sp-success)] bg-[color-mix(in_srgb,var(--sp-success)_8%,var(--sp-surface-card))]";
  }
  if (tone === "attention") {
    return "border-[var(--sp-warning)] bg-[color-mix(in_srgb,var(--sp-warning)_8%,var(--sp-surface-card))]";
  }
  return "border-[var(--sp-accent-primary)] bg-[var(--sp-surface-card)]";
}

function MetricCard({
  title,
  value,
  detail,
  values,
  chartLabel,
  to,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  values: readonly number[];
  chartLabel: string;
  to: string;
  icon: typeof Activity;
}) {
  return (
    <Card padding="md" className="min-w-0 border-[var(--sp-border-subtle)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--sp-text-secondary)]">
            <Icon aria-hidden="true" className="size-4 text-[var(--sp-accent-primary)]" />
            {title}
          </p>
          <p className="mt-2 text-xl font-bold text-[var(--sp-text-primary)]">{value}</p>
          <p className="mt-1 min-h-10 text-sm leading-5 text-[var(--sp-text-secondary)]">
            {detail}
          </p>
        </div>
        <Link
          to={to}
          aria-label={`Voir le détail ${title.toLowerCase()}`}
          className="sp-button--pressable grid size-11 shrink-0 place-items-center rounded-[var(--sp-radius-control)] text-[var(--sp-accent-primary)] hover:bg-[var(--sp-surface-muted)]"
        >
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {values.length > 0 ? (
        <SportPilotMiniChart values={values} label={chartLabel} />
      ) : (
        <div className="mt-3 grid h-12 place-items-center rounded-md border border-dashed border-[var(--sp-border-subtle)] bg-[var(--sp-surface-muted)] px-2 text-center text-xs font-medium text-[var(--sp-text-muted)]">
          Données insuffisantes
        </div>
      )}
    </Card>
  );
}

function ReviewSummary({
  review,
}: {
  review: ProgressionHubSummary["review"];
}) {
  let title = "Bilan en attente de données";
  let detail = "Quelques jours de suivi sont encore nécessaires.";

  if (review.state === "adjustmentProposed") {
    const adjustment = review.proposedAdjustmentKcal ?? 0;
    title = `${adjustment > 0 ? "+" : ""}${adjustment} kcal/j à valider`;
    detail = "La recommandation est disponible dans le bilan hebdomadaire.";
  } else if (review.state === "noChange") {
    title = "Aucun ajustement proposé";
    detail = "La cible actuelle est conservée pour cette semaine.";
  } else if (review.state === "accepted") {
    title = "Dernier ajustement accepté";
    detail = "La décision du dernier bilan a été appliquée.";
  } else if (review.state === "rejected") {
    title = "Dernier ajustement refusé";
    detail = "La cible précédente a été conservée.";
  } else if (review.state === "insufficient") {
    title = "Bilan encore incomplet";
    detail = review.completedFoodDays !== undefined
      ? `${review.completedFoodDays} jour${review.completedFoodDays > 1 ? "s" : ""} de nutrition exploitable${review.completedFoodDays > 1 ? "s" : ""}.`
      : detail;
  }

  return (
    <Card padding="md" aria-labelledby="progression-review-title">
      <p className="text-xs font-bold uppercase text-[var(--sp-accent-primary)]">
        Bilan hebdomadaire
      </p>
      <h2 id="progression-review-title" className="mt-1 text-base font-bold text-[var(--sp-text-primary)]">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-5 text-[var(--sp-text-secondary)]">{detail}</p>
      <Link
        to={routePaths.weeklyReview}
        className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--sp-accent-primary)]"
      >
        Ouvrir le bilan
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </Card>
  );
}

function GoalSummary({ goal }: { goal: ProgressionHubSummary["goal"] }) {
  const empty = goal.state === "empty";
  const title = empty ? "Aucun objectif actif" : goal.title ?? "Objectif actif";
  const detail = goal.state === "overdue"
    ? "Échéance dépassée, objectif à revoir."
    : goal.state === "dueSoon"
      ? `${goal.daysRemaining ?? 0} jour${goal.daysRemaining === 1 ? "" : "s"} restant${goal.daysRemaining === 1 ? "" : "s"}.`
      : goal.progressPercent === undefined
        ? "Définis une cible concrète pour suivre ton avancée."
        : `${Math.round(goal.progressPercent)} % atteint.`;

  return (
    <Card padding="md" aria-labelledby="progression-goal-title">
      <p className="text-xs font-bold uppercase text-[var(--sp-accent-primary)]">
        Objectif
      </p>
      <h2 id="progression-goal-title" className="mt-1 text-base font-bold text-[var(--sp-text-primary)]">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-5 text-[var(--sp-text-secondary)]">{detail}</p>
      <Link
        to={routePaths.goals}
        className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--sp-accent-primary)]"
      >
        {empty ? "Créer un objectif" : "Voir l’objectif"}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </Card>
  );
}

export function ProgressionHubPage() {
  const { profile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const summary = useProgressionHubSummary(toLocalDate(), profile);
  const range = validRange(searchParams.get("range"));
  const visibleWeeks = rangeWeeks(range);

  const updateRange = (nextRange: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("range", nextRange);
    setSearchParams(next, { replace: true });
  };

  if (!profile) return null;

  return (
    <section aria-labelledby="progression-hub-title" className="min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 id="progression-hub-title" className="text-3xl font-bold text-[var(--sp-text-primary)]">
            Progression
          </h1>
          <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
            Comprendre l’évolution de tes données et décider de la suite.
          </p>
        </div>
        <Link to={routePaths.weight} className="sp-button sp-button--secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-bold">
          <Plus aria-hidden="true" className="size-4" />
          Ajouter une pesée
        </Link>
      </div>

      <SportPilotAnimatedTabs
        label="Période de progression"
        tabs={progressionRanges}
        activeTab={range}
        onChange={updateRange}
        className="mt-5"
      />

      {summary.status === "error" ? (
        <InlineNotice className="mt-6" tone="error" title="Synthèse indisponible" role="alert">
          <p>{summary.errorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void summary.refresh()}>
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {summary.status === "loading" || !summary.data ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2" aria-label="Chargement de la progression">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-[var(--sp-radius-card)] bg-[var(--sp-surface-muted)] motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <Card
            padding="md"
            className={cn("sp-motion-card sp-motion-card--priority border-2", signalClasses(summary.data.signal.tone))}
            aria-labelledby="progression-main-signal"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-elevated)] text-[var(--sp-accent-primary)]">
                <Flame aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-[var(--sp-text-muted)]">
                  Signal principal
                </p>
                <h2 id="progression-main-signal" className="mt-1 text-lg font-bold text-[var(--sp-text-primary)]">
                  {summary.data.signal.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--sp-text-secondary)]">
                  {summary.data.signal.detail}
                </p>
                <Link
                  to={destinationPaths[summary.data.signal.destination]}
                  className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--sp-accent-primary)]"
                >
                  Voir le détail
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>
          </Card>

          <section aria-labelledby="progression-overview-title">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 id="progression-overview-title" className="text-lg font-bold text-[var(--sp-text-primary)]">
                  Vue d’ensemble
                </h2>
                <p className="text-sm text-[var(--sp-text-secondary)]">Aperçu compact, détails dans Analyses.</p>
              </div>
              <Link to={routePaths.analytics} className="hidden min-h-11 items-center gap-2 text-sm font-bold text-[var(--sp-accent-primary)] sm:inline-flex">
                Tous les graphiques
                <BarChart3 aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Poids"
                value={weightValue(summary.data.weight)}
                detail={weightDetail(summary.data.weight)}
                values={summary.data.series.weight.slice(-visibleWeeks)}
                chartLabel={`Évolution des moyennes de poids sur ${progressionRanges.find(({ id }) => id === range)?.label}`}
                to={`${routePaths.analytics}?tab=body`}
                icon={Scale}
              />
              <MetricCard
                title="Activité"
                value={`${summary.data.activity.totalMinutes} min`}
                detail={`${summary.data.activity.sessionCount} séance${summary.data.activity.sessionCount > 1 ? "s" : ""} terminée${summary.data.activity.sessionCount > 1 ? "s" : ""} cette semaine`}
                values={summary.data.series.activity.slice(-visibleWeeks)}
                chartLabel={`Minutes d’activité sur ${progressionRanges.find(({ id }) => id === range)?.label}`}
                to={`${routePaths.analytics}?tab=activity`}
                icon={Activity}
              />
              <MetricCard
                title="Nutrition"
                value={nutritionValue(summary.data.nutrition)}
                detail={nutritionDetail(summary.data.nutrition)}
                values={summary.data.series.nutrition.slice(-visibleWeeks)}
                chartLabel={`Calories moyennes sur ${progressionRanges.find(({ id }) => id === range)?.label}`}
                to={`${routePaths.analytics}?tab=nutrition`}
                icon={Utensils}
              />
              {summary.data.strength.state === "ready" ? (
                <MetricCard
                  title="Force"
                  value={summary.data.strength.latestOneRepMaxKg === undefined
                    ? summary.data.strength.exerciseName ?? "Exercice suivi"
                    : `${summary.data.strength.latestOneRepMaxKg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kg`}
                  detail={`${summary.data.strength.exerciseName ?? "Exercice"}${summary.data.strength.changePercent === undefined ? "" : `, ${signed(summary.data.strength.changePercent, "%")} sur la période`}`}
                  values={summary.data.series.strength.slice(-visibleWeeks)}
                  chartLabel={`Progression de ${summary.data.strength.exerciseName ?? "l’exercice"}`}
                  to={`${routePaths.analytics}?tab=strength`}
                  icon={Dumbbell}
                />
              ) : null}
            </div>
          </section>

          <nav aria-labelledby="progression-domains-title">
            <div className="mb-3">
              <h2 id="progression-domains-title" className="text-lg font-bold text-[var(--sp-text-primary)]">
                Tes domaines
              </h2>
              <p className="text-sm text-[var(--sp-text-secondary)]">Accède directement à l’analyse utile.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { path: `${routePaths.analytics}?tab=body`, label: "Corps et poids", icon: Scale },
                { path: `${routePaths.analytics}?tab=nutrition`, label: "Nutrition", icon: Utensils },
                { path: `${routePaths.analytics}?tab=activity`, label: "Activité et endurance", icon: Activity },
                { path: `${routePaths.analytics}?tab=strength`, label: "Musculation", icon: Dumbbell },
                { path: `${routePaths.analytics}?tab=regularity`, label: "Régularité et récupération", icon: CalendarCheck2 },
                { path: routePaths.goals, label: "Objectifs", icon: Target },
              ].map((domain) => {
                const Icon = domain.icon;
                return (
                  <Link
                    key={domain.label}
                    to={domain.path}
                    className="sp-card sp-card--interactive flex min-h-12 items-center justify-between gap-3 px-3 text-sm font-bold text-[var(--sp-text-primary)]"
                  >
                    <span className="flex items-center gap-3">
                      <Icon aria-hidden="true" className="size-4 text-[var(--sp-accent-primary)]" />
                      {domain.label}
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 text-[var(--sp-text-muted)]" />
                  </Link>
                );
              })}
            </div>
          </nav>

          <section aria-labelledby="progression-week-title">
            <div className="mb-3">
              <h2 id="progression-week-title" className="text-lg font-bold text-[var(--sp-text-primary)]">
                Cette semaine
              </h2>
              <p className="text-sm text-[var(--sp-text-secondary)]">Prévu, réalisé et suivi enregistré.</p>
            </div>
            <Card padding="none" className="overflow-hidden">
              <dl className="grid gap-px bg-[var(--sp-border-subtle)] sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Activités réalisées / prévues",
                    value: `${summary.data.week.completedActivities} / ${summary.data.week.plannedActivities}`,
                    icon: CalendarCheck2,
                  },
                  {
                    label: "Repos confirmés",
                    value: summary.data.week.confirmedRestDays.toString(),
                    icon: CheckCircle2,
                  },
                  {
                    label: "Jours avec check-in",
                    value: summary.data.week.checkInDays.toString(),
                    icon: Activity,
                  },
                  {
                    label: "Jours avec nutrition",
                    value: summary.data.week.nutritionDays.toString(),
                    icon: Utensils,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="bg-[var(--sp-surface-card)] p-4">
                      <dt className="flex items-center gap-2 text-sm text-[var(--sp-text-secondary)]">
                        <Icon aria-hidden="true" className="size-4 text-[var(--sp-accent-primary)]" />
                        {item.label}
                      </dt>
                      <dd className="mt-2 text-xl font-bold tabular-nums text-[var(--sp-text-primary)]">
                        {item.value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </Card>
          </section>

          <div className="grid gap-3 md:grid-cols-2">
            <ReviewSummary review={summary.data.review} />
            <GoalSummary goal={summary.data.goal} />
          </div>

          <nav aria-label="Ressources de progression" className="border-t border-[var(--sp-border-subtle)] pt-5">
            <h2 className="text-base font-bold text-[var(--sp-text-primary)]">Explorer</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                { path: routePaths.reports, label: "Rapports", icon: FileText },
                { path: routePaths.weeklyReview, label: "Bilan hebdomadaire", icon: CalendarCheck2 },
                { path: routePaths.history, label: "Historique détaillé", icon: History },
              ].map((destination) => {
                const Icon = destination.icon;
                return (
                  <Link
                    key={destination.path}
                    to={destination.path}
                    className="sp-card sp-card--interactive flex min-h-12 items-center gap-3 px-3 text-sm font-bold text-[var(--sp-text-primary)]"
                  >
                    <Icon aria-hidden="true" className="size-4 text-[var(--sp-accent-primary)]" />
                    {destination.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </section>
  );
}
