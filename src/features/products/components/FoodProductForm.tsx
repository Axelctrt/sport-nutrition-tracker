import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  foodProductFormSchema,
  type FoodProductFormValues,
} from '@/features/products/schemas/foodProductSchema';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
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

  const basisUnit = watch('basisUnit');

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      {submitCount > 0 && Object.keys(errors).length > 0 ? (
        <InlineNotice tone="error" title="Aliment à corriger">
          Vérifie les valeurs nutritionnelles et les champs signalés.
        </InlineNotice>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id={`${formId}-name`} label="Nom de l’aliment" error={errors.name?.message} required>
          <input
            id={`${formId}-name`}
            type="text"
            autoComplete="off"
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
            className={inputClassName}
            aria-invalid={Boolean(errors.brand)}
            {...register('brand')}
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id={`${formId}-basisUnit`} label="Base nutritionnelle" error={errors.basisUnit?.message} required>
          <select id={`${formId}-basisUnit`} className={inputClassName} {...register('basisUnit')}>
            <option value="g">Pour 100 g</option>
            <option value="ml">Pour 100 ml</option>
          </select>
        </FormField>

        <FormField
          id={`${formId}-servingSize`}
          label={`Taille d’une portion en ${basisUnit}`}
          description="Facultatif. Nécessaire pour ajouter l’aliment par nombre de portions."
          error={errors.servingSize?.message}
        >
          <input
            id={`${formId}-servingSize`}
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.1"
            className={inputClassName}
            aria-invalid={Boolean(errors.servingSize)}
            {...register('servingSize', optionalNumberOptions)}
          />
        </FormField>
      </div>

      <fieldset className="space-y-5 border-t border-slate-200 pt-7 dark:border-slate-800">
        <legend className="text-lg font-semibold text-slate-950 dark:text-white">
          Valeurs pour 100 {basisUnit}
        </legend>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <FormField id={`${formId}-calories`} label="Calories (kcal)" error={errors.caloriesKcal?.message} required>
            <input id={`${formId}-calories`} type="number" inputMode="decimal" min="0" step="0.1" className={inputClassName} {...register('caloriesKcal', requiredNumberOptions)} />
          </FormField>
          <FormField id={`${formId}-protein`} label="Protéines (g)" error={errors.proteinGrams?.message} required>
            <input id={`${formId}-protein`} type="number" inputMode="decimal" min="0" step="0.1" className={inputClassName} {...register('proteinGrams', requiredNumberOptions)} />
          </FormField>
          <FormField id={`${formId}-carbs`} label="Glucides (g)" error={errors.carbohydratesGrams?.message} required>
            <input id={`${formId}-carbs`} type="number" inputMode="decimal" min="0" step="0.1" className={inputClassName} {...register('carbohydratesGrams', requiredNumberOptions)} />
          </FormField>
          <FormField id={`${formId}-fat`} label="Lipides (g)" error={errors.fatGrams?.message} required>
            <input id={`${formId}-fat`} type="number" inputMode="decimal" min="0" step="0.1" className={inputClassName} {...register('fatGrams', requiredNumberOptions)} />
          </FormField>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id={`${formId}-fiber`} label="Fibres (g)" description="Facultatif." error={errors.fiberGrams?.message}>
            <input id={`${formId}-fiber`} type="number" inputMode="decimal" min="0" step="0.1" className={inputClassName} {...register('fiberGrams', optionalNumberOptions)} />
          </FormField>
          <FormField id={`${formId}-salt`} label="Sel (g)" description="Facultatif." error={errors.saltGrams?.message}>
            <input id={`${formId}-salt`} type="number" inputMode="decimal" min="0" step="0.01" className={inputClassName} {...register('saltGrams', optionalNumberOptions)} />
          </FormField>
        </div>
      </fieldset>

      <FormField id={`${formId}-barcode`} label="Code-barres" description="Facultatif. Tu peux aussi rechercher ce produit dans Open Food Facts." error={errors.barcode?.message}>
        <input id={`${formId}-barcode`} type="text" inputMode="numeric" className={inputClassName} {...register('barcode')} />
      </FormField>

      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700">
        <input type="checkbox" className={checkboxClassName} {...register('isFavorite')} />
        <span>
          <span className="block font-semibold text-slate-900 dark:text-white">Ajouter aux aliments favoris</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">Le produit sera remonté dans les recherches locales.</span>
        </span>
      </label>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        <Save aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
