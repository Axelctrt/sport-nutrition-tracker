import { ChevronDown, CopyPlus, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ExerciseHistoryEntry } from '@/application/strength/strengthHistoryService';
import { strengthExerciseHistoryPath } from '@/app/routePaths';
import { resolveTrackingMode } from '@/domain/strength/strengthTracking';
import { setPerformanceSummary } from '@/features/strength-history/utils/strengthPerformanceFormatting';
import { Button } from '@/shared/ui/Button';
import { formatLocalDate } from '@/shared/utils/dates';

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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-300">Aucune performance précédente</p>
        <Link
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
          to={strengthExerciseHistoryPath(exerciseDefinitionId)}
        >
          <History aria-hidden="true" className="size-4" />
          Historique
        </Link>
      </div>
    );
  }

  const trackingMode = resolveTrackingMode(performance.sessionExercise);

  return (
    <details
      className="group mt-4 rounded-xl border border-brand-200 bg-brand-50/70 dark:border-brand-900 dark:bg-brand-950/20"
      open={editable && !hasCurrentSets ? true : undefined}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <History aria-hidden="true" className="size-4 shrink-0 text-brand-700 dark:text-brand-300" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-brand-800 dark:text-brand-200">
              Dernière séance · {formatLocalDate(performance.session.date)}
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              {performance.sets.length} série{performance.sets.length > 1 ? 's' : ''}
            </span>
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="border-t border-brand-200 p-3 dark:border-brand-900">
        <div className="flex flex-wrap gap-2">
          {performance.sets.map((set) => (
            <span key={set.id} className="rounded-lg bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
              S{set.setNumber} : {setPerformanceSummary(set, trackingMode, performance.bodyWeightKg)}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
            to={strengthExerciseHistoryPath(exerciseDefinitionId)}
          >
            <History aria-hidden="true" className="size-4" />
            Historique complet
          </Link>
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
        {editable && hasCurrentSets ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Disponible uniquement avant la première série.
          </p>
        ) : null}
      </div>
    </details>
  );
}
