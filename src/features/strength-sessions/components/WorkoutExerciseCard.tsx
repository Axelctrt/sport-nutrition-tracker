import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Layers3, SkipForward, TimerReset, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ExerciseHistoryEntry } from '@/application/strength/strengthHistoryService';
import type { StrengthSetChanges } from '@/application/strength/strengthSetService';
import type { StrengthSet, WorkoutSessionExercise } from '@/domain/models/strength';
import { formatRestDuration } from '@/domain/strength/restTimer';
import { PreviousExercisePerformance } from '@/features/strength-history/components/PreviousExercisePerformance';
import { StrengthSetEditor } from '@/features/strength-sessions/components/StrengthSetEditor';
import { loadUnitLabel } from '@/features/strength-exercises/utils/exerciseLabels';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { cn } from '@/shared/utils/cn';

interface WorkoutExerciseCardProps {
  exercise: WorkoutSessionExercise;
  index: number;
  exerciseCount: number;
  sets: StrengthSet[];
  performance: ExerciseHistoryEntry | undefined;
  editable: boolean;
  action?: string | undefined;
  onMove: (sessionExerciseId: string, direction: -1 | 1) => Promise<unknown>;
  onRemove: (exercise: WorkoutSessionExercise) => void;
  onReusePreviousSets: (sessionExerciseId: string) => Promise<unknown>;
  onAddSet: (sessionExerciseId: string) => Promise<unknown>;
  onSaveSet: (sessionExerciseId: string, setId: string, values: StrengthSetChanges) => Promise<unknown>;
  onCompleteSet: (
    sessionExerciseId: string,
    setId: string,
    values: StrengthSetChanges,
    isCompleted: boolean,
  ) => Promise<unknown>;
  onDuplicateSet: (sessionExerciseId: string, setId: string) => Promise<unknown>;
  onDeleteSet: (sessionExerciseId: string, setId: string) => void;
  onStartRest: (exercise: WorkoutSessionExercise) => void;
  groupLabel?: string | undefined;
  groupPositionLabel?: string | undefined;
  groupRounds?: number | undefined;
  nextExerciseName?: string | undefined;
  restDurationSeconds?: number | undefined;
  restButtonLabel?: string | undefined;
  temporarilySkipped?: boolean | undefined;
  onSkip?: ((exercise: WorkoutSessionExercise) => void) | undefined;
}

function exerciseCompletion(exercise: WorkoutSessionExercise, sets: StrengthSet[]) {
  const completedSets = sets.filter((set) => set.isCompleted);
  const completedWorkingSets = completedSets.filter((set) => set.type === 'working');
  const target = exercise.plannedSets ?? sets.length;
  const count = exercise.plannedSets === undefined ? completedSets.length : completedWorkingSets.length;
  const complete = target > 0 && count >= target;
  return { complete, count, target };
}

