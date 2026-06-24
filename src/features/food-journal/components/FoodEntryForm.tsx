import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Save } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import { normalizeProductAmount, scaleNutritionValues } from '@/domain/calculations/nutrition';
import type { FoodProduct } from '@/domain/models/food';
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

interface FoodEntryFormProps {
  initialValues: FoodEntryFormValues;
  products: FoodProduct[];
  onSubmit: (values: FoodEntryFormValues) => Promise<void>;
  submitLabel: string;
}

export function FoodEntryForm({ initialValues, products, onSubmit, submitLabel }: FoodEntryFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<FoodEntryFormValues>({
    resolver: zodResolver(foodEntryFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  const productId = watch('productId');
  const inputMode = watch('inputMode');
  const inputQuantity = watch('inputQuantity');
  const selectedProduct = products.find((product) => product.id === productId);
  const preview = useMemo(() => {
    if (!selectedProduct || !Number.isFinite(inputQuantity) || inputQuantity <= 0) return undefined;
    try {
      const amount = normalizeProductAmount(inputMode, inputQuantity, selectedProduct.servingSize);
      return {
        amount,
        nutrition: scaleNutritionValues(selectedProduct.nutritionPer100, amount / 100),
      };
    } catch {
      return undefined;
    }
  }, [inputMode, inputQuantity, selectedProduct]);

  if (products.length === 0) {
    return (
      <InlineNotice title="Aucun aliment local">
        <p>Crée d’abord un aliment avec ses valeurs pour 100 g ou 100 ml.</p>
        <Link to={routePaths.newFoodProduct} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-700 px-3 font-semibold text-white">
          <Plus aria-hidden="true" className="size-4" /> Créer un aliment
        </Link>
      </InlineNotice>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitCount > 0 && Object.keys(errors).length > 0 ? <InlineNotice tone="error" title="Saisie à corriger">Vérifie l’aliment, le repas et la quantité.</InlineNotice> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="food-entry-date" label="Date" error={errors.date?.message} required>
          <input id="food-entry-date" type="date" className={inputClassName} {...register('date')} />
        </FormField>
        <FormField id="food-entry-slot" label="Repas" error={errors.mealSlot?.message} required>
          <select id="food-entry-slot" className={inputClassName} {...register('mealSlot')}>
            {Object.entries(mealSlotLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </FormField>
      </div>

      <FormField id="food-entry-product" label="Aliment" error={errors.productId?.message} required>
        <select id="food-entry-product" className={inputClassName} {...register('productId')}>
          <option value="">Sélectionner un aliment</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.isFavorite ? '★ ' : ''}{product.name}{product.brand ? ` — ${product.brand}` : ''}</option>)}
        </select>
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="food-entry-mode" label="Mode de saisie" error={errors.inputMode?.message} required>
          <select
            id="food-entry-mode"
            className={inputClassName}
            {...register('inputMode')}
            onChange={(event) => {
              const value = event.target.value as 'amount' | 'servings';
              setValue('inputMode', value, { shouldValidate: true, shouldDirty: true });
            }}
          >
            <option value="amount">Quantité en {selectedProduct?.basisUnit ?? 'g/ml'}</option>
            <option value="servings" disabled={!selectedProduct?.servingSize}>Nombre de portions</option>
          </select>
        </FormField>
        <FormField
          id="food-entry-quantity"
          label={inputMode === 'servings' ? 'Nombre de portions' : `Quantité en ${selectedProduct?.basisUnit ?? 'g/ml'}`}
          description={inputMode === 'servings' && selectedProduct?.servingSize ? `1 portion = ${selectedProduct.servingSize} ${selectedProduct.basisUnit}` : undefined}
          error={errors.inputQuantity?.message}
          required
        >
          <input id="food-entry-quantity" type="number" inputMode="decimal" min="0.01" step="0.01" className={inputClassName} {...register('inputQuantity', { valueAsNumber: true })} />
        </FormField>
      </div>

      {preview ? (
        <Card className="bg-emerald-50/80 p-4 dark:bg-emerald-950/20">
          <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Aperçu pour {Math.round(preview.amount * 10) / 10} {selectedProduct?.basisUnit}</p>
          <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-200">
            {Math.round(preview.nutrition.caloriesKcal)} kcal · P {preview.nutrition.proteinGrams.toFixed(1)} g · G {preview.nutrition.carbohydratesGrams.toFixed(1)} g · L {preview.nutrition.fatGrams.toFixed(1)} g
          </p>
        </Card>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        <Save aria-hidden="true" className="size-4" />{isSubmitting ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
