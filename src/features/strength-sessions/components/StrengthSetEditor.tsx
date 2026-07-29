import {
  Check,
  ChevronDown,
  CopyPlus,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { StrengthSet, StrengthTrackingMode, WorkoutSessionExercise } from '@/domain/models/strength';
import { resolveTrackingMode } from '@/domain/strength/strengthTracking';
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

function loadInputLabel(mode: StrengthTrackingMode): string {
  if (mode === 'assistedRepetitions') return 'Assistance en kg';
  if (mode === 'bodyweightRepetitions') return 'Charge ajoutée en kg';
  return 'Charge en kg';
}

function loadFieldLabel(mode: StrengthTrackingMode): string {
  if (mode === 'assistedRepetitions') return 'Assist.';
  if (mode === 'bodyweightRepetitions') return 'Lest';
  return 'Kg';
}

function measurementHint(mode: StrengthTrackingMode): string | undefined {
  if (mode === 'bodyweightRepetitions') return '0 kg correspond au poids du corps seul.';
  if (mode === 'assistedRepetitions') return 'Une assistance plus faible représente une performance supérieure.';
  if (mode === 'duration') return 'Durée totale de la série en secondes.';
  if (mode === 'distance') return 'Distance parcourue pendant la série.';
  return undefined;
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
  const trackingMode = resolveTrackingMode(exercise);
  const [repetitions, setRepetitions] = useState(numberInputValue(set.repetitions));
  const [weightKg, setWeightKg] = useState(numberInputValue(set.weightKg));
  const [durationSeconds, setDurationSeconds] = useState(numberInputValue(set.durationSeconds));
  const [distanceMeters, setDistanceMeters] = useState(numberInputValue(set.distanceMeters));
  const [rpe, setRpe] = useState(numberInputValue(set.rpe));
  const [type, setType] = useState(set.type);
  const [notes, setNotes] = useState(set.notes ?? '');
  const [validationError, setValidationError] = useState<string>();
  const [editingCompleted, setEditingCompleted] = useState(false);

  useEffect(() => {
    setRepetitions(numberInputValue(set.repetitions));
    setWeightKg(numberInputValue(set.weightKg));
    setDurationSeconds(numberInputValue(set.durationSeconds));
    setDistanceMeters(numberInputValue(set.distanceMeters));
    setRpe(numberInputValue(set.rpe));
    setType(set.type);
    setNotes(set.notes ?? '');
  }, [set]);

  const isDirty = repetitions !== numberInputValue(set.repetitions)
    || weightKg !== numberInputValue(set.weightKg)
    || durationSeconds !== numberInputValue(set.durationSeconds)
    || distanceMeters !== numberInputValue(set.distanceMeters)
    || rpe !== numberInputValue(set.rpe)
    || type !== set.type
    || notes !== (set.notes ?? '');

  const values = (): StrengthSetFormValues | undefined => {
    const result = strengthSetFormSchema.safeParse({
      repetitions,
      weightKg,
      durationSeconds,
      distanceMeters,
      rpe,
      type,
      notes,
    });
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Vérifie les valeurs de la série.');
      return undefined;
    }

    if (trackingMode === 'duration' && (result.data.durationSeconds ?? 0) <= 0) {
      setValidationError('La durée doit être supérieure à zéro.');
      return undefined;
    }
    if (trackingMode === 'distance' && (result.data.distanceMeters ?? 0) <= 0) {
      setValidationError('La distance doit être supérieure à zéro.');
      return undefined;
    }
    if (
      trackingMode !== 'duration'
      && trackingMode !== 'distance'
      && result.data.repetitions <= 0
    ) {
      setValidationError('Le nombre de répétitions doit être supérieur à zéro.');
      return undefined;
    }

    setValidationError(undefined);
    return {
      ...result.data,
      repetitions: trackingMode === 'duration' || trackingMode === 'distance'
        ? 0
        : result.data.repetitions,
      weightKg: trackingMode === 'repetitions' || trackingMode === 'duration' || trackingMode === 'distance'
        ? 0
        : result.data.weightKg,
      durationSeconds: trackingMode === 'duration' ? result.data.durationSeconds : undefined,
      distanceMeters: trackingMode === 'distance' ? result.data.distanceMeters : undefined,
    };
  };

  const save = async () => {
    const parsed = values();
    if (parsed) {
      await onSave(exercise.id, set.id, parsed);
      setEditingCompleted(false);
    }
  };

  const toggleCompletion = async () => {
    const parsed = values();
    if (parsed) await onCompletion(exercise.id, set.id, parsed, !set.isCompleted);
  };

  const isBusy = action?.includes(set.id) ?? false;
  const baseId = `strength-set-${set.id}`;
  const usesLoad = trackingMode === 'loadRepetitions'
    || trackingMode === 'bodyweightRepetitions'
    || trackingMode === 'assistedRepetitions';
  const usesRepetitions = trackingMode !== 'duration' && trackingMode !== 'distance';
  const hint = measurementHint(trackingMode);

  if (set.isCompleted && editable && !editingCompleted) {
    const performance = (() => {
      if (trackingMode === 'duration') return `${set.durationSeconds ?? 0} s`;
      if (trackingMode === 'distance') return `${set.distanceMeters ?? 0} m`;
      const load = usesLoad ? ` · ${set.weightKg} kg` : '';
      return `${set.repetitions} reps${load}`;
    })();

    return (
      <article
        id={baseId}
        className="scroll-mt-28 flex min-h-14 items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/20"
        aria-labelledby={`${baseId}-title`}
        data-strength-set-completed="true"
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
          <Check aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 id={`${baseId}-title`} className="text-sm font-semibold text-slate-950 dark:text-white">
            Série {set.setNumber}
          </h4>
          <p className="truncate text-sm text-slate-600 dark:text-slate-300">
            {performance}{set.rpe !== undefined ? ` · RPE ${set.rpe}` : ''}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          aria-label={`Modifier la série ${set.setNumber}`}
          onClick={() => setEditingCompleted(true)}
        >
          <Pencil aria-hidden="true" className="size-4" />
          Modifier
        </Button>
      </article>
    );
  }

  return (
    <article
      id={baseId}
      className={cn(
        'scroll-mt-28 rounded-xl border px-2.5 py-2.5 sm:px-3',
        set.isCompleted
          ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20'
          : 'border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/40',
      )}
      aria-labelledby={`${baseId}-title`}
      data-strength-set-completed={set.isCompleted ? 'true' : 'false'}
    >
      <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-1.5 sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-2">
        <div className="pb-1.5 text-center">
          <h4 id={`${baseId}-title`} className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Série {set.setNumber}
          </h4>
          <span className={cn(
            'mt-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-bold',
            set.isCompleted
              ? 'bg-emerald-700 text-white'
              : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
          )}
          >
            {set.isCompleted ? '✓' : set.setNumber}
          </span>
        </div>

        {usesLoad ? (
          <div>
            <label htmlFor={`${baseId}-weight`} className="block truncate text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {loadFieldLabel(trackingMode)}
            </label>
            <input
              id={`${baseId}-weight`}
              aria-label={loadInputLabel(trackingMode)}
              data-clear-on-focus="true"
              type="number"
              inputMode="decimal"
              enterKeyHint="next"
              min="0"
              step="0.5"
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
              disabled={!editable}
              className={`${inputClassName} mt-1 px-2 text-center text-sm font-semibold sm:text-base`}
            />
          </div>
        ) : null}

        {usesRepetitions ? (
          <div>
            <label htmlFor={`${baseId}-repetitions`} className="block truncate text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Reps
            </label>
            <input
              id={`${baseId}-repetitions`}
              aria-label="Répétitions"
              data-clear-on-focus="true"
              type="number"
              inputMode="numeric"
              enterKeyHint="next"
              min="0"
              step="1"
              value={repetitions}
              onChange={(event) => setRepetitions(event.target.value)}
              disabled={!editable}
              className={`${inputClassName} mt-1 px-2 text-center text-sm font-semibold sm:text-base`}
            />
          </div>
        ) : null}

        {trackingMode === 'duration' ? (
          <div>
            <label htmlFor={`${baseId}-duration`} className="block truncate text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Durée</label>
            <input
              id={`${baseId}-duration`}
              aria-label="Durée en secondes"
              data-clear-on-focus="true"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={durationSeconds}
              onChange={(event) => setDurationSeconds(event.target.value)}
              disabled={!editable}
              className={`${inputClassName} mt-1 px-2 text-center text-sm font-semibold sm:text-base`}
            />
          </div>
        ) : null}

        {trackingMode === 'distance' ? (
          <div>
            <label htmlFor={`${baseId}-distance`} className="block truncate text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Distance</label>
            <input
              id={`${baseId}-distance`}
              aria-label="Distance en mètres"
              data-clear-on-focus="true"
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              value={distanceMeters}
              onChange={(event) => setDistanceMeters(event.target.value)}
              disabled={!editable}
              className={`${inputClassName} mt-1 px-2 text-center text-sm font-semibold sm:text-base`}
            />
          </div>
        ) : null}

        <div>
          <label htmlFor={`${baseId}-rpe`} className="block truncate text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            RPE
          </label>
          <input
            id={`${baseId}-rpe`}
            aria-label="RPE"
            data-clear-on-focus="true"
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
            className={`${inputClassName} mt-1 px-2 text-center text-sm font-semibold sm:text-base`}
          />
        </div>

        {editable ? (
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              className="min-h-10 px-2"
              disabled={isBusy}
              aria-label={set.isCompleted ? 'Rouvrir la série' : 'Valider la série'}
              onClick={() => void toggleCompletion()}
            >
              {set.isCompleted ? <RotateCcw aria-hidden="true" className="size-4" /> : <Check aria-hidden="true" className="size-4" />}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="min-h-10 px-2"
              disabled={isBusy || !isDirty}
              aria-label="Enregistrer"
              onClick={() => void save()}
            >
              <Save aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {hint ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      {validationError ? <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300" role="alert">{validationError}</p> : null}

      <details className="group mt-2 rounded-lg border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
          Options discrètes
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
          {editable ? (
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-3">
              <Button size="sm" variant="secondary" disabled={isBusy} onClick={() => void onDuplicate(exercise.id, set.id)}>
                <CopyPlus aria-hidden="true" className="size-4" />
                Dupliquer
              </Button>
              <Button
                size="sm"
                variant="dangerGhost"
                disabled={isBusy}
                aria-label="Supprimer la série"
                onClick={() => onDelete(exercise.id, set.id)}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Supprimer
              </Button>
            </div>
          ) : null}
        </div>
      </details>
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
    ? `${sets.length} ligne${sets.length > 1 ? 's' : ''} · ${completedCount} validée${completedCount > 1 ? 's' : ''}`
    : `${sets.length}/${exercise.plannedSets} ligne${exercise.plannedSets > 1 ? 's' : ''} · ${completedCount} validée${completedCount > 1 ? 's' : ''}`;

  return (
    <section className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800" aria-label={`Séries de ${exercise.exerciseNameSnapshot}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950 dark:text-white">Séries</h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{targetText}</p>
        </div>
      </div>

      {sets.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          Aucune série. Choisis le nombre de lignes au moment d’ajouter un exercice libre, ou ajoute une série manuellement.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
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
