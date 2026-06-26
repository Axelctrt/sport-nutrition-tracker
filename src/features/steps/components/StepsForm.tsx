import { zodResolver } from '@hookform/resolvers/zod';
import { Footprints, Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  stepsFormSchema,
  type StepsFormValues,
} from '@/features/steps/schemas/stepsSchema';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface StepsFormProps {
  initialSteps: number;
  onSubmit: (values: StepsFormValues) => Promise<void>;
  submitLabel?: string;
  formId?: string;
  showDescription?: boolean;
}

export function StepsForm({
  initialSteps,
  onSubmit,
  submitLabel = 'Enregistrer les pas',
  formId = 'steps-form',
  showDescription = true,
}: StepsFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<StepsFormValues>({
    resolver: zodResolver(stepsFormSchema),
    defaultValues: { totalSteps: initialSteps },
    mode: 'onBlur',
  });

  useEffect(() => {
    reset({ totalSteps: initialSteps });
  }, [initialSteps, reset]);

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {submitCount > 0 && Object.keys(errors).length > 0 ? (
        <InlineNotice tone="error" title="Saisie à corriger">
          Le nombre de pas doit être un entier positif ou nul.
        </InlineNotice>
      ) : null}

      <FormField
        id={`${formId}-totalSteps`}
        label="Pas totaux de la journée"
        description={showDescription
          ? 'Inclut les pas réalisés pendant les séances de course. Ils seront retirés automatiquement du calcul de marche.'
          : undefined}
        error={errors.totalSteps?.message}
        required
      >
        <div className="relative">
          <Footprints
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400"
          />
          <input
            id={`${formId}-totalSteps`}
            type="number"
            inputMode="numeric"
            min="0"
            max="200000"
            step="1"
            className={`${inputClassName} pl-10`}
            aria-invalid={Boolean(errors.totalSteps)}
            aria-describedby={
              errors.totalSteps
                ? `${formId}-totalSteps-error`
                : `${formId}-totalSteps-description`
            }
            {...register('totalSteps', { valueAsNumber: true })}
          />
        </div>
      </FormField>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        <Save aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
