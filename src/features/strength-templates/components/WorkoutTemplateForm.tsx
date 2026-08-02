import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, ChevronDown, Copy, Layers3, Plus, Save, Trash2, Unlink } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { ExerciseDefinition, ExerciseGroupType, StrengthTrackingMode } from '@/domain/models/strength';
import {
  filterExerciseDefinitions,
  findSimilarExerciseDefinitions,
  normalizeExerciseName,
} from '@/application/strength/exerciseDefinitionService';
import { exerciseGroupTypeLabel } from '@/domain/strength/exerciseGroups';
import { defaultTrackingModeForLoadUnit } from '@/domain/strength/strengthTracking';
import {
  workoutTemplateFormSchema,
  type WorkoutTemplateFormValues,
} from '@/features/strength-templates/schemas/workoutTemplateSchema';
import { defaultWorkoutTemplateExerciseValues } from '@/features/strength-templates/utils/workoutTemplateForm';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { focusFirstInvalidField } from '@/shared/hooks/focusFirstInvalidField';
import { cn } from '@/shared/utils/cn';

interface WorkoutTemplateFormProps {
  initialValues: WorkoutTemplateFormValues;
  exerciseDefinitions: ExerciseDefinition[];
  submitLabel: string;
  onSubmit: (values: WorkoutTemplateFormValues) => Promise<void>;
  onCreateExercise?: (
    query: string,
    insertionIndex: number,
    draft: WorkoutTemplateFormValues,
  ) => void;
  initialExerciseQuery?: string;
  highlightedExerciseId?: string;
}

const optionalNumberRegistration = {
  setValueAs: (value: string) => value === '' ? undefined : Number(value),
};

function exerciseSummary(
  exercise: WorkoutTemplateFormValues['exercises'][number] | undefined,
  trackingMode: StrengthTrackingMode,
): string {
  if (!exercise) return 'Réglages à compléter';
  const parts = [`${exercise.plannedSets} série${exercise.plannedSets > 1 ? 's' : ''}`];
  if (trackingMode === 'duration') {
    if (exercise.targetDurationSeconds) parts.push(`${exercise.targetDurationSeconds} s`);
  } else if (trackingMode === 'distance') {
    if (exercise.targetDistanceMeters) parts.push(`${exercise.targetDistanceMeters} m`);
  } else {
    parts.push(
      exercise.minRepetitions === exercise.maxRepetitions
        ? `${exercise.minRepetitions} répétitions`
        : `${exercise.minRepetitions}–${exercise.maxRepetitions} répétitions`,
    );
  }
  if (
    (trackingMode === 'loadRepetitions'
      || trackingMode === 'bodyweightRepetitions'
      || trackingMode === 'assistedRepetitions')
    && exercise.targetLoadKg !== undefined
  ) {
    parts.push(`${exercise.targetLoadKg} kg`);
  }
  if (exercise.restSeconds !== undefined) parts.push(`repos ${exercise.restSeconds} s`);
  return parts.join(' · ');
}