export function WorkoutExerciseCard({
  exercise,
  index,
  exerciseCount,
  sets,
  performance,
  editable,
  action,
  onMove,
  onRemove,
  onReusePreviousSets,
  onAddSet,
  onSaveSet,
  onCompleteSet,
  onDuplicateSet,
  onDeleteSet,
  onStartRest,
  groupLabel,
  groupPositionLabel,
  groupRounds,
  nextExerciseName,
  restDurationSeconds,
  restButtonLabel,
  temporarilySkipped = false,
  onSkip,
}: WorkoutExerciseCardProps) {
  const completion = exerciseCompletion(exercise, sets);
  const [expanded, setExpanded] = useState(() => editable || !completion.complete);
  const contentId = `workout-exercise-content-${exercise.id}`;

  return (
    <Card
      id={`workout-exercise-${exercise.id}`}
      className={cn(
        'scroll-mt-24 overflow-hidden',
        temporarilySkipped && 'opacity-70',
        groupLabel && 'border-brand-200 dark:border-brand-900',
        completion.complete && 'border-emerald-200 dark:border-emerald-900',
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {groupPositionLabel ?? `Exercice ${index + 1}`}
              </p>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                  completion.complete
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                )}
              >
                {completion.complete ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : null}
                {completion.target > 0 ? `${completion.count}/${completion.target} séries` : `${completion.count} série${completion.count > 1 ? 's' : ''}`}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
              {exercise.exerciseNameSnapshot}
            </h2>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
              {exercise.minRepetitions !== undefined && exercise.maxRepetitions !== undefined ? (
                <span>{exercise.minRepetitions}–{exercise.maxRepetitions} reps</span>
              ) : null}
              {exercise.targetLoadKg !== undefined ? <span>Objectif {exercise.targetLoadKg} kg</span> : null}
              <span>{loadUnitLabel(exercise.loadUnitSnapshot)}</span>
              {exercise.restSeconds ? <span>Repos {formatRestDuration(exercise.restSeconds)}</span> : null}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-expanded={expanded}
            aria-controls={contentId}
            aria-label={`${expanded ? 'Réduire' : 'Développer'} ${exercise.exerciseNameSnapshot}`}
            onClick={() => setExpanded((current) => !current)}
          >
            <ChevronDown
              aria-hidden="true"
              className={cn('size-5 transition-transform motion-reduce:transition-none', expanded && 'rotate-180')}
            />
          </button>
        </div>

        {groupLabel ? (
          <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-2 text-sm dark:border-brand-900 dark:bg-brand-950/30">
            <div className="flex flex-wrap items-center gap-2 font-semibold text-brand-800 dark:text-brand-200">
              <Layers3 aria-hidden="true" className="size-4" />
              <span>{groupLabel}</span>
              {groupRounds ? <span>· {groupRounds} tour{groupRounds > 1 ? 's' : ''}</span> : null}
              {temporarilySkipped ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">Passé temporairement</span> : null}
            </div>
            {nextExerciseName ? <p className="mt-1 text-slate-600 dark:text-slate-300">Ensuite : {nextExerciseName}</p> : null}
          </div>
        ) : null}

        {exercise.notes ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
            {exercise.notes}
          </p>
        ) : null}
      </div>

      {expanded ? (
        <div id={contentId} className="border-t border-slate-200 px-4 pb-5 dark:border-slate-800 sm:px-5">
          {editable ? (
            <div className="flex flex-wrap justify-end gap-2 pt-4" aria-label={`Actions pour ${exercise.exerciseNameSnapshot}`}>
              <Button
                variant="secondary"
                size="sm"
                aria-label={`Monter ${exercise.exerciseNameSnapshot}`}
                disabled={index === 0 || Boolean(action)}
                onClick={() => void onMove(exercise.id, -1)}
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                aria-label={`Descendre ${exercise.exerciseNameSnapshot}`}
                disabled={index === exerciseCount - 1 || Boolean(action)}
                onClick={() => void onMove(exercise.id, 1)}
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </Button>
              {groupLabel && onSkip ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={Boolean(action)}
                  onClick={() => onSkip(exercise)}
                >
                  <SkipForward aria-hidden="true" className="size-4" />
                  {temporarilySkipped ? 'Réintégrer' : 'Passer pour l’instant'}
                </Button>
              ) : null}
              <Button
                variant="dangerGhost"
                size="sm"
                disabled={Boolean(action)}
                onClick={() => onRemove(exercise)}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Retirer
              </Button>
            </div>
          ) : null}

          {editable && restDurationSeconds ? (
            <Button
              className="mt-4 w-full"
              variant="secondary"
              onClick={() => onStartRest(exercise)}
            >
              <TimerReset aria-hidden="true" className="size-4" />
              {restButtonLabel ?? 'Démarrer le repos'} · {formatRestDuration(restDurationSeconds)}
            </Button>
          ) : null}

          <PreviousExercisePerformance
            exerciseDefinitionId={exercise.exerciseDefinitionId}
            performance={performance}
            editable={editable}
            hasCurrentSets={sets.length > 0}
            isCopying={action === `reusePreviousSets:${exercise.id}`}
            onCopy={() => onReusePreviousSets(exercise.id)}
          />
          <StrengthSetEditor
            exercise={exercise}
            sets={sets}
            editable={editable}
            action={action}
            onAdd={onAddSet}
            onSave={onSaveSet}
            onCompletion={onCompleteSet}
            onDuplicate={onDuplicateSet}
            onDelete={onDeleteSet}
          />
        </div>
      ) : null}
    </Card>
  );
}
