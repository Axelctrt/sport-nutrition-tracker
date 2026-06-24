import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import {
  addNutritionValues,
  scaleNutritionValues,
  ZERO_NUTRITION,
} from '@/domain/calculations/nutrition';
import type { FoodProduct, NutritionValues } from '@/domain/models/food';
import {
  recipeFormSchema,
  type RecipeFormValues,
} from '@/features/recipes/schemas/recipeFormSchema';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface RecipeFormProps {
  initialValues: RecipeFormValues;
  products: FoodProduct[];
  submitLabel: string;
  onSubmit: (values: RecipeFormValues) => Promise<void>;
}

function nutritionForIngredients(
  ingredients: RecipeFormValues['ingredients'],
  products: FoodProduct[],
): NutritionValues {
  const productsById = new Map(products.map((product) => [product.id, product]));
  return ingredients.reduce<NutritionValues>((total, ingredient) => {
    const product = productsById.get(ingredient.productId);
    if (!product || !Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0) return total;
    return addNutritionValues(total, scaleNutritionValues(product.nutritionPer100, ingredient.quantity / 100));
  }, ZERO_NUTRITION);
}

function format(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : '0.0';
}

export function RecipeForm({ initialValues, products, submitLabel, onSubmit }: RecipeFormProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'ingredients' });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const watchedIngredients = watch('ingredients');
  const servings = watch('numberOfServings');
  const total = useMemo(
    () => nutritionForIngredients(watchedIngredients ?? [], products),
    [products, watchedIngredients],
  );
  const perServing = Number.isFinite(servings) && servings > 0
    ? scaleNutritionValues(total, 1 / servings)
    : ZERO_NUTRITION;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      {submitCount > 0 && Object.keys(errors).length > 0 ? (
        <InlineNotice tone="error" title="Recette à corriger">
          Vérifie le nom, le nombre de portions et les ingrédients signalés.
        </InlineNotice>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="recipe-name" label="Nom de la recette" error={errors.name?.message} required>
          <input id="recipe-name" type="text" className={inputClassName} {...register('name')} />
        </FormField>
        <FormField id="recipe-servings" label="Nombre de portions préparées" error={errors.numberOfServings?.message} required>
          <input id="recipe-servings" type="number" inputMode="decimal" min="0.1" step="0.1" className={inputClassName} {...register('numberOfServings', { valueAsNumber: true })} />
        </FormField>
      </div>

      <FormField id="recipe-notes" label="Notes" description="Facultatif." error={errors.notes?.message}>
        <textarea id="recipe-notes" rows={3} className={inputClassName} {...register('notes')} />
      </FormField>

      <fieldset className="space-y-4 border-t border-slate-200 pt-7 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <legend className="text-lg font-semibold text-slate-950 dark:text-white">Ingrédients</legend>
            <p className="mt-1 text-sm text-slate-500">Les valeurs nutritionnelles sont figées lors de l’enregistrement.</p>
          </div>
          <Button variant="secondary" onClick={() => append({ productId: '', quantity: 100 })}>
            <Plus aria-hidden="true" className="size-4" />Ajouter un ingrédient
          </Button>
        </div>
        {typeof errors.ingredients?.message === 'string' ? (
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">{errors.ingredients.message}</p>
        ) : null}
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end dark:border-slate-800">
              <FormField id={`ingredient-${index}-product`} label={`Aliment ${index + 1}`} error={errors.ingredients?.[index]?.productId?.message} required>
                <select id={`ingredient-${index}-product`} className={inputClassName} {...register(`ingredients.${index}.productId`)}>
                  <option value="">Sélectionner…</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.brand ? ` — ${product.brand}` : ''}</option>)}
                </select>
              </FormField>
              <FormField id={`ingredient-${index}-quantity`} label="Quantité" error={errors.ingredients?.[index]?.quantity?.message} required>
                <div className="relative">
                  <input id={`ingredient-${index}-quantity`} type="number" inputMode="decimal" min="0.1" step="0.1" className={`${inputClassName} pr-12`} {...register(`ingredients.${index}.quantity`, { valueAsNumber: true })} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    {products.find((product) => product.id === watchedIngredients?.[index]?.productId)?.basisUnit ?? 'g'}
                  </span>
                </div>
              </FormField>
              <Button variant="danger" aria-label={`Supprimer l’ingrédient ${index + 1}`} disabled={fields.length === 1} onClick={() => remove(index)}>
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </fieldset>

      <InlineNotice title="Aperçu nutritionnel">
        Total : {Math.round(total.caloriesKcal)} kcal · P {format(total.proteinGrams)} g · G {format(total.carbohydratesGrams)} g · L {format(total.fatGrams)} g
        <br />
        Par portion : {Math.round(perServing.caloriesKcal)} kcal · P {format(perServing.proteinGrams)} g · G {format(perServing.carbohydratesGrams)} g · L {format(perServing.fatGrams)} g
      </InlineNotice>

      <Button type="submit" disabled={isSubmitting || products.length === 0}>
        <Save aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
