import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { RecipeDetails } from '@/application/recipes/recipeService';
import {
  recipeEntrySchema,
  type RecipeEntryFormValues,
} from '@/features/recipes/schemas/recipeEntrySchema';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface RecipeEntryFormProps {
  details: RecipeDetails;
  initialValues: RecipeEntryFormValues;
  submitLabel: string;
  onSubmit: (values: RecipeEntryFormValues) => Promise<void>;
}

export function RecipeEntryForm({ details, initialValues, submitLabel, onSubmit }: RecipeEntryFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RecipeEntryFormValues>({
    resolver: zodResolver(recipeEntrySchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => reset(initialValues), [initialValues, reset]);
  const servings = watch('servingsConsumed');
  const factor = Number.isFinite(servings) && servings > 0 ? servings : 0;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <InlineNotice title="Valeurs consommées estimées">
        {Math.round(details.nutritionPerServing.caloriesKcal * factor)} kcal · P {(details.nutritionPerServing.proteinGrams * factor).toFixed(1)} g · G {(details.nutritionPerServing.carbohydratesGrams * factor).toFixed(1)} g · L {(details.nutritionPerServing.fatGrams * factor).toFixed(1)} g
      </InlineNotice>
      <div className="grid gap-5 sm:grid-cols-3">
        <FormField id="recipe-entry-date" label="Date" error={errors.date?.message} required>
          <input id="recipe-entry-date" type="date" className={inputClassName} {...register('date')} />
        </FormField>
        <FormField id="recipe-entry-slot" label="Repas" error={errors.mealSlot?.message} required>
          <select id="recipe-entry-slot" className={inputClassName} {...register('mealSlot')}>
            {Object.entries(mealSlotLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </FormField>
        <FormField id="recipe-entry-servings" label="Portions consommées" error={errors.servingsConsumed?.message} required>
          <input id="recipe-entry-servings" type="number" inputMode="decimal" min="0.1" step="0.1" className={inputClassName} {...register('servingsConsumed', { valueAsNumber: true })} />
        </FormField>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        <Plus aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
