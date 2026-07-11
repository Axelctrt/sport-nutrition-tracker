import { ArrowDown, CheckCircle2, Dumbbell } from 'lucide-react';
import type { WorkoutSessionProgress } from '@/application/strength/workoutSessionProgress';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

interface WorkoutSessionProgressCardProps {
  progress: WorkoutSessionProgress;
  onContinue: (exerciseId: string, setId?: string) => void;
}

function setProgressLabel(progress: WorkoutSessionProgress): string {
  if (progress.totalSetCount === 0) return 'Aucune série prévue pour le moment';
  return `${progress.completedSetCount}/${progress.totalSetCount} séries validées`;
}

export function WorkoutSessionProgressCard({
  progress,
  onContinue,
}: WorkoutSessionProgressCardProps) {
  const nextStep = progress.nextStep;

  return (
    <Card className="mt-5 overflow-hidden border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900 dark:bg-violet-950/20 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-700 text-white">
          {progress.isComplete ? (
            <CheckCircle2 aria-hidden="true" className="size-5" />
          ) : (
            <Dumbbell aria-hidden="true" className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">Progression de la séance</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {setProgressLabel(progress)} · {progress.completedExerciseCount}/{progress.exerciseCount} exercices terminés
              </p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-sm font-bold tabular-nums text-violet-800 shadow-sm dark:bg-slate-900 dark:text-violet-200">
              {progress.percentage}%
            </span>
          </div>

          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-950"
            role="progressbar"
            aria-label="Progression de la séance"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percentage}
          >
            <div
              className="h-full rounded-full bg-violet-700 transition-[width] motion-reduce:transition-none dark:bg-violet-400"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {progress.isComplete ? (
            <p className="mt-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              Tous les exercices prévus sont terminés. Tu peux clôturer la séance.
            </p>
          ) : nextStep ? (
            <div className="mt-3 flex flex-col gap-3 rounded-xl bg-white/80 p-3 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">À faire maintenant</p>
                <p className="mt-1 truncate font-semibold text-slate-950 dark:text-white">
                  {nextStep.exerciseName} · série {nextStep.setNumber}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="w-full shrink-0 sm:w-auto"
                onClick={() => onContinue(nextStep.exerciseId, nextStep.setId)}
              >
                <ArrowDown aria-hidden="true" className="size-4" />
                Continuer
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Ajoute un exercice ou une première série pour démarrer le suivi.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
