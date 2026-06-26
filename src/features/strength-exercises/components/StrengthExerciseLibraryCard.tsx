import { Archive, Copy, History, MoreHorizontal, Pencil, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { editStrengthExercisePath, strengthExerciseHistoryPath } from '@/app/routePaths';
import type { ExerciseDefinition } from '@/domain/models/strength';
import {
  equipmentLabel,
  exerciseCategoryLabel,
  exerciseSourceLabel,
  loadUnitLabel,
  muscleGroupLabel,
  movementTypeLabel,
} from '@/features/strength-exercises/utils/exerciseLabels';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { cn } from '@/shared/utils/cn';

interface StrengthExerciseLibraryCardProps {
  exercise: ExerciseDefinition;
  busy?: boolean;
  onArchiveChange: (exerciseId: string, archived: boolean) => Promise<boolean>;
  onDuplicate: (exerciseId: string) => Promise<void>;
}

export function StrengthExerciseLibraryCard({
  exercise,
  busy = false,
  onArchiveChange,
  onDuplicate,
}: StrengthExerciseLibraryCardProps) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const nextArchivedState = !exercise.isArchived;

  return (
    <>
      <Card className={cn('p-4 sm:p-5', exercise.isArchived && 'opacity-70')}>
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200">
            <span className="text-sm font-black">{exercise.name.slice(0, 2).toUpperCase()}</span>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words font-semibold text-slate-950 dark:text-white">{exercise.name}</h2>
                  {exercise.isArchived ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">Archivé</span> : null}
                </div>
                <p className="mt-0.5 text-sm font-medium text-brand-700 dark:text-brand-300">
                  {muscleGroupLabel(exercise.primaryMuscleGroup)} · {equipmentLabel(exercise.equipment)}
                </p>
              </div>

              <details className="relative shrink-0">
                <summary
                  role="button"
                  aria-label={`Actions pour ${exercise.name}`}
                  className="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden"
                >
                  <MoreHorizontal aria-hidden="true" className="size-5" />
                </summary>
                <div className="absolute right-0 z-20 mt-1 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {exercise.source === 'user' ? (
                    <Link
                      to={editStrengthExercisePath(exercise.id)}
                      onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}
                      className="inline-flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                      Modifier
                    </Link>
                  ) : null}
                  <Button
                    className="w-full justify-start"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      void onDuplicate(exercise.id);
                    }}
                  >
                    <Copy aria-hidden="true" className="size-4" />
                    Dupliquer
                  </Button>
                  {exercise.source === 'user' ? (
                    <Button
                      className="w-full justify-start"
                      size="sm"
                      variant={exercise.isArchived ? 'ghost' : 'dangerGhost'}
                      disabled={busy}
                      onClick={(event) => {
                        event.currentTarget.closest('details')?.removeAttribute('open');
                        setConfirmationOpen(true);
                      }}
                    >
                      {exercise.isArchived ? <RotateCcw aria-hidden="true" className="size-4" /> : <Archive aria-hidden="true" className="size-4" />}
                      {exercise.isArchived ? 'Réactiver' : 'Archiver'}
                    </Button>
                  ) : null}
                </div>
              </details>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">{exerciseSourceLabel(exercise.source)}</span>
              <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">{exerciseCategoryLabel(exercise.category)}</span>
              <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">{movementTypeLabel(exercise.movementType)}</span>
              <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">{loadUnitLabel(exercise.loadUnit)}</span>
            </div>

            {exercise.description || exercise.secondaryMuscleGroups.length > 0 ? (
              <details className="mt-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">Détails de l’exercice</summary>
                {exercise.secondaryMuscleGroups.length > 0 ? (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Muscles secondaires : {exercise.secondaryMuscleGroups.map(muscleGroupLabel).join(', ')}</p>
                ) : null}
                {exercise.description ? <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{exercise.description}</p> : null}
              </details>
            ) : null}

            <Link
              to={strengthExerciseHistoryPath(exercise.id)}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 sm:w-auto"
            >
              <History aria-hidden="true" className="size-4" />
              Historique et progression
            </Link>
          </div>
        </div>
      </Card>

      <ConfirmationDialog
        open={confirmationOpen}
        title={exercise.isArchived ? 'Réactiver cet exercice ?' : 'Archiver cet exercice ?'}
        description={exercise.isArchived
          ? `« ${exercise.name} » sera de nouveau disponible dans les nouvelles séances.`
          : `« ${exercise.name} » ne pourra plus être ajouté aux nouvelles séances, mais restera visible dans les anciennes.`}
        confirmLabel={exercise.isArchived ? 'Réactiver' : 'Archiver'}
        tone={exercise.isArchived ? 'default' : 'danger'}
        isPending={busy}
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => {
          void onArchiveChange(exercise.id, nextArchivedState).then((success) => {
            if (success) setConfirmationOpen(false);
          });
        }}
      />
    </>
  );
}
