import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Save } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  weightEntryFormSchema,
  type WeightEntryFormValues,
} from '@/features/weight/schemas/weightEntrySchema';
import { inputClassName } from '@/shared/forms/formStyles';
import { focusFirstInvalidField } from '@/shared/hooks/focusFirstInvalidField';
import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { StickyActionBar } from '@/shared/ui/StickyActionBar';

interface WeightEntryFormProps {
  initialValues: WeightEntryFormValues;
  onSubmit: (values: WeightEntryFormValues) => Promise<void>;
  submitLabel?: string;
  showDate?: boolean;
  showNote?: boolean;
  collapseNote?: boolean;
  stickySubmit?: boolean;
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
  collapseNote = false,
  stickySubmit = false,
  formId = 'weight-entry-form',
}: WeightEntryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<WeightEntryFormValues>({
    resolver: zodResolver(weightEntryFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  useEffect(() => {
    if (submitCount === 0 || Object.keys(errors).length === 0 || !formRef.current) return;
    window.requestAnimationFrame(() => {
      if (formRef.current) focusFirstInvalidField(formRef.current);
    });
  }, [errors, submitCount]);

  const note = watch('note');

  const noteField = (
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
  );

  const submitButton = (
    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
      <Save aria-hidden="true" className="size-4" />
      {isSubmitting ? 'Enregistrement…' : submitLabel}
    </Button>
  );

  return (
    <form ref={formRef} id={formId} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
          enterKeyHint="done"
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
        collapseNote ? (
          <details
            className="group rounded-xl border border-slate-200 dark:border-slate-800"
            open={Boolean(errors.note) || undefined}
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Note facultative</span>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                  {note?.trim() ? 'Une note est renseignée' : 'Contexte ou ressenti de la pesée'}
                </span>
              </span>
              <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="border-t border-slate-200 p-3 dark:border-slate-800">{noteField}</div>
          </details>
        ) : noteField
      ) : (
        <input type="hidden" {...register('note')} />
      )}

      {stickySubmit ? (
        <>
          <StickyActionBar>
            {submitButton}
          </StickyActionBar>
          <div className="h-20 lg:hidden" aria-hidden="true" />
        </>
      ) : submitButton}
    </form>
  );
}
