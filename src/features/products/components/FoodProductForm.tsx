import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  foodProductFormSchema,
  type FoodProductFormValues,
} from '@/features/products/schemas/foodProductSchema';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { focusFirstInvalidField } from '@/shared/hooks/focusFirstInvalidField';
import { Button } from '@/shared/ui/Button';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface FoodProductFormProps {
  initialValues: FoodProductFormValues;
  onSubmit: (values: FoodProductFormValues) => Promise<void>;
  submitLabel: string;
  formId?: string;
}

const requiredNumberOptions = { valueAsNumber: true } as const;
const optionalNumberOptions = {
  setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
} as const;

export function FoodProductForm({
  initialValues,
  onSubmit,
  submitLabel,
  formId = 'food-product-form',
}: FoodProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<FoodProductFormValues>({
    resolver: zodResolver(foodProductFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const errorCount = Object.keys(errors).length;
  useEffect(() => {
    if (submitCount === 0 || errorCount === 0 || !formRef.current) return;
    window.requestAnimationFrame(() => {
      if (formRef.current) focusFirstInvalidField(formRef.current);
    });
  }, [errorCount, submitCount]);

  const basisUnit = watch('basisUnit');
  const optionalSectionHasValues = Boolean(
    initialValues.servingLabel
    || initialValues.fiberGrams
    || initialValues.saltGrams
    || initialValues.barcode
    || initialValues.isFavorite,
  );
  const optionalSectionHasErrors = Boolean(
    errors.servingLabel
    || errors.fiberGrams
    || errors.saltGrams
    || errors.barcode,
  );

  return (
    <form ref={formRef} id={formId} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitCount > 0 && errorCount > 0 ? (
        <InlineNotice tone="error" title="Aliment à corriger">
          Vérifie les champs signalés avant d’enregistrer l’aliment.
        </InlineNotice>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5" aria-labelledby={`${formId}-main-title`}>
        <h2 id={`${formId}-main-title`} className="font-semibold text-slate-950 dark:text-white">Informations principales</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField id={`${formId}-name`} label="Nom de l’aliment" error={errors.name?.message} required>
            <input
              id={`${formId}-name`}
              type="text"
              autoComplete="off"
              enterKeyHint="next"
              className={inputClassName}
              aria-invalid={Boolean(errors.name)}
              {...register('name')}
            />
          </FormField>

          <FormField id={`${formId}-brand`} label="Marque" description="Facultatif." error={errors.brand?.message}>
            <input
              id={`${formId}-brand`}
              type="text"
              autoComplete="organization"
              enterKeyHint="next"
              className={inputClassName}
              aria-invalid={Boolean(errors.brand)}
              {...register('brand')}
            />
          </FormField>

          <FormField id={`${formId}-basisUnit`} label="Base nutritionnelle" error={errors.basisUnit?.message} required>
            <select id={`${formId}-basisUnit`} className={inputClassName} aria-invalid={Boolean(errors.basisUnit)} {...register('basisUnit')}>
              <option value="g">Pour 100 g</option>
              <option value="ml">Pour 100 ml</option>
            </select>
          </FormField>

          <FormField
            id={`${formId}-servingSize`}
            label={`Taille d’une portion en ${basisUnit}`}
            description="Facultatif. Permet l’ajout par nombre de portions."
            error={errors.servingSize?.message}
          >
            <input
              id={`${formId}-servingSize`}
              type="number"
              inputMode="decimal"
              enterKeyHint="next"
              min="0.1"
              step="0.1"
              className={inputClassName}
              aria-invalid={Boolean(errors.servingSize)}
              {...register('servingSize', optionalNumberOptions)}
            />
          </FormField>

          <FormField
            id={`${formId}-servingLabel`}
            label="Nom de la portion"
            description="Facultatif, par exemple : 1 pot, 1 tranche ou 1 dose."
            error={errors.servingLabel?.message}
          >
            <input
              id={`${formId}-servingLabel`}
              type="text"
              autoComplete="off"
              enterKeyHint="next"
              className={inputClassName}
              aria-invalid={Boolean(errors.servingLabel)}
              {...register('servingLabel')}
            />
          </FormField>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5" aria-labelledby={`${formId}-nutrition-title`}>
        <div>
          <h2 id={`${formId}-nutrition-title`} className="font-semibold text-slate-950 dark:text-white">Valeurs pour 100 {basisUnit}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Renseigne les quatre valeurs nécessaires au journal.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <FormField id={`${formId}-calories`} label="Calories" error={errors.caloriesKcal?.message} required>
            <div className="relative">
              <input id={`${formId}-calories`} type="number" inputMode="decimal" enterKeyHint="next" min="0" step="0.1" className={`${inputClassName} pr-12`} aria-invalid={Boolean(errors.caloriesKcal)} {...register('caloriesKcal', requiredNumberOptions)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">kcal</span>
            </div>
          </FormField>
          <FormField id={`${formId}-protein`} label="Protéines" error={errors.proteinGrams?.message} required>
            <div className="relative">
              <input id={`${formId}-protein`} type="number" inputMode="decimal" enterKeyHint="next" min="0" step="0.1" className={`${inputClassName} pr-9`} aria-invalid={Boolean(errors.proteinGrams)} {...register('proteinGrams', requiredNumberOptions)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">g</span>
            </div>
          </FormField>
          <FormField id={`${formId}-carbs`} label="Glucides" error={errors.carbohydratesGrams?.message} required>
            <div className="relative">
              <input id={`${formId}-carbs`} type="number" inputMode="decimal" enterKeyHint="next" min="0" step="0.1" className={`${inputClassName} pr-9`} aria-invalid={Boolean(errors.carbohydratesGrams)} {...register('carbohydratesGrams', requiredNumberOptions)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">g</span>
            </div>
          </FormField>
          <FormField id={`${formId}-fat`} label="Lipides" error={errors.fatGrams?.message} required>
            <div className="relative">
              <input id={`${formId}-fat`} type="number" inputMode="decimal" enterKeyHint="next" min="0" step="0.1" className={`${inputClassName} pr-9`} aria-invalid={Boolean(errors.fatGrams)} {...register('fatGrams', requiredNumberOptions)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">g</span>
            </div>
          </FormField>
        </div>
      </section>

      <CollapsibleSection
        title="Informations facultatives"
        description="Fibres, sel, code-barres et classement en favori"
        summary={optionalSectionHasErrors ? 'À corriger' : undefined}
        defaultOpen={optionalSectionHasValues || optionalSectionHasErrors}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={`${formId}-fiber`} label="Fibres" error={errors.fiberGrams?.message}>
            <div className="relative">
              <input id={`${formId}-fiber`} type="number" inputMode="decimal" enterKeyHint="next" min="0" step="0.1" className={`${inputClassName} pr-9`} aria-invalid={Boolean(errors.fiberGrams)} {...register('fiberGrams', optionalNumberOptions)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">g</span>
            </div>
          </FormField>
          <FormField id={`${formId}-salt`} label="Sel" error={errors.saltGrams?.message}>
            <div className="relative">
              <input id={`${formId}-salt`} type="number" inputMode="decimal" enterKeyHint="next" min="0" step="0.01" className={`${inputClassName} pr-9`} aria-invalid={Boolean(errors.saltGrams)} {...register('saltGrams', optionalNumberOptions)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">g</span>
            </div>
          </FormField>
          <div className="sm:col-span-2">
            <FormField id={`${formId}-barcode`} label="Code-barres" description="Facultatif. Utilise uniquement des chiffres." error={errors.barcode?.message}>
              <input id={`${formId}-barcode`} type="text" inputMode="numeric" enterKeyHint="done" className={inputClassName} aria-invalid={Boolean(errors.barcode)} {...register('barcode')} />
            </FormField>
          </div>
        </div>

        <label className="mt-4 flex min-h-12 items-center gap-3 rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700">
          <input type="checkbox" className={checkboxClassName} {...register('isFavorite')} />
          <span>
            <span className="block font-semibold text-slate-900 dark:text-white">Ajouter aux favoris</span>
            <span className="block text-sm text-slate-500 dark:text-slate-400">L’aliment apparaîtra avant les autres dans la bibliothèque.</span>
          </span>
        </label>
      </CollapsibleSection>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        <Save aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
