import { Apple, CheckCircle2, Dumbbell, Footprints, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { foodJournalPath, routePaths, weightPath } from '@/app/routePaths';
import type { HistoryDaySummary } from '@/domain/models/analytics';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate } from '@/shared/utils/dates';

interface HistoryDayCardProps {
  day: HistoryDaySummary;
}

function formatNumber(value: number | undefined, unit = ''): string {
  if (value === undefined) return '—';
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}${unit}`;
}

export function HistoryDayCard({ day }: HistoryDayCardProps) {
  const calorieProgress = day.consumedCaloriesKcal === undefined
    ? 'Non suivi'
    : day.targetCaloriesKcal === undefined
      ? `${day.consumedCaloriesKcal.toLocaleString('fr-FR')} kcal`
      : `${day.consumedCaloriesKcal.toLocaleString('fr-FR')} / ${day.targetCaloriesKcal.toLocaleString('fr-FR')} kcal`;

  return (
    <Card className="overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold capitalize text-slate-950 dark:text-white sm:text-lg">
            {formatLocalDate(day.date, 'EEEE d MMMM yyyy')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {day.journalComplete ? 'Journal alimentaire terminé' : 'Journée non clôturée'}
          </p>
        </div>
        {day.journalComplete ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
            Terminé
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Scale aria-hidden="true" className="size-4" /> Poids
          </div>
          <p className="mt-1 font-semibold tabular-nums text-slate-950 dark:text-white">
            {formatNumber(day.weightKg, ' kg')}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Footprints aria-hidden="true" className="size-4" /> Pas
          </div>
          <p className="mt-1 font-semibold tabular-nums text-slate-950 dark:text-white">
            {formatNumber(day.totalSteps)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Dumbbell aria-hidden="true" className="size-4" /> Sport
          </div>
          <p className="mt-1 font-semibold tabular-nums text-slate-950 dark:text-white">
            {day.activityCount} · {day.sportMinutes.toLocaleString('fr-FR')} min
          </p>
          {day.activityCount > 0 ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              ≈ {day.estimatedActivityCaloriesKcal.toLocaleString('fr-FR')} kcal
            </p>
          ) : null}
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Apple aria-hidden="true" className="size-4" /> Calories
          </div>
          <p className="mt-1 text-sm font-semibold tabular-nums text-slate-950 dark:text-white">
            {calorieProgress}
          </p>
        </div>
      </div>

      {day.consumedProteinGrams !== undefined || day.targetProteinGrams !== undefined ? (
        <details className="mt-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
            Détail nutritionnel
          </summary>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Protéines : {formatNumber(day.consumedProteinGrams)} / {formatNumber(day.targetProteinGrams)} g
          </p>
        </details>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Link
          to={foodJournalPath(day.date)}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
        >
          Journal
        </Link>
        <Link
          to={`${routePaths.activities}?date=${encodeURIComponent(day.date)}`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
        >
          Activités
        </Link>
        <Link
          to={weightPath(day.date)}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
        >
          Pesée
        </Link>
      </div>
    </Card>
  );
}