export function WorkoutTemplateForm({
  initialValues,
  exerciseDefinitions,
  submitLabel,
  onSubmit,
  onCreateExercise,
  initialExerciseQuery = '',
  highlightedExerciseId,
}: WorkoutTemplateFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<WorkoutTemplateFormValues>({
    resolver: zodResolver(workoutTemplateFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'exercises' });
  const watchedExercises = useWatch({ control, name: 'exercises' });
  const [exerciseQuery, setExerciseQuery] = useState(initialExerciseQuery);
  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState<number | undefined>(
    initialValues.exercises.length > 0 ? 0 : undefined,
  );
  const [selectedExerciseFieldIds, setSelectedExerciseFieldIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [newGroupType, setNewGroupType] = useState<ExerciseGroupType>('superset');
  const [groupSelectionError, setGroupSelectionError] = useState<string>();
  const filteredExerciseDefinitions = useMemo(
    () => filterExerciseDefinitions(exerciseDefinitions, {
      query: exerciseQuery,
    }),
    [exerciseDefinitions, exerciseQuery],
  );
  const similarExercises = useMemo(
    () => findSimilarExerciseDefinitions(exerciseDefinitions, exerciseQuery),
    [exerciseDefinitions, exerciseQuery],
  );
  const groups = useMemo(() => {
    const result: Array<{ id: string; type: ExerciseGroupType; name: string; memberIndexes: number[] }> = [];
    for (const [index, exercise] of (watchedExercises ?? []).entries()) {
      if (!exercise?.exerciseGroupId) continue;
      let group = result.find((candidate) => candidate.id === exercise.exerciseGroupId);
      if (!group) {
        group = {
          id: exercise.exerciseGroupId,
          type: exercise.exerciseGroupType ?? 'superset',
          name: exercise.exerciseGroupName?.trim() || '',
          memberIndexes: [],
        };
        result.push(group);
      }
      group.memberIndexes.push(index);
    }
    return result;
  }, [watchedExercises]);

  useEffect(() => {
    reset(initialValues);
    setExpandedExerciseIndex(initialValues.exercises.length > 0 ? 0 : undefined);
    setSelectedExerciseFieldIds(new Set());
  }, [initialValues, reset]);

  useEffect(() => {
    setExerciseQuery(initialExerciseQuery);
  }, [initialExerciseQuery]);

  useEffect(() => {
    if (!highlightedExerciseId) return;
    const highlightedIndex = watchedExercises?.findIndex(
      (exercise) => exercise?.exerciseDefinitionId === highlightedExerciseId,
    ) ?? -1;
    if (highlightedIndex >= 0) setExpandedExerciseIndex(highlightedIndex);
    window.requestAnimationFrame(() => {
      document
        .getElementById(`workout-template-exercise-card-${highlightedExerciseId}`)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    });
  }, [highlightedExerciseId, watchedExercises]);

  useEffect(() => {
    if (submitCount > 0 && Object.keys(errors).length > 0 && formRef.current) {
      const firstExerciseError = Array.isArray(errors.exercises)
        ? errors.exercises.findIndex(Boolean)
        : -1;
      if (firstExerciseError >= 0) setExpandedExerciseIndex(firstExerciseError);
      window.requestAnimationFrame(() => {
        if (formRef.current) focusFirstInvalidField(formRef.current);
      });
    }
  }, [errors, submitCount]);


  const trackingModeAt = (index: number): StrengthTrackingMode => {
    const exerciseId = watchedExercises?.[index]?.exerciseDefinitionId;
    const definition = exerciseDefinitions.find((exercise) => exercise.id === exerciseId);
    return definition?.trackingMode ?? defaultTrackingModeForLoadUnit(definition?.loadUnit ?? 'kg');
  };

  const targetLoadLabel = (mode: StrengthTrackingMode): string => {
    if (mode === 'bodyweightRepetitions') return 'Lest cible (kg)';
    if (mode === 'assistedRepetitions') return 'Assistance cible (kg)';
    return 'Charge cible (kg)';
  };

  const incrementLabel = (mode: StrengthTrackingMode): string => {
    if (mode === 'bodyweightRepetitions') return 'Incrément de lest (kg)';
    if (mode === 'assistedRepetitions') return 'Palier d’assistance (kg)';
    return 'Incrément (kg)';
  };

  const updateGroup = (
    groupId: string,
    field: 'exerciseGroupType' | 'exerciseGroupName' | 'exerciseGroupRounds' | 'exerciseGroupRestBetweenExercisesSeconds' | 'exerciseGroupRestBetweenRoundsSeconds',
    value: string | number,
  ) => {
    getValues('exercises').forEach((exercise, index) => {
      if (exercise.exerciseGroupId !== groupId) return;
      setValue(`exercises.${index}.${field}`, value as never, { shouldDirty: true, shouldValidate: true });
    });
  };

  const clearGroupAt = (index: number) => {
    const fieldsToClear = [
      'exerciseGroupId',
      'exerciseGroupType',
      'exerciseGroupName',
      'exerciseGroupRounds',
      'exerciseGroupRestBetweenExercisesSeconds',
      'exerciseGroupRestBetweenRoundsSeconds',
    ] as const;
    for (const field of fieldsToClear) {
      setValue(`exercises.${index}.${field}`, undefined, { shouldDirty: true, shouldValidate: true });
    }
  };

  const createSelectedGroup = () => {
    const selectedIndexes = fields.flatMap((field, index) => (
      selectedExerciseFieldIds.has(field.id) ? [index] : []
    ));
    const expectedCount = newGroupType === 'superset' ? 2 : newGroupType === 'triSet' ? 3 : undefined;
    if (
      (expectedCount !== undefined && selectedIndexes.length !== expectedCount)
      || (newGroupType === 'circuit' && selectedIndexes.length < 2)
    ) {
      setGroupSelectionError(
        newGroupType === 'circuit'
          ? 'Sélectionne au moins 2 exercices pour créer un circuit.'
          : `Sélectionne exactement ${expectedCount} exercices pour créer ce groupe.`,
      );
      return;
    }
    const groupId = `group-${Date.now()}-${selectedIndexes.join('-')}`;
    for (const memberIndex of selectedIndexes) {
      setValue(`exercises.${memberIndex}.exerciseGroupId`, groupId, { shouldDirty: true, shouldValidate: true });
      setValue(`exercises.${memberIndex}.exerciseGroupType`, newGroupType, { shouldDirty: true });
      setValue(`exercises.${memberIndex}.exerciseGroupName`, '', { shouldDirty: true });
      setValue(`exercises.${memberIndex}.exerciseGroupRounds`, 3, { shouldDirty: true });
      setValue(`exercises.${memberIndex}.exerciseGroupRestBetweenExercisesSeconds`, 0, { shouldDirty: true });
      setValue(`exercises.${memberIndex}.exerciseGroupRestBetweenRoundsSeconds`, 120, { shouldDirty: true });
    }
    setSelectedExerciseFieldIds(new Set());
    setGroupSelectionError(undefined);
  };

  const dissolveGroup = (groupId: string) => {
    getValues('exercises').forEach((exercise, index) => {
      if (exercise.exerciseGroupId === groupId) clearGroupAt(index);
    });
  };

  const duplicateGroup = (groupId: string) => {
    const members = getValues('exercises').filter((exercise) => exercise.exerciseGroupId === groupId);
    if (members.length === 0) return;
    const duplicateId = `group-${Date.now()}-copy`;
    for (const member of members) {
      append({
        ...member,
        exerciseGroupId: duplicateId,
        exerciseGroupName: member.exerciseGroupName ? `${member.exerciseGroupName} — copie` : '',
      });
    }
  };

  const addExercise = (exerciseDefinitionId: string) => {
    append({
      ...defaultWorkoutTemplateExerciseValues,
      exerciseDefinitionId,
    });
    setExpandedExerciseIndex(fields.length);
    setExerciseQuery('');
  };

  const removeExercise = (index: number) => {
    const removedFieldId = fields[index]?.id;
    remove(index);
    if (removedFieldId) {
      setSelectedExerciseFieldIds((current) => {
        const next = new Set(current);
        next.delete(removedFieldId);
        return next;
      });
    }
    setExpandedExerciseIndex((current) => {
      if (current === undefined) return undefined;
      if (current === index) return undefined;
      return current > index ? current - 1 : current;
    });
  };

  const moveExercise = (index: number, destination: number) => {
    move(index, destination);
    setExpandedExerciseIndex((current) => {
      if (current === index) return destination;
      if (current === destination) return index;
      return current;
    });
  };

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {submitCount > 0 && Object.keys(errors).length > 0 ? (
        <InlineNotice tone="error" title="Séance à corriger">
          Vérifie les champs signalés avant d’enregistrer.
        </InlineNotice>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <FormField id="workout-template-name" label="Nom de la séance" error={errors.name?.message} required>
          <input id="workout-template-name" type="text" aria-invalid={Boolean(errors.name)} enterKeyHint="next" className={inputClassName} autoComplete="off" {...register('name')} />
        </FormField>
        <FormField id="workout-template-description" label="Description" error={errors.description?.message}>
          <input id="workout-template-description" type="text" aria-invalid={Boolean(errors.description)} className={inputClassName} {...register('description')} />
        </FormField>
      </div>

      <CollapsibleSection
        title="Informations facultatives"
        description="Description détaillée et notes générales de la séance."
        defaultOpen={Boolean(initialValues.notes || errors.notes)}
      >
        <FormField id="workout-template-notes" label="Notes générales" error={errors.notes?.message}>
          <textarea id="workout-template-notes" rows={3} aria-invalid={Boolean(errors.notes)} className={inputClassName} {...register('notes')} />
        </FormField>
      </CollapsibleSection>

      <section aria-labelledby="workout-template-exercises-title">
        <div>
          <h2 id="workout-template-exercises-title" className="text-xl font-semibold text-slate-950 dark:text-white">Exercices prévus</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Recherche puis ajoute un exercice. Tu pourras ensuite ajuster ses réglages.</p>
        </div>

        <div className="mt-4">
          <label htmlFor="workout-template-exercise-search" className="sr-only">
            Rechercher un exercice à ajouter au modèle
          </label>
          <input
            id="workout-template-exercise-search"
            type="search"
            value={exerciseQuery}
            onChange={(event) => setExerciseQuery(event.target.value)}
            className={inputClassName}
            placeholder="Rechercher un exercice à ajouter"
          />
        </div>

        {normalizeExerciseName(exerciseQuery) && filteredExerciseDefinitions.length > 0 ? (
          <ul
            aria-label="Résultats de recherche d’exercices"
            className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900"
          >
            {filteredExerciseDefinitions
              .filter((exercise) => !exercise.isArchived)
              .slice(0, 8)
              .map((exercise) => (
                <li key={exercise.id} className="flex items-center justify-between gap-3 p-3">
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {exercise.name}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    aria-label={`Ajouter ${exercise.name}`}
                    onClick={() => addExercise(exercise.id)}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Ajouter
                  </Button>
                </li>
              ))}
          </ul>
        ) : null}

        {normalizeExerciseName(exerciseQuery)
          && filteredExerciseDefinitions.length === 0
          && onCreateExercise ? (
          <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Aucun exercice trouvé pour « {exerciseQuery.trim()} »
            </p>
            {similarExercises.length > 0 ? (
              <>
                <p className="mt-3 text-xs font-semibold uppercase text-slate-500">
                  Exercices similaires
                </p>
                <ul className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {similarExercises.map((exercise) => (
                    <li key={exercise.id}>{exercise.name}</li>
                  ))}
                </ul>
              </>
            ) : null}
            <Button
              className="mt-3"
              type="button"
              onClick={() => onCreateExercise(
                exerciseQuery.trim(),
                fields.length,
                getValues(),
              )}
            >
              <Plus aria-hidden="true" className="size-4" />
              {similarExercises.length > 0
                ? 'Aucun ne correspond — créer l’exercice'
                : 'Créer cet exercice'}
            </Button>
          </div>
        ) : null}

        {errors.exercises?.root?.message ? <p role="alert" className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{errors.exercises.root.message}</p> : null}
        {typeof errors.exercises?.message === 'string' ? <p role="alert" className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{errors.exercises.message}</p> : null}

        {fields.length === 0 ? (
          <Card className="mt-4 p-6 text-center">
            <p className="font-semibold text-slate-900 dark:text-white">Aucun exercice ajouté</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ajoute au moins un exercice pour créer la séance modèle.</p>
          </Card>
        ) : null}

        <div className="mt-4 space-y-4">
          {fields.map((field, index) => {
            const exerciseErrors = errors.exercises?.[index];
            const trackingMode = trackingModeAt(index);
            const usesRepetitions = trackingMode !== 'duration' && trackingMode !== 'distance';
            const usesLoad = trackingMode === 'loadRepetitions'
              || trackingMode === 'bodyweightRepetitions'
              || trackingMode === 'assistedRepetitions';
            const currentGroup = groups.find((group) => group.id === watchedExercises?.[index]?.exerciseGroupId);
            const groupPosition = currentGroup?.memberIndexes.indexOf(index) ?? -1;
            const definition = exerciseDefinitions.find(
              (exercise) => exercise.id === watchedExercises?.[index]?.exerciseDefinitionId,
            );
            const isExpanded = expandedExerciseIndex === index;
            return (
              <Card
                key={field.id}
                id={
                  watchedExercises?.[index]?.exerciseDefinitionId
                    ? `workout-template-exercise-card-${watchedExercises[index]!.exerciseDefinitionId}`
                    : undefined
                }
                className={cn(
                  'p-3 transition-colors sm:p-4 motion-reduce:transition-none',
                  highlightedExerciseId
                    && watchedExercises?.[index]?.exerciseDefinitionId
                      === highlightedExerciseId
                    && 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-950/30',
                )}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    className="flex min-h-11 min-w-0 flex-1 items-start justify-between gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    aria-expanded={isExpanded}
                    aria-controls={`workout-template-exercise-settings-${field.id}`}
                    aria-label={`${isExpanded ? 'Réduire' : 'Développer'} ${definition?.name ?? `l’exercice ${index + 1}`}`}
                    onClick={() => setExpandedExerciseIndex(isExpanded ? undefined : index)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-950 dark:text-white">
                        {definition?.name ?? `Exercice ${index + 1}`}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {exerciseSummary(watchedExercises?.[index], trackingMode)}
                      </span>
                      {currentGroup ? (
                        <span className="mt-1 block text-xs font-medium text-brand-700 dark:text-brand-300">
                          {currentGroup.name || exerciseGroupTypeLabel(currentGroup.type)}
                          {' · '}
                          {currentGroup.memberIndexes.length > 1
                            ? `${String.fromCharCode(65 + groups.indexOf(currentGroup))}${groupPosition + 1}`
                            : 'groupe incomplet'}
                        </span>
                      ) : null}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        'mt-1 size-5 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none',
                        isExpanded && 'rotate-180',
                      )}
                    />
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" size="sm" variant="ghost" aria-label={`Monter l’exercice ${index + 1}`} disabled={index === 0} onClick={() => moveExercise(index, index - 1)}>
                      <ArrowUp aria-hidden="true" className="size-4" />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" aria-label={`Descendre l’exercice ${index + 1}`} disabled={index === fields.length - 1} onClick={() => moveExercise(index, index + 1)}>
                      <ArrowDown aria-hidden="true" className="size-4" />
                    </Button>
                    <Button type="button" size="sm" variant="danger" aria-label={`Supprimer l’exercice ${index + 1}`} onClick={() => removeExercise(index)}>
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                <div
                  id={`workout-template-exercise-settings-${field.id}`}
                  className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800"
                >
                <div className="grid gap-5 lg:grid-cols-2">
                  <FormField id={`workout-template-exercise-${index}`} label="Exercice" error={exerciseErrors?.exerciseDefinitionId?.message} required>
                    <select id={`workout-template-exercise-${index}`} aria-invalid={Boolean(exerciseErrors?.exerciseDefinitionId)} className={inputClassName} {...register(`exercises.${index}.exerciseDefinitionId`)}>
                      <option value="">Choisir un exercice</option>
                      {exerciseDefinitions.map((exercise) => (
                        <option key={exercise.id} value={exercise.id}>{exercise.name}{exercise.isArchived ? ' — archivé' : ''}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id={`workout-template-sets-${index}`} label="Séries prévues" error={exerciseErrors?.plannedSets?.message} required>
                    <input id={`workout-template-sets-${index}`} aria-invalid={Boolean(exerciseErrors?.plannedSets)} type="number" min="1" max="20" inputMode="numeric" className={inputClassName} {...register(`exercises.${index}.plannedSets`, { valueAsNumber: true })} />
                  </FormField>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {usesRepetitions ? (
                    <>
                      <FormField id={`workout-template-min-reps-${index}`} label="Répétitions min." error={exerciseErrors?.minRepetitions?.message} required>
                        <input id={`workout-template-min-reps-${index}`} aria-invalid={Boolean(exerciseErrors?.minRepetitions)} type="number" min="1" max="100" inputMode="numeric" className={inputClassName} {...register(`exercises.${index}.minRepetitions`, { valueAsNumber: true })} />
                      </FormField>
                      <FormField id={`workout-template-max-reps-${index}`} label="Répétitions max." error={exerciseErrors?.maxRepetitions?.message} required>
                        <input id={`workout-template-max-reps-${index}`} aria-invalid={Boolean(exerciseErrors?.maxRepetitions)} type="number" min="1" max="100" inputMode="numeric" className={inputClassName} {...register(`exercises.${index}.maxRepetitions`, { valueAsNumber: true })} />
                      </FormField>
                    </>
                  ) : null}
                  {usesLoad ? (
                    <FormField id={`workout-template-target-load-${index}`} label={targetLoadLabel(trackingMode)} error={exerciseErrors?.targetLoadKg?.message}>
                      <input id={`workout-template-target-load-${index}`} aria-invalid={Boolean(exerciseErrors?.targetLoadKg)} type="number" min="0" step="0.25" inputMode="decimal" className={inputClassName} {...register(`exercises.${index}.targetLoadKg`, optionalNumberRegistration)} />
                    </FormField>
                  ) : null}
                  {trackingMode === 'duration' ? (
                    <FormField id={`workout-template-target-duration-${index}`} label="Durée cible (secondes)" error={exerciseErrors?.targetDurationSeconds?.message}>
                      <input id={`workout-template-target-duration-${index}`} aria-invalid={Boolean(exerciseErrors?.targetDurationSeconds)} type="number" min="1" step="1" inputMode="numeric" className={inputClassName} {...register(`exercises.${index}.targetDurationSeconds`, optionalNumberRegistration)} />
                    </FormField>
                  ) : null}
                  {trackingMode === 'distance' ? (
                    <FormField id={`workout-template-target-distance-${index}`} label="Distance cible (mètres)" error={exerciseErrors?.targetDistanceMeters?.message}>
                      <input id={`workout-template-target-distance-${index}`} aria-invalid={Boolean(exerciseErrors?.targetDistanceMeters)} type="number" min="0.1" step="0.1" inputMode="decimal" className={inputClassName} {...register(`exercises.${index}.targetDistanceMeters`, optionalNumberRegistration)} />
                    </FormField>
                  ) : null}
                  <FormField id={`workout-template-rest-${index}`} label="Repos principal (secondes)" error={exerciseErrors?.restSeconds?.message}>
                    <input id={`workout-template-rest-${index}`} aria-invalid={Boolean(exerciseErrors?.restSeconds)} type="number" min="0" max="1800" inputMode="numeric" className={inputClassName} {...register(`exercises.${index}.restSeconds`, optionalNumberRegistration)} />
                  </FormField>
                </div>

                <details className="mt-5 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800" open={Boolean(exerciseErrors?.loadIncrementKg || exerciseErrors?.maximumRecommendedRpe || exerciseErrors?.notes) || undefined}>
                  <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">Réglages avancés</summary>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    {usesLoad ? (
                      <FormField id={`workout-template-increment-${index}`} label={incrementLabel(trackingMode)} error={exerciseErrors?.loadIncrementKg?.message} required>
                        <input id={`workout-template-increment-${index}`} aria-invalid={Boolean(exerciseErrors?.loadIncrementKg)} type="number" min="0.25" step="0.25" inputMode="decimal" className={inputClassName} {...register(`exercises.${index}.loadIncrementKg`, { valueAsNumber: true })} />
                      </FormField>
                    ) : null}
                    <FormField id={`workout-template-rpe-${index}`} label="RPE maximal recommandé" error={exerciseErrors?.maximumRecommendedRpe?.message}>
                      <input id={`workout-template-rpe-${index}`} aria-invalid={Boolean(exerciseErrors?.maximumRecommendedRpe)} type="number" min="1" max="10" step="0.5" inputMode="decimal" className={inputClassName} {...register(`exercises.${index}.maximumRecommendedRpe`, optionalNumberRegistration)} />
                    </FormField>
                  </div>

                  <FormField id={`workout-template-exercise-notes-${index}`} label="Notes de l’exercice" error={exerciseErrors?.notes?.message}>
                    <textarea id={`workout-template-exercise-notes-${index}`} aria-invalid={Boolean(exerciseErrors?.notes)} rows={2} className={inputClassName} {...register(`exercises.${index}.notes`)} />
                  </FormField>

                  <label className="mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-4 dark:border-slate-700">
                    <input type="checkbox" className={checkboxClassName} {...register(`exercises.${index}.isActive`)} />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Exercice actif dans cette séance</span>
                  </label>
                </details>
                </div>
                ) : null}
              </Card>
            );
          })}
        </div>

        {fields.length >= 2 ? (
          <CollapsibleSection
            className="mt-5"
            title="Organiser en superset ou circuit"
            description="Sélectionne les exercices à regrouper, puis règle le groupe depuis une seule synthèse."
            summary={groups.length > 0
              ? `${groups.length} groupe${groups.length > 1 ? 's' : ''}`
              : 'Facultatif'}
            icon={Layers3}
            defaultOpen={Boolean(
              Array.isArray(errors.exercises)
              && errors.exercises.some((error) => error?.exerciseGroupId),
            )}
          >
            {groups.length > 0 ? (
              <div className="space-y-4">
                {groups.map((group, groupIndex) => {
                  const leaderIndex = group.memberIndexes[0]!;
                  const leader = watchedExercises?.[leaderIndex];
                  const groupError = group.memberIndexes
                    .map((memberIndex) => errors.exercises?.[memberIndex]?.exerciseGroupId?.message)
                    .find(Boolean);
                  return (
                    <Card key={group.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-950 dark:text-white">
                            {group.name || `${exerciseGroupTypeLabel(group.type)} ${String.fromCharCode(65 + groupIndex)}`}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {group.memberIndexes.length} exercice{group.memberIndexes.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="secondary" onClick={() => duplicateGroup(group.id)}>
                            <Copy aria-hidden="true" className="size-4" />
                            Dupliquer
                          </Button>
                          <Button type="button" size="sm" variant="dangerGhost" onClick={() => dissolveGroup(group.id)}>
                            <Unlink aria-hidden="true" className="size-4" />
                            Dissoudre
                          </Button>
                        </div>
                      </div>

                      <ul className="mt-3 space-y-2">
                        {group.memberIndexes.map((memberIndex) => {
                          const member = watchedExercises?.[memberIndex];
                          const memberDefinition = exerciseDefinitions.find(
                            (exercise) => exercise.id === member?.exerciseDefinitionId,
                          );
                          return (
                            <li key={fields[memberIndex]?.id} className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 dark:bg-slate-800/60">
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                {memberDefinition?.name ?? `Exercice ${memberIndex + 1}`}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                aria-label={`Retirer ${memberDefinition?.name ?? `l’exercice ${memberIndex + 1}`} du groupe`}
                                onClick={() => clearGroupAt(memberIndex)}
                              >
                                <Unlink aria-hidden="true" className="size-4" />
                                Retirer
                              </Button>
                            </li>
                          );
                        })}
                      </ul>

                      {groupError ? <p role="alert" className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{groupError}</p> : null}

                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <FormField id={`workout-template-group-type-${groupIndex}`} label="Type de groupe">
                          <select
                            id={`workout-template-group-type-${groupIndex}`}
                            className={inputClassName}
                            value={leader?.exerciseGroupType ?? 'superset'}
                            onChange={(event) => updateGroup(group.id, 'exerciseGroupType', event.target.value)}
                          >
                            <option value="superset">Superset · 2 exercices</option>
                            <option value="triSet">Tri-set · 3 exercices</option>
                            <option value="circuit">Circuit · 2 exercices ou plus</option>
                          </select>
                        </FormField>
                        <FormField id={`workout-template-group-name-${groupIndex}`} label="Nom facultatif">
                          <input
                            id={`workout-template-group-name-${groupIndex}`}
                            className={inputClassName}
                            value={leader?.exerciseGroupName ?? ''}
                            onChange={(event) => updateGroup(group.id, 'exerciseGroupName', event.target.value)}
                            placeholder="Ex. Dos / pectoraux"
                          />
                        </FormField>
                        <FormField id={`workout-template-group-rounds-${groupIndex}`} label="Nombre de tours">
                          <input
                            id={`workout-template-group-rounds-${groupIndex}`}
                            type="number"
                            min="1"
                            max="20"
                            inputMode="numeric"
                            className={inputClassName}
                            value={leader?.exerciseGroupRounds ?? 3}
                            onChange={(event) => updateGroup(group.id, 'exerciseGroupRounds', Number(event.target.value))}
                          />
                        </FormField>
                        <FormField id={`workout-template-group-between-${groupIndex}`} label="Repos entre exercices (s)">
                          <input
                            id={`workout-template-group-between-${groupIndex}`}
                            type="number"
                            min="0"
                            max="1800"
                            inputMode="numeric"
                            className={inputClassName}
                            value={leader?.exerciseGroupRestBetweenExercisesSeconds ?? 0}
                            onChange={(event) => updateGroup(group.id, 'exerciseGroupRestBetweenExercisesSeconds', Number(event.target.value))}
                          />
                        </FormField>
                        <FormField id={`workout-template-group-round-rest-${groupIndex}`} label="Repos entre tours (s)">
                          <input
                            id={`workout-template-group-round-rest-${groupIndex}`}
                            type="number"
                            min="0"
                            max="1800"
                            inputMode="numeric"
                            className={inputClassName}
                            value={leader?.exerciseGroupRestBetweenRoundsSeconds ?? 120}
                            onChange={(event) => updateGroup(group.id, 'exerciseGroupRestBetweenRoundsSeconds', Number(event.target.value))}
                          />
                        </FormField>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : null}

            <div className={cn(
              'rounded-2xl border border-slate-200 p-4 dark:border-slate-800',
              groups.length > 0 && 'mt-5',
            )}>
              <h3 className="font-semibold text-slate-950 dark:text-white">Créer un groupe</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Choisis des exercices indépendants déjà ajoutés à la séance.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {fields.map((field, index) => {
                  const exercise = watchedExercises?.[index];
                  if (exercise?.exerciseGroupId) return null;
                  const definition = exerciseDefinitions.find(
                    (candidate) => candidate.id === exercise?.exerciseDefinitionId,
                  );
                  return (
                    <label key={field.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 dark:border-slate-800">
                      <input
                        type="checkbox"
                        className={checkboxClassName}
                        checked={selectedExerciseFieldIds.has(field.id)}
                        onChange={(event) => {
                          setSelectedExerciseFieldIds((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(field.id);
                            else next.delete(field.id);
                            return next;
                          });
                          setGroupSelectionError(undefined);
                        }}
                      />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {definition?.name ?? `Exercice ${index + 1}`}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <FormField id="workout-template-new-group-type" label="Type du nouveau groupe">
                  <select
                    id="workout-template-new-group-type"
                    className={inputClassName}
                    value={newGroupType}
                    onChange={(event) => {
                      setNewGroupType(event.target.value as ExerciseGroupType);
                      setGroupSelectionError(undefined);
                    }}
                  >
                    <option value="superset">Superset · 2 exercices</option>
                    <option value="triSet">Tri-set · 3 exercices</option>
                    <option value="circuit">Circuit · 2 exercices ou plus</option>
                  </select>
                </FormField>
                <Button type="button" className="self-end" onClick={createSelectedGroup}>
                  <Layers3 aria-hidden="true" className="size-4" />
                  Créer le groupe
                </Button>
              </div>
              {groupSelectionError ? <p role="alert" className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{groupSelectionError}</p> : null}
            </div>
          </CollapsibleSection>
        ) : null}
      </section>

      <div className="sticky bottom-2 z-20 rounded-2xl border border-slate-200 bg-white/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          <Save aria-hidden="true" className="size-4" />
          {isSubmitting ? 'Enregistrement…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
