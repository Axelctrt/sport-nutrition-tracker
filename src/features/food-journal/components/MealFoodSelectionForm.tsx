import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { normalizeProductAmount, scaleNutritionValues } from '@/domain/calculations/nutrition';
import type { FoodProduct, MealSlot } from '@/domain/models/food';
import {
  foodEntryFormSchema,
  type FoodEntryFormValues,
} from '@/features/food-journal/schemas/foodEntrySchema';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface MealFoodSelectionFormProps {
  product: FoodProduct;
  date: string;
  mealSlot: MealSlot;
  onSubmit: (values: FoodEntryFormValues) => Promise<void>;
}

function createDefaultValues(
  product: FoodProduct,
  date: string,
  mealSlot: MealSlot,
): FoodEntryFormValues {
  return {
    date,
    mealSlot,
    productId: product.id,
    inputMode: 'amount',
    inputQuantity: product.servingSize ?? 100,
  };
}

export function MealFoodSelectionForm({
  product,
  date,
  mealSlot,
  onSubmit,
}: MealFoodSelectionFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<FoodEntryFormValues>({
    resolver: zodResolver(foodEntryFormSchema),
    defaultValues: createDefaultValues(product, date, mealSlot),
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(createDefaultValues(product, date, mealSlot));
  }, [date, mealSlot, product, reset]);

  const inputMode = watch('inputMode');
  const inputQuantity = watch('inputQuantity');
  const selectedMealSlot = watch('mealSlot');
  const preview = useMemo(() => {
    if (!Number.isFinite(inputQuantity) || inputQuantity <= 0) return undefined;

    try {
      const amount = normalizeProductAmount(inputMode, inputQuantity, product.servingSize);
      return {
        amount,
        nutrition: scaleNutritionValues(product.nutritionPer100, amount / 100),
      };
    } catch {
      return undefined;
    }
  }, [inputMode, inputQuantity, product]);

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register('productId')} />

      {submitCount > 0 && Object.keys(errors).length > 0 ? (
        <InlineNotice tone="error" title="Saisie à corriger">
          Vérifie le repas et la quantité avant l’ajout.
        </InlineNotice>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Aliment sélectionné
        </p>
        <h2 className="mt-1 break-words text-xl font-semibold text-slate-950 dark:text-white">
          {product.name}
        </h2>
        {product.brand ? (
          <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
            {product.brand}
          </p>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <FormField id="meal-selector-date" label="Date" error={errors.date?.message} required>
          <input id="meal-selector-date" type="date" className={inputClassName} {...register('date')} />
        </FormField>
        <FormField id="meal-selector-slot" label="Repas cible" error={errors.mealSlot?.message} required>
          <select id="meal-selector-slot" className={inputClassName} {...register('mealSlot')}>
            {Object.entries(mealSlotLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <FormField id="meal-selector-mode" label="Mode de saisie" error={errors.inputMode?.message} required>
          <select
            id="meal-selector-mode"
            className={inputClassName}
            {...register('inputMode')}
            onChange={(event) => {
              const value = event.target.value as 'amount' | 'servings';
              setValue('inputMode', value, { shouldDirty: true, shouldValidate: true });
              setValue(
                'inputQuantity',
                value === 'servings' ? 1 : (product.servingSize ?? 100),
                { shouldDirty: true, shouldValidate: true },
              );
            }}
          >
            <option value="amount">Quantité en {product.basisUnit}</option>
            <option value="servings" disabled={!product.servingSize}>Nombre de portions</option>
          </select>
        </FormField>

        <FormField
          id="meal-selector-quantity"
          label={inputMode === 'servings' ? 'Nombre de portions' : `Quantité en ${product.basisUnit}`}
          description={inputMode === 'servings' && product.servingSize
            ? `1 portion = ${product.servingSize} ${product.basisUnit}`
            : undefined}
          error={errors.inputQuantity?.message}
          required
        >
          <input
            id="meal-selector-quantity"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            className={inputClassName}
            {...register('inputQuantity', { valueAsNumber: true })}
          />
        </FormField>
      </div>

      {preview ? (
        <Card className="bg-emerald-50/80 p-4 dark:bg-emerald-950/20">
          <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
            Aperçu pour {Math.round(preview.amount * 10) / 10} {product.basisUnit}
          </p>
          <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-200">
            {Math.round(preview.nutrition.caloriesKcal)} kcal · P{' '}
            {preview.nutrition.proteinGrams.toFixed(1)} g · G{' '}
            {preview.nutrition.carbohydratesGrams.toFixed(1)} g · L{' '}
            {preview.nutrition.fatGrams.toFixed(1)} g
          </p>
        </Card>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        <Save aria-hidden="true" className="size-4" />
        {isSubmitting
          ? 'Ajout en cours…'
          : `Ajouter au ${mealSlotLabels[selectedMealSlot].toLocaleLowerCase('fr')}`}
      </Button>
    </form>
  );
}
