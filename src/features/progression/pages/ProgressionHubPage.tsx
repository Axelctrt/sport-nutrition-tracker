import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  History,
  MoreHorizontal,
  Plus,
  Scale,
  Target,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import type { ProgressionHubSummary } from '@/application/progression/progressionHubSummaryService';
import { useProgressionHubSummary } from '@/features/progression/hooks/useProgressionHubSummary';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { toLocalDate } from '@/shared/utils/dates';

function weightTrendLabel(weight: ProgressionHubSummary['weight']): string {
  if (weight.state === 'empty') return 'Aucune donnée';
  if (weight.state === 'insufficient') return 'Tendance à confirmer';
  if (weight.state === 'aligned') return 'Dans le sens de l’objectif';
  if (weight.state === 'stable') return 'Tendance stable';
  return 'Tendance à surveiller';
}

function waistTrendLabel(review: ProgressionHubSummary['review']): string {
  const trend = review.waistTrendCmPerWeek;
  if (trend === undefined) return 'Données insuffisantes';
  if (Math.abs(trend) < 0.1) return 'Tendance stable';
  return trend < 0 ? 'En baisse' : 'En hausse';
}

function activityTrendLabel(activity: ProgressionHubSummary['activity']): string {
  if (activity.sessionCount === 0) return 'Aucune séance cette semaine';
  if (activity.sessionCount >= 3) return 'Entraînement régulier';
  return `${activity.sessionCount} séance${activity.sessionCount > 1 ? 's' : ''} cette semaine`;
}

function reviewLabels(review: ProgressionHubSummary['review']): {
  title: string;
  detail: string;
  reasons: string[];
} {
  if (review.state === 'empty') {
    return { title: 'Encore quelques journées nécessaires', detail: 'Aucun bilan exploitable pour le moment.', reasons: [] };
  }
  if (review.state === 'insufficient') {
    const tracked = review.completedFoodDays;
    const span = review.trackingSpanDays;
    return {
      title: 'Encore quelques journées nécessaires',
      detail: tracked !== undefined && span !== undefined
        ? `${tracked} jour${tracked > 1 ? 's' : ''} exploitable${tracked > 1 ? 's' : ''} sur ${span}`
        : 'Données encore trop variables cette semaine.',
      reasons: review.blockingFactors ?? [],
    };
  }
  if (review.state === 'noChange') {
    return {
      title: 'Aucun ajustement',
      detail: 'La tendance actuelle ne justifie pas de modifier la cible.',
      reasons: review.reasons ?? [],
    };
  }
  if (review.state === 'adjustmentProposed') {
    const adjustment = review.proposedAdjustmentKcal ?? 0;
    return {
      title: `${adjustment > 0 ? '+' : ''}${adjustment} kcal/j recommandé`,
      detail: 'À valider dans le bilan.',
      reasons: review.reasons ?? [],
    };
  }
  if (review.state === 'accepted') {
    return { title: 'Ajustement validé', detail: 'La dernière recommandation a été acceptée.', reasons: review.reasons ?? [] };
  }
  return { title: 'Ajustement refusé', detail: 'La cible actuelle est conservée.', reasons: review.reasons ?? [] };
}

function goalLabels(goal: ProgressionHubSummary['goal']): {
  title: string;
  detail: string;
} {
  if (goal.state === 'empty') return { title: 'Aucun objectif actif', detail: '' };
  if (goal.state === 'overdue') return { title: goal.title ?? 'Objectif en retard', detail: 'Échéance dépassée, objectif à revoir.' };
  if (goal.state === 'dueSoon') return { title: goal.title ?? 'Objectif proche', detail: `${goal.daysRemaining ?? 0} jour(s) restant(s).` };
  return {
    title: goal.title ?? 'Objectif actif',
    detail: goal.progressPercent === undefined
      ? 'Progression en cours.'
      : `${Math.round(goal.progressPercent)} % atteint.`,
  };
}

