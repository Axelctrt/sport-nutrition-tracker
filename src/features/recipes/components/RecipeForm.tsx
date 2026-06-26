import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
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
import { focusFirstInvalidField } from '@/shared/hooks/focusFirstInvalidField';
import { Button } from '@/shared/ui/Button';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
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
  return Number.isFinite(value) ? value.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '0';
}

export function RecipeForm({ initialValues, products, submitLabel, onSubmit }: RecipeFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
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

  const errorCount = Object.keys(errors).length;
  useEffect(() => {
    if (submitCount === 0 || errorCount === 0 || !formRef.current) return;
    window.requestAnimationFrame(() => {
      if (formRef.current) focusFirstInvalidField(formRef.current);
    });
  }, [errorCount, submitCount]);

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
    <form ref={formRef} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitCount > 0 && errorCount > 0 ? (
        <InlineNotice tone="error" title="Recette à corriger">
          Vérifie le nom, le nombre de portions et les ingrédients signalés.
        </InlineNotice>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5" aria-labelledby="recipe-main-title">
        <h2 id="recipe-main-title" className="font-semibold text-slate-950 dark:text-white">Informations principales</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField id="recipe-name" label="Nom de la recette" error={errors.name?.message} required>
            <input id="recipe-name" type="text" enterKeyHint="next" className={inputClassName} aria-invalid={Boolean(errors.name)} {...register('name')} />
          </FormField>
          <FormField id="recipe-servings" label="Portions préparées" error={errors.numberOfServings?.message} required>
            <input id="recipe-servings" type="number" inputMode="decimal" enterKeyHint="next" min="0.1" step="0.1" className={inputClassName} aria-invalid={Boolean(errors.numberOfServings)} {...register('numberOfServings', { valueAsNumber: true })} />
          </FormField>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5" aria-labelledby="recipe-ingredients-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="recipe-ingredients-title" className="font-semibold text-slate-950 dark:text-white">Ingrédients</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Les valeurs sont figées lors de l’enregistrement.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {fields.length}
          </span>
        </div>

        {typeof errors.ingredients?.message === 'string' ? (
          <p role="alert" className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{errors.ingredients.message}</p>
        ) : null}

        <div className="mt-4 space-y-3">
          {fields.map((field, index) => {
            const selectedProduct = products.find((product) => product.id === watchedIngredients?.[index]?.productId);
            return (
              <div key={field.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Ingrédient {index + 1}</p>
                  <Button
                    variant="dangerGhost"
                    size="sm"
                    className="px-2"
                    aria-label={`Supprimer l’ingrédient ${index + 1}`}
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_10rem] sm:items-end">
                  <FormField id={`ingredient-${index}-product`} label="Aliment" error={errors.ingredients?.[index]?.productId?.message} required>
                    <select id={`ingredient-${index}-product`} className={inputClassName} aria-invalid={Boolean(errors.ingredients?.[index]?.productId)} {...register(`ingredients.${index}.productId`)}>
                      <option value="">Sélectionner…</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.brand ? ` — ${product.brand}` : ''}</option>)}
                    </select>
                  </FormField>
                  <FormField id={`ingredient-${index}-quantity`} label="Quantité" error={errors.ingredients?.[index]?.quantity?.message} required>
                    <div className="relative">
                      <input id={`ingredient-${index}-quantity`} type="number" inputMode="decimal" enterKeyHint={index === fields.length - 1 ? 'done' : 'next'} min="0.1" step="0.1" className={`${inputClassName} pr-12`} aria-invalid={Boolean(errors.ingredients?.[index]?.quantity)} {...register(`ingredients.${index}.quantity`, { valueAsNumber: true })} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                        {selectedProduct?.basisUnit ?? 'g'}
                      </span>
                    </div>
                  </FormField>
                </div>
                {selectedProduct ? (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {Math.round(selectedProduct.nutritionPer100.caloriesKcal)} kcal pour 100 {selectedProduct.basisUnit}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <Button className="mt-3 w-full" variant="secondary" onClick={() => append({ productId: '', quantity: 100 })}>
          <Plus aria-hidden="true" className="size-4" />Ajouter un ingrédient
        </Button>
      </section>

      <InlineNotice title="Aperçu nutritionnel">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recette complète</p>
            <p className="mt-1 font-semibold text-slate-950 dark:text-white">{Math.round(total.caloriesKcal)} kcal</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">P {format(total.proteinGrams)} g · G {format(total.carbohydratesGrams)} g · L {format(total.fatGrams)} g</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Par portion</p>
            <p className="mt-1 font-semibold text-slate-950 dark:text-white">{Math.round(perServing.caloriesKcal)} kcal</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">P {format(perServing.proteinGrams)} g · G {format(perServing.carbohydratesGrams)} g · L {format(perServing.fatGrams)} g</p>
          </div>
        </div>
      </InlineNotice>

      <CollapsibleSection
        title="Note facultative"
        description="Préparation, cuisson ou repères personnels"
        defaultOpen={Boolean(initialValues.notes || errors.notes)}
        summary={errors.notes ? 'À corriger' : undefined}
      >
        <FormField id="recipe-notes" label="Notes" error={errors.notes?.message}>
          <textarea id="recipe-notes" rows={4} className={inputClassName} aria-invalid={Boolean(errors.notes)} {...register('notes')} />
        </FormField>
      </CollapsibleSection>

      <Button type="submit" disabled={isSubmitting || products.length === 0} className="w-full sm:w-auto">
        <Save aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
