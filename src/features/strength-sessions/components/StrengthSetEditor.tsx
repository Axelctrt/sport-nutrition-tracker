import { Check, CopyPlus, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { StrengthSet, WorkoutSessionExercise } from '@/domain/models/strength';
import {
  strengthSetFormSchema,
  type StrengthSetFormValues,
} from '@/features/strength-sessions/schemas/strengthSetSchema';
import { strengthSetTypeLabels } from '@/features/strength-sessions/utils/strengthSetLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { InlineNotice } from '@/shared/ui/InlineNotice';

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
  onDelete: (sessionExerciseId: string, setId: string) => Promise<unknown>;
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
    <div className={`rounded-2xl border p-4 ${set.isCompleted ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">Série {set.setNumber}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {set.isCompleted ? 'Validée' : 'À réaliser'} · {strengthSetTypeLabels[set.type]}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${set.isCompleted ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
          {set.isCompleted ? 'Terminée' : 'En attente'}
        </span>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor={`${baseId}-weight`} className="text-sm font-medium text-slate-700 dark:text-slate-200">{loadInputLabel(exercise)}</label>
          <input
            id={`${baseId}-weight`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={weightKg}
            onChange={(event) => setWeightKg(event.target.value)}
            disabled={!editable || exercise.loadUnitSnapshot === 'none'}
            className={`${inputClassName} mt-1`}
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-repetitions`} className="text-sm font-medium text-slate-700 dark:text-slate-200">Répétitions</label>
          <input
            id={`${baseId}-repetitions`}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={repetitions}
            onChange={(event) => setRepetitions(event.target.value)}
            disabled={!editable}
            className={`${inputClassName} mt-1`}
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-rpe`} className="text-sm font-medium text-slate-700 dark:text-slate-200">RPE</label>
          <input
            id={`${baseId}-rpe`}
            type="number"
            inputMode="decimal"
            min="1"
            max="10"
            step="0.5"
            value={rpe}
            onChange={(event) => setRpe(event.target.value)}
            disabled={!editable}
            placeholder="Facultatif"
            className={`${inputClassName} mt-1`}
          />
        </div>
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
      </div>

      <div className="mt-3">
        <label htmlFor={`${baseId}-notes`} className="text-sm font-medium text-slate-700 dark:text-slate-200">Notes de la série</label>
        <input
          id={`${baseId}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={!editable}
          maxLength={500}
          placeholder="Facultatif"
          className={`${inputClassName} mt-1`}
        />
      </div>

      {validationError ? <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300" role="alert">{validationError}</p> : null}

      {editable ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap">
          <Button disabled={isBusy} onClick={() => void toggleCompletion()}>
            {set.isCompleted ? <RotateCcw aria-hidden="true" className="size-4" /> : <Check aria-hidden="true" className="size-4" />}
            {set.isCompleted ? 'Rouvrir la série' : 'Valider la série'}
          </Button>
          <Button variant="secondary" disabled={isBusy} onClick={() => void save()}>
            <Save aria-hidden="true" className="size-4" />Enregistrer
          </Button>
          <Button variant="secondary" disabled={isBusy} onClick={() => void onDuplicate(exercise.id, set.id)}>
            <CopyPlus aria-hidden="true" className="size-4" />Dupliquer
          </Button>
          <Button variant="danger" disabled={isBusy} onClick={() => void onDelete(exercise.id, set.id)}>
            <Trash2 aria-hidden="true" className="size-4" />Supprimer
          </Button>
        </div>
      ) : null}
    </div>
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
    <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950 dark:text-white">Séries réalisées</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{targetText}</p>
        </div>
        {editable ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={action === `addSet:${exercise.id}`}
            onClick={() => void onAdd(exercise.id)}
          >
            <Plus aria-hidden="true" className="size-4" />Ajouter une série
          </Button>
        ) : null}
      </div>

      {sets.length === 0 ? (
        <InlineNotice className="mt-4" title="Aucune série enregistrée">
          Ajoute une série. La charge cible et la borne minimale de répétitions seront reprises automatiquement lorsqu’elles existent.
        </InlineNotice>
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
    </div>
  );
}