export function ProgressionHubPage() {
  const { profile } = useProfile();
  const summary = useProgressionHubSummary(toLocalDate(), profile);
  const [moreOpen, setMoreOpen] = useState(false);

  if (!profile) return null;
  const review = summary.data ? reviewLabels(summary.data.review) : undefined;
  const goal = summary.data ? goalLabels(summary.data.goal) : undefined;

  return (
    <section aria-labelledby="progression-hub-title" className="min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 id="progression-hub-title" className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Progression
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to={routePaths.weight}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Plus aria-hidden="true" className="size-4" />
            Ajouter une pesée
          </Link>
          <Button variant="secondary" aria-label="Plus d’outils de progression" onClick={() => setMoreOpen(true)}>
            <MoreHorizontal aria-hidden="true" className="size-5" />
            Plus
          </Button>
        </div>
      </div>

      {summary.status === 'error' ? (
        <InlineNotice className="mt-6" tone="error" title="Synthèse indisponible" role="alert">
          <p>{summary.errorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void summary.refresh()}>Réessayer</Button>
        </InlineNotice>
      ) : null}

      {summary.status === 'loading' || !summary.data ? (
        <div className="mt-6 grid gap-4" aria-label="Chargement de la progression">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <Card className="overflow-hidden" aria-labelledby="progression-evolution-title">
            <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
              <h2 id="progression-evolution-title" className="text-xl font-bold text-slate-950 dark:text-white">
                Mon évolution
              </h2>
            </div>
            <dl className="grid gap-px bg-slate-200 sm:grid-cols-3 dark:bg-slate-800">
              {[
                { label: 'Poids', value: weightTrendLabel(summary.data.weight), icon: Scale },
                { label: 'Tour de taille', value: waistTrendLabel(summary.data.review), icon: BarChart3 },
                { label: 'Entraînement', value: activityTrendLabel(summary.data.activity), icon: Activity },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="bg-white p-4 dark:bg-slate-900">
                    <dt className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Icon aria-hidden="true" className="size-4" />
                      {metric.label}
                    </dt>
                    <dd className="mt-2 font-semibold text-slate-950 dark:text-white">{metric.value}</dd>
                  </div>
                );
              })}
            </dl>
            <div className="px-4 py-3 sm:px-5">
              <Link to={routePaths.analytics} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
                Voir les tendances
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </Card>

          <Card className="p-4 sm:p-5" aria-labelledby="progression-review-title">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Bilan de la semaine
            </p>
            <h2 id="progression-review-title" className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              {review?.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{review?.detail}</p>
            {review?.reasons.length ? (
              <ul className="mt-3 space-y-1.5" aria-label="Raisons de la recommandation">
                {review.reasons.slice(0, 3).map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700 dark:text-brand-300" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <Link to={routePaths.weeklyReview} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
              Ouvrir le bilan
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Card>

          <Card className="p-4 sm:p-5" aria-labelledby="progression-goals-title">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Objectifs
            </p>
            <h2 id="progression-goals-title" className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              {goal?.title}
            </h2>
            {goal?.detail ? (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{goal.detail}</p>
            ) : null}
            <Link to={routePaths.goals} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
              {summary.data.goal.state === 'empty' ? 'Créer un objectif' : 'Voir mon objectif'}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Card>
        </div>
      )}

      <BottomSheet
        open={moreOpen}
        title="Plus d’outils"
        description="Rapports, historique détaillé et accomplissements."
        onClose={() => setMoreOpen(false)}
      >
        <nav className="space-y-2" aria-label="Outils secondaires de progression">
          {[
            { path: routePaths.reports, label: 'Rapports', icon: FileText },
            { path: routePaths.history, label: 'Historique détaillé', icon: History },
            { path: routePaths.rewards, label: 'Récompenses', icon: Trophy },
            { path: routePaths.goals, label: 'Tous les objectifs', icon: Target },
          ].map((destination) => {
            const Icon = destination.icon;
            return (
              <Link
                key={destination.path}
                to={destination.path}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 px-3 hover:border-brand-300 dark:border-slate-800 dark:hover:border-brand-700"
                onClick={() => setMoreOpen(false)}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0 text-brand-700 dark:text-brand-300" />
                <span className="font-semibold text-slate-950 dark:text-white">{destination.label}</span>
              </Link>
            );
          })}
        </nav>
      </BottomSheet>
    </section>
  );
}
