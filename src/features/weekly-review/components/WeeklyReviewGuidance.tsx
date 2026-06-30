import {
  ArrowRight,
  CircleAlert,
  Lightbulb,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { routePaths } from '@/app/routePaths';
import type {
  WeeklyReviewAction,
  WeeklyReviewInsights,
} from '@/domain/reviews/weeklyReviewInsights';
import { Card } from '@/shared/ui/Card';

interface WeeklyReviewGuidanceProps {
  insights: WeeklyReviewInsights;
}

const actionPaths: Record<WeeklyReviewAction, string> = {
  planning: routePaths.weeklyPlanning,
  food: routePaths.food,
  weight: routePaths.weight,
  goals: routePaths.goals,
  activities: routePaths.activities,
};

export function WeeklyReviewGuidance({
  insights,
}: WeeklyReviewGuidanceProps) {
  return (
    <Card className="p-4 sm:p-5" aria-labelledby="weekly-guidance-title">
      <div className="flex items-start gap-3">
        <Lightbulb
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300"
        />
        <div className="min-w-0">
          <h2
            id="weekly-guidance-title"
            className="font-semibold text-slate-950 dark:text-white"
          >
            Lecture de la semaine
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Les constats ci-dessous proviennent uniquement des données enregistrées.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <section
          className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/25"
          aria-labelledby="weekly-successes-title"
        >
          <div className="flex items-center gap-2">
            <Trophy
              aria-hidden="true"
              className="size-5 text-emerald-700 dark:text-emerald-300"
            />
            <h3
              id="weekly-successes-title"
              className="font-semibold text-emerald-950 dark:text-emerald-100"
            >
              Réussites
            </h3>
          </div>
          {insights.successes.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-emerald-950 dark:text-emerald-100">
              {insights.successes.map((success) => (
                <li key={success} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{success}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-emerald-900 dark:text-emerald-200">
              Les données disponibles ne permettent pas encore d’identifier une réussite principale.
            </p>
          )}
        </section>

        <section
          className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/25"
          aria-labelledby="weekly-attention-title"
        >
          <div className="flex items-center gap-2">
            <CircleAlert
              aria-hidden="true"
              className="size-5 text-amber-700 dark:text-amber-300"
            />
            <h3
              id="weekly-attention-title"
              className="font-semibold text-amber-950 dark:text-amber-100"
            >
              Points d’attention
            </h3>
          </div>
          {insights.attentionPoints.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-amber-950 dark:text-amber-100">
              {insights.attentionPoints.map((attention) => (
                <li key={attention} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{attention}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-amber-900 dark:text-amber-200">
              Aucun point d’attention prioritaire n’est détecté dans les données disponibles.
            </p>
          )}
        </section>
      </div>

      <section className="mt-4" aria-labelledby="weekly-next-actions-title">
        <h3
          id="weekly-next-actions-title"
          className="font-semibold text-slate-950 dark:text-white"
        >
          Actions pour la semaine suivante
        </h3>
        <div className="mt-3 grid gap-2 lg:grid-cols-3">
          {insights.recommendations.map((recommendation) => (
            <div
              key={recommendation.id}
              className="flex min-w-0 flex-col rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {recommendation.title}
              </p>
              <p className="mt-1 flex-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                {recommendation.detail}
              </p>
              <Link
                to={actionPaths[recommendation.action]}
                className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {recommendation.actionLabel}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </Card>
  );
}
