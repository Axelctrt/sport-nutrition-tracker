import { Flame, Layers3, Utensils } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

interface RecipesSummaryProps {
  recipeCount: number;
  ingredientCount: number;
  averageCaloriesPerServing: number;
}

export function RecipesSummary({
  recipeCount,
  ingredientCount,
  averageCaloriesPerServing,
}: RecipesSummaryProps) {
  return (
    <Card className="mt-5 p-4 sm:p-5" aria-label="Résumé des recettes">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Recettes enregistrées</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Valeurs calculées depuis les aliments locaux.</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">
          {recipeCount} recette{recipeCount > 1 ? 's' : ''}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950/70">
          <Utensils aria-hidden="true" className="size-4 text-slate-500" />
          <p className="mt-2 text-lg font-bold tabular-nums text-slate-950 dark:text-white">{recipeCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Recettes</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950/70">
          <Layers3 aria-hidden="true" className="size-4 text-slate-500" />
          <p className="mt-2 text-lg font-bold tabular-nums text-slate-950 dark:text-white">{ingredientCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Ingrédients</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950/70">
          <Flame aria-hidden="true" className="size-4 text-slate-500" />
          <p className="mt-2 text-lg font-bold tabular-nums text-slate-950 dark:text-white">{Math.round(averageCaloriesPerServing)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">kcal moy.</p>
        </div>
      </div>
    </Card>
  );
}
