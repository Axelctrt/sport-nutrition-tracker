import { CopyPlus, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ExerciseHistoryEntry } from '@/application/strength/strengthHistoryService';
import { strengthExerciseHistoryPath } from '@/app/routePaths';
import type { StrengthSet } from '@/domain/models/strength';
import { Button } from '@/shared/ui/Button';
import { formatLocalDate } from '@/shared/utils/dates';

function setSummary(set: StrengthSet): string {
  const rpe = set.rpe === undefined ? '' : ` — RPE ${set.rpe}`;
  return `${set.weightKg} kg × ${set.repetitions}${rpe}`;
}

interface PreviousExercisePerformanceProps {
  exerciseDefinitionId: string;
  performance: ExerciseHistoryEntry | undefined;
  editable: boolean;
  hasCurrentSets: boolean;
  isCopying: boolean;
  onCopy: () => Promise<unknown>;
}

export function PreviousExercisePerformance({
  exerciseDefinitionId,
  performance,
  editable,
  hasCurrentSets,
  isCopying,
  onCopy,
}: PreviousExercisePerformanceProps) {
  if (!performance) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-300">Aucune séance précédente terminée pour cet exercice.</p>
        <Link className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300" to={strengthExerciseHistoryPath(exerciseDefinitionId)}>
          <History aria-hidden="true" className="size-4" />Consulter l’historique
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-900 dark:bg-brand-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">Dernière séance · {formatLocalDate(performance.session.date)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {performance.sets.map((set) => (
              <span key={set.id} className="rounded-lg bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                S{set.setNumber} : {setSummary(set)}
              </span>
            ))}
          </div>
          <Link className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300" to={strengthExerciseHistoryPath(exerciseDefinitionId)}>
            <History aria-hidden="true" className="size-4" />Historique complet
          </Link>
        </div>
        {editable ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={hasCurrentSets || isCopying}
            onClick={() => void onCopy()}
          >
            <CopyPlus aria-hidden="true" className="size-4" />
            {isCopying ? 'Reprise…' : 'Reprendre ces séries'}
          </Button>
        ) : null}
      </div>
      {editable && hasCurrentSets ? <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">La reprise automatique est disponible uniquement avant la saisie de la première série.</p> : null}
    </div>
  );
}
