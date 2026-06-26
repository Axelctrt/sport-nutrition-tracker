import { Check, ChevronDown, CopyPlus, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { StrengthSet, WorkoutSessionExercise } from '@/domain/models/strength';
import {
  strengthSetFormSchema,
  type StrengthSetFormValues,
} from '@/features/strength-sessions/schemas/strengthSetSchema';
import { strengthSetTypeLabels } from '@/features/strength-sessions/utils/strengthSetLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/utils/cn';

interface StrengthSetEditorProps {
  exercise: WorkoutSessionExercise;
  sets: StrengthSet[];
  editable: boolean;
  action?: string | undefined;
  onAdd: (sessionExerciseId: string) => Promise<unknown>;
  onSave: (
    sessionExerciseId: string,
    setId: string,
    values: StrengthSetFormValues,
  ) => Promise<unknown>;
  onCompletion: (
    sessionExerciseId: string,
    setId: string,
    values: StrengthSetFormValues,
    isCompleted: boolean,
  ) => Promise<unknown>;
  onDuplicate: (sessionExerciseId: string, setId: string) => Promise<unknown>;
  onDelete: (sessionExerciseId: string, setId: string) => void;
}

interface StrengthSetRowProps extends Omit<StrengthSetEditorProps, 'exercise' | 'sets' | 'onAdd'> {
  exercise: WorkoutSessionExercise;
  set: StrengthSet;
}

function numberInputValue(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

function loadInputLabel(exercise: WorkoutSessionExercise): string {
  if (exercise.loadUnitSnapshot === 'assistedKg') return 'Assistance en kg';
  if (exercise.loadUnitSnapshot === 'bodyweight') return 'Charge ajoutée en kg';
  return 'Charge en kg';
}

function StrengthSetRow({
  exercise,
  set,
  editable,
  action,
  onSave,
  onCompletion,
  onDuplicate,
  onDelete,
}: StrengthSetRowProps) {
  const [repetitions, setRepetitions] = useState(numberInputValue(set.repetitions));
  const [weightKg, setWeightKg] = useState(numberInputValue(set.weightKg));
  const [rpe, setRpe] = useState(numberInputValue(set.rpe));
  const [type, setType] = useState(set.type);
  const [notes, setNotes] = useState(set.notes ?? '');
  const [validationError, setValidationError] = useState<string>();

  useEffect(() => {
    setRepetitions(numberInputValue(set.repetitions));
    setWeightKg(numberInputValue(set.weightKg));
    setRpe(numberInputValue(set.rpe));
    setType(set.type);
    setNotes(set.notes ?? '');
  }, [set]);

  const isDirty = repetitions !== numberInputValue(set.repetitions)
    || weightKg !== numberInputValue(set.weightKg)
    || rpe !== numberInputValue(set.rpe)
    || type !== set.type
    || notes !== (set.notes ?? '');

  const values = (): StrengthSetFormValues | undefined => {
    const result = strengthSetFormSchema.safeParse({ repetitions, weightKg, rpe, type, notes });
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Vérifie les valeurs de la série.');
      return undefined;
    }
    setValidationError(undefined);
    return result.data;
  };

  const save = async () => {
    const parsed = values();
    if (parsed) await onSave(exercise.id, set.id, parsed);
  };

  const toggleCompletion = async () => {
    const parsed = values();
    if (parsed) await onCompletion(exercise.id, set.id, parsed, !set.isCompleted);
  };

  const isBusy = action?.includes(set.id) ?? false;
  const baseId = `strength-set-${set.id}`;

  return (
    <article
      id={baseId}
      className={cn(
        'scroll-mt-28 rounded-2xl border p-3.5 sm:p-4',
        set.isCompleted
          ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20'
          : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40',
      )}
      aria-labelledby={`${baseId}-title`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 id={`${baseId}-title`} className="font-semibold text-slate-950 dark:text-white">
            Série {set.setNumber}
          </h4>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {strengthSetTypeLabels[set.type]}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            set.isCompleted
              ? 'bg-emerald-700 text-white'
              : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
          )}
        >
          {set.isCompleted ? 'Validée' : 'À réaliser'}
        </span>
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-3 gap-2">
        <div>
          <label htmlFor={`${baseId}-weight`} className="block truncate text-xs font-medium text-slate-600 dark:text-slate-300">
            {exercise.loadUnitSnapshot === 'assistedKg' ? 'Assistance' : 'Charge'}
          </label>
          <div className="relative mt-1">
            <input
              id={`${baseId}-weight`}
              aria-label={loadInputLabel(exercise)}
              type="number"
              inputMode="decimal"
              enterKeyHint="next"
              min="0"
              step="0.5"
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
              disabled={!editable || exercise.loadUnitSnapshot === 'none'}
              className={`${inputClassName} pr-8 text-center font-semibold`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-400">kg</span>
          </div>
        </div>
        <div>
          <label htmlFor={`${baseId}-repetitions`} className="block truncate text-xs font-medium text-slate-600 dark:text-slate-300">
            Répétitions
          </label>
          <input
            id={`${baseId}-repetitions`}
            type="number"
            inputMode="numeric"
            enterKeyHint="next"
            min="0"
            step="1"
            value={repetitions}
            onChange={(event) => setRepetitions(event.target.value)}
            disabled={!editable}
            className={`${inputClassName} mt-1 text-center font-semibold`}
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-rpe`} className="block truncate text-xs font-medium text-slate-600 dark:text-slate-300">
            RPE
          </label>
          <input
            id={`${baseId}-rpe`}
            type="number"
            inputMode="decimal"
            enterKeyHint="done"
            min="1"
            max="10"
            step="0.5"
            value={rpe}
            onChange={(event) => setRpe(event.target.value)}
            disabled={!editable}
            placeholder="—"
            className={`${inputClassName} mt-1 text-center font-semibold`}
          />
        </div>
      </div>

      <details className="group mt-3 rounded-xl border border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/50">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
          Type et notes
          <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <div className="grid gap-3 border-t border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-2">
          <div>
            <label htmlFor={`${baseId}-type`} className="text-sm font-medium text-slate-700 dark:text-slate-200">Type</label>
            <select
              id={`${baseId}-type`}
              value={type}
              onChange={(event) => setType(event.target.value as StrengthSet['type'])}
              disabled={!editable}
              className={`${inputClassName} mt-1`}
            >
              {Object.entries(strengthSetTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${baseId}-notes`} className="text-sm font-medium text-slate-700 dark:text-slate-200">Notes</label>
            <input
              id={`${baseId}-notes`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={!editable}
              maxLength={500}
              enterKeyHint="done"
              placeholder="Facultatif"
              className={`${inputClassName} mt-1`}
            />
          </div>
        </div>
      </details>

      {validationError ? <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300" role="alert">{validationError}</p> : null}

      {editable ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button className="col-span-2" disabled={isBusy} onClick={() => void toggleCompletion()}>
            {set.isCompleted ? <RotateCcw aria-hidden="true" className="size-4" /> : <Check aria-hidden="true" className="size-4" />}
            {set.isCompleted ? 'Rouvrir la série' : 'Valider la série'}
          </Button>
          <Button variant="secondary" disabled={isBusy || !isDirty} onClick={() => void save()}>
            <Save aria-hidden="true" className="size-4" />Enregistrer
          </Button>
          <Button variant="secondary" disabled={isBusy} onClick={() => void onDuplicate(exercise.id, set.id)}>
            <CopyPlus aria-hidden="true" className="size-4" />Dupliquer
          </Button>
          <Button
            className="col-span-2"
            variant="dangerGhost"
            disabled={isBusy}
            onClick={() => onDelete(exercise.id, set.id)}
          >
            <Trash2 aria-hidden="true" className="size-4" />Supprimer la série
          </Button>
        </div>
      ) : null}
    </article>
  );
}

export function StrengthSetEditor({
  exercise,
  sets,
  editable,
  action,
  onAdd,
  onSave,
  onCompletion,
  onDuplicate,
  onDelete,
}: StrengthSetEditorProps) {
  const completedCount = useMemo(() => sets.filter((set) => set.isCompleted).length, [sets]);
  const targetText = exercise.plannedSets === undefined
    ? `${completedCount}/${sets.length} validée${completedCount > 1 ? 's' : ''}`
    : `${completedCount}/${exercise.plannedSets} série${exercise.plannedSets > 1 ? 's' : ''} prévue${exercise.plannedSets > 1 ? 's' : ''}`;

  return (
    <section className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800" aria-label={`Séries de ${exercise.exerciseNameSnapshot}`}>
      <div>
        <h3 className="font-semibold text-slate-950 dark:text-white">Séries</h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{targetText}</p>
      </div>

      {sets.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          Aucune série. La première reprendra automatiquement l’objectif configuré.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {sets.map((set) => (
            <StrengthSetRow
              key={set.id}
              exercise={exercise}
              set={set}
              editable={editable}
              action={action}
              onSave={onSave}
              onCompletion={onCompletion}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {editable ? (
        <Button
          className="mt-3 w-full"
          variant="secondary"
          disabled={action === `addSet:${exercise.id}`}
          onClick={() => void onAdd(exercise.id)}
        >
          <Plus aria-hidden="true" className="size-4" />
          {action === `addSet:${exercise.id}` ? 'Ajout…' : 'Ajouter une série'}
        </Button>
      ) : null}
    </section>
  );
}
