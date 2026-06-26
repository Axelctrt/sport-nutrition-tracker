import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { ExerciseDefinition } from '@/domain/models/strength';
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

interface WorkoutTemplateFormProps {
  initialValues: WorkoutTemplateFormValues;
  exerciseDefinitions: ExerciseDefinition[];
  submitLabel: string;
  onSubmit: (values: WorkoutTemplateFormValues) => Promise<void>;
}

const optionalNumberRegistration = {
  setValueAs: (value: string) => value === '' ? undefined : Number(value),
};

export function WorkoutTemplateForm({
  initialValues,
  exerciseDefinitions,
  submitLabel,
  onSubmit,
}: WorkoutTemplateFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<WorkoutTemplateFormValues>({
    resolver: zodResolver(workoutTemplateFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'exercises' });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  useEffect(() => {
    if (submitCount > 0 && Object.keys(errors).length > 0 && formRef.current) {
      focusFirstInvalidField(formRef.current);
    }
  }, [errors, submitCount]);

  const addExercise = () => {
    const firstAvailable = exerciseDefinitions.find((exercise) => !exercise.isArchived);
    append({
      ...defaultWorkoutTemplateExerciseValues,
      exerciseDefinitionId: firstAvailable?.id ?? '',
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="workout-template-exercises-title" className="text-xl font-semibold text-slate-950 dark:text-white">Exercices prévus</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">L’ordre défini ici sera repris au démarrage d’une séance.</p>
          </div>
          <Button type="button" variant="secondary" onClick={addExercise} disabled={exerciseDefinitions.length === 0}>
            <Plus aria-hidden="true" className="size-4" />
            Ajouter un exercice
          </Button>
        </div>

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
            return (
              <Card key={field.id} className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-slate-950 dark:text-white">Exercice {index + 1}</h3>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" aria-label={`Monter l’exercice ${index + 1}`} disabled={index === 0} onClick={() => move(index, index - 1)}>
                      <ArrowUp aria-hidden="true" className="size-4" />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" aria-label={`Descendre l’exercice ${index + 1}`} disabled={index === fields.length - 1} onClick={() => move(index, index + 1)}>
                      <ArrowDown aria-hidden="true" className="size-4" />
                    </Button>
                    <Button type="button" size="sm" variant="danger" aria-label={`Supprimer l’exercice ${index + 1}`} onClick={() => remove(index)}>
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
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
                  <FormField id={`workout-template-min-reps-${index}`} label="Répétitions min." error={exerciseErrors?.minRepetitions?.message} required>
                    <input id={`workout-template-min-reps-${index}`} aria-invalid={Boolean(exerciseErrors?.minRepetitions)} type="number" min="1" max="100" inputMode="numeric" className={inputClassName} {...register(`exercises.${index}.minRepetitions`, { valueAsNumber: true })} />
                  </FormField>
                  <FormField id={`workout-template-max-reps-${index}`} label="Répétitions max." error={exerciseErrors?.maxRepetitions?.message} required>
                    <input id={`workout-template-max-reps-${index}`} aria-invalid={Boolean(exerciseErrors?.maxRepetitions)} type="number" min="1" max="100" inputMode="numeric" className={inputClassName} {...register(`exercises.${index}.maxRepetitions`, { valueAsNumber: true })} />
                  </FormField>
                  <FormField id={`workout-template-target-load-${index}`} label="Charge cible (kg)" error={exerciseErrors?.targetLoadKg?.message}>
                    <input id={`workout-template-target-load-${index}`} aria-invalid={Boolean(exerciseErrors?.targetLoadKg)} type="number" min="0" step="0.25" inputMode="decimal" className={inputClassName} {...register(`exercises.${index}.targetLoadKg`, optionalNumberRegistration)} />
                  </FormField>
                  <FormField id={`workout-template-increment-${index}`} label="Incrément (kg)" error={exerciseErrors?.loadIncrementKg?.message} required>
                    <input id={`workout-template-increment-${index}`} aria-invalid={Boolean(exerciseErrors?.loadIncrementKg)} type="number" min="0.25" step="0.25" inputMode="decimal" className={inputClassName} {...register(`exercises.${index}.loadIncrementKg`, { valueAsNumber: true })} />
                  </FormField>
                </div>

                <details className="mt-5 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800" open={Boolean(exerciseErrors?.restSeconds || exerciseErrors?.maximumRecommendedRpe || exerciseErrors?.notes) || undefined}>
                  <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">Réglages avancés</summary>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <FormField id={`workout-template-rest-${index}`} label="Repos (secondes)" error={exerciseErrors?.restSeconds?.message}>
                      <input id={`workout-template-rest-${index}`} aria-invalid={Boolean(exerciseErrors?.restSeconds)} type="number" min="0" max="1800" inputMode="numeric" className={inputClassName} {...register(`exercises.${index}.restSeconds`, optionalNumberRegistration)} />
                    </FormField>
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
              </Card>
            );
          })}
        </div>
      </section>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        <Save aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
