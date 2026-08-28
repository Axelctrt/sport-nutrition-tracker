import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import type { DailyCoachResult } from '@/domain/coach/dailyCoach';

interface DashboardDailyCoachCardProps {
  result?: DailyCoachResult;
  unavailable?: boolean;
}

const VERDICT_TONE: Record<DailyCoachResult['verdict'], string> = {
  insufficientData: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
  planMaintained: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30',
  recoveryToWatch: 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30',
  temporaryVariation: 'border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/30',
  attentionRequired: 'border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/30',
};

export function DashboardDailyCoachCard({
  result,
  unavailable = false,
}: DashboardDailyCoachCardProps) {
  if (!result && !unavailable) return null;

  return (
    <article
      aria-labelledby="daily-coach-title"
      className={`mt-5 rounded-2xl border p-5 shadow-sm ${
        result
          ? VERDICT_TONE[result.verdict]
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
        Coach du jour
      </p>
      <h2
        id="daily-coach-title"
        className="mt-1 text-lg font-bold text-slate-950 dark:text-white"
      >
        {result?.title ?? 'Coach du jour indisponible'}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
        {result?.message
          ?? 'Le reste de tes données reste accessible. Tu peux réessayer en actualisant l’Accueil.'}
      </p>
      <Link
        to={routePaths.coach}
        className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--sp-accent-primary)]"
      >
        Voir le Coach
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </article>
  );
}
