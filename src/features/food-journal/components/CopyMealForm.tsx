import { zodResolver } from '@hookform/resolvers/zod';
import { Copy } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { MealSlot } from '@/domain/models/food';
import {
  copyMealFormSchema,
  type CopyMealFormValues,
} from '@/features/food-journal/schemas/foodEntrySchema';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';

interface CopyMealFormProps {
  initialDate: string;
  initialSlot: MealSlot;
  disabled?: boolean;
  onSubmit: (values: CopyMealFormValues) => Promise<void>;
}

export function CopyMealForm({ initialDate, initialSlot, disabled, onSubmit }: CopyMealFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CopyMealFormValues>({
    resolver: zodResolver(copyMealFormSchema),
    defaultValues: { targetDate: initialDate, targetSlot: initialSlot },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end dark:bg-slate-950">
      <div>
        <label htmlFor={`copy-date-${initialSlot}`} className="text-xs font-semibold text-slate-700 dark:text-slate-200">Copier vers la date</label>
        <input id={`copy-date-${initialSlot}`} type="date" className={`${inputClassName} mt-1`} {...register('targetDate')} />
        {errors.targetDate ? <p className="mt-1 text-xs text-red-700">{errors.targetDate.message}</p> : null}
      </div>
      <div>
        <label htmlFor={`copy-slot-${initialSlot}`} className="text-xs font-semibold text-slate-700 dark:text-slate-200">Repas cible</label>
        <select id={`copy-slot-${initialSlot}`} className={`${inputClassName} mt-1`} {...register('targetSlot')}>
          {Object.entries(mealSlotLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={disabled || isSubmitting}><Copy aria-hidden="true" className="size-4" />Copier</Button>
    </form>
  );
}
