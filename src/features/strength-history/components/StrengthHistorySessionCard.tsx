import { Repeat2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ExerciseHistoryEntry } from '@/application/strength/strengthHistoryService';
import { workoutSessionPath } from '@/app/routePaths';
import type { StrengthSet } from '@/domain/models/strength';
import { strengthSetTypeLabels } from '@/features/strength-sessions/utils/strengthSetLabels';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate } from '@/shared/utils/dates';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
}

function setSummary(set: StrengthSet): string {
  const rpe = set.rpe === undefined ? '' : ` · RPE ${set.rpe}`;
  return `${set.weightKg} kg × ${set.repetitions}${rpe}`;
}

export function StrengthHistorySessionCard({ entry }: { entry: ExerciseHistoryEntry }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{formatLocalDate(entry.session.date)}</p>
          <h3 className="mt-1 break-words font-semibold text-slate-950 dark:text-white">{entry.session.sourceTemplateNameSnapshot ?? 'Séance libre'}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {entry.sets.length} série{entry.sets.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">Volume</p>
          <p className="mt-1 font-bold text-slate-950 dark:text-white">{formatNumber(entry.totalVolumeKg)} kg</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">Séries de travail</p>
          <p className="mt-1 font-bold text-slate-950 dark:text-white">{entry.workingSets.length}</p>
        </div>
      </div>

      <details className="mt-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">Voir les séries</summary>
        <div className="mt-3 space-y-2">
          {entry.sets.map((set) => (
            <div key={set.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-950 dark:text-white">Série {set.setNumber}</p>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{strengthSetTypeLabels[set.type]}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{setSummary(set)}</p>
              {set.notes ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{set.notes}</p> : null}
            </div>
          ))}
        </div>
      </details>

      <Link to={workoutSessionPath(entry.session.id)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 sm:w-auto">
        <Repeat2 aria-hidden="true" className="size-4" />
        Voir la séance
      </Link>
    </Card>
  );
}
