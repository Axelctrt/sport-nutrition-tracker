import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  strengthExerciseFormSchema,
  type StrengthExerciseFormValues,
} from '@/features/strength-exercises/schemas/strengthExerciseSchema';
import {
  equipmentOptions,
  exerciseCategoryOptions,
  strengthTrackingModeOptions,
  movementTypeOptions,
  muscleGroupOptions,
} from '@/features/strength-exercises/utils/exerciseLabels';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { focusFirstInvalidField } from '@/shared/hooks/focusFirstInvalidField';

interface StrengthExerciseFormProps {
  initialValues: StrengthExerciseFormValues;
  onSubmit: (values: StrengthExerciseFormValues) => Promise<void>;
  submitLabel: string;
}

export function StrengthExerciseForm({
  initialValues,
  onSubmit,
  submitLabel,
}: StrengthExerciseFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<StrengthExerciseFormValues>({
    resolver: zodResolver(strengthExerciseFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const primaryMuscleGroup = watch('primaryMuscleGroup');

  useEffect(() => {
    if (submitCount > 0 && Object.keys(errors).length > 0 && formRef.current) {
      focusFirstInvalidField(formRef.current);
    }
  }, [errors, submitCount]);

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      {submitCount > 0 && Object.keys(errors).length > 0 ? (
        <InlineNotice tone="error" title="Exercice à corriger">
          Vérifie les champs signalés avant d’enregistrer.
        </InlineNotice>
      ) : null}

      <FormField id="strength-exercise-name" label="Nom de l’exercice" error={errors.name?.message} required>
        <input
          id="strength-exercise-name"
          type="text"
          autoComplete="off"
          enterKeyHint="next"
          className={inputClassName}
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="strength-exercise-primary-muscle" label="Groupe musculaire principal" error={errors.primaryMuscleGroup?.message} required>
          <select id="strength-exercise-primary-muscle" aria-invalid={Boolean(errors.primaryMuscleGroup)} className={inputClassName} {...register('primaryMuscleGroup')}>
            {muscleGroupOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </FormField>
        <FormField id="strength-exercise-equipment" label="Matériel" error={errors.equipment?.message} required>
          <select id="strength-exercise-equipment" aria-invalid={Boolean(errors.equipment)} className={inputClassName} {...register('equipment')}>
            {equipmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </FormField>
      </div>

      <CollapsibleSection
        title="Détails facultatifs"
        description="Muscles secondaires et repères techniques."
        defaultOpen={Boolean(initialValues.description || initialValues.secondaryMuscleGroups.length > 0 || errors.secondaryMuscleGroups || errors.description)}
      >
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">Groupes musculaires secondaires</legend>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Facultatif. Le groupe principal est volontairement exclu.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {muscleGroupOptions.filter((option) => option.value !== primaryMuscleGroup).map((option) => (
            <label key={option.value} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700">
              <input type="checkbox" value={option.value} className={checkboxClassName} {...register('secondaryMuscleGroups')} />
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{option.label}</span>
            </label>
          ))}
        </div>
        {errors.secondaryMuscleGroups?.message ? <p role="alert" className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">{errors.secondaryMuscleGroups.message}</p> : null}
      </fieldset>

      <FormField id="strength-exercise-description" label="Description" description="Indique les repères techniques utiles." error={errors.description?.message}>
        <textarea id="strength-exercise-description" rows={4} aria-invalid={Boolean(errors.description)} className={inputClassName} {...register('description')} />
      </FormField>
      </CollapsibleSection>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="strength-exercise-category" label="Catégorie" error={errors.category?.message} required>
          <select id="strength-exercise-category" aria-invalid={Boolean(errors.category)} className={inputClassName} {...register('category')}>
            {exerciseCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </FormField>
        <FormField id="strength-exercise-movement" label="Type de mouvement" error={errors.movementType?.message} required>
          <select id="strength-exercise-movement" aria-invalid={Boolean(errors.movementType)} className={inputClassName} {...register('movementType')}>
            {movementTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </FormField>
      </div>

      <FormField
        id="strength-exercise-tracking-mode"
        label="Méthode de suivi"
        description="Détermine les champs saisis pendant la séance et les statistiques affichées."
        error={errors.trackingMode?.message}
        required
      >
        <select
          id="strength-exercise-tracking-mode"
          aria-invalid={Boolean(errors.trackingMode)}
          className={inputClassName}
          {...register('trackingMode')}
        >
          {strengthTrackingModeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </FormField>


      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        <Save aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
