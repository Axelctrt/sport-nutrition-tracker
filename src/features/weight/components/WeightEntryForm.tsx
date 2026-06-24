import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  weightEntryFormSchema,
  type WeightEntryFormValues,
} from '@/features/weight/schemas/weightEntrySchema';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface WeightEntryFormProps {
  initialValues: WeightEntryFormValues;
  onSubmit: (values: WeightEntryFormValues) => Promise<void>;
  submitLabel?: string;
  showDate?: boolean;
  showNote?: boolean;
  formId?: string;
}

const numericRegistrationOptions = {
  valueAsNumber: true,
} as const;

export function WeightEntryForm({
  initialValues,
  onSubmit,
  submitLabel = 'Enregistrer le poids',
  showDate = true,
  showNote = true,
  formId = 'weight-entry-form',
}: WeightEntryFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<WeightEntryFormValues>({
    resolver: zodResolver(weightEntryFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {submitCount > 0 && Object.keys(errors).length > 0 ? (
        <InlineNotice tone="error" title="Saisie à corriger">
          Vérifie la date et le poids avant d’enregistrer.
        </InlineNotice>
      ) : null}

      {showDate ? (
        <FormField id={`${formId}-date`} label="Date" error={errors.date?.message} required>
          <input
            id={`${formId}-date`}
            type="date"
            className={inputClassName}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? `${formId}-date-error` : undefined}
            {...register('date')}
          />
        </FormField>
      ) : (
        <input type="hidden" {...register('date')} />
      )}

      <FormField
        id={`${formId}-weightKg`}
        label="Poids en kilogrammes"
        error={errors.weightKg?.message}
        required
      >
        <input
          id={`${formId}-weightKg`}
          type="number"
          inputMode="decimal"
          min="30"
          max="350"
          step="0.1"
          className={inputClassName}
          aria-invalid={Boolean(errors.weightKg)}
          aria-describedby={errors.weightKg ? `${formId}-weightKg-error` : undefined}
          {...register('weightKg', numericRegistrationOptions)}
        />
      </FormField>

      {showNote ? (
        <FormField
          id={`${formId}-note`}
          label="Note"
          description="Facultatif : contexte de pesée, ressenti ou précision utile."
          error={errors.note?.message}
        >
          <textarea
            id={`${formId}-note`}
            rows={3}
            className={inputClassName}
            aria-invalid={Boolean(errors.note)}
            aria-describedby={
              errors.note ? `${formId}-note-error` : `${formId}-note-description`
            }
            {...register('note')}
          />
        </FormField>
      ) : (
        <input type="hidden" {...register('note')} />
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        <Save aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
