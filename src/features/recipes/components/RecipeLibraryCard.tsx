import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RecipeSummary } from '@/application/recipes/recipeService';
import { addRecipeToJournalPath, editRecipePath } from '@/app/routePaths';
import type { FoodLibraryNavigationState } from '@/features/food-library/navigation/foodLibraryNavigation';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { cn } from '@/shared/utils/cn';

interface RecipeLibraryCardProps {
  summary: RecipeSummary;
  targetDate: string;
  targetSlot: string;
  navigationState: FoodLibraryNavigationState;
  journalNavigationState?: unknown;
  highlighted?: boolean;
  deleting?: boolean;
  onDelete: (recipeId: string) => Promise<boolean>;
}

function format(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

export function RecipeLibraryCard({
  summary,
  targetDate,
  targetSlot,
  navigationState,
  journalNavigationState,
  highlighted = false,
  deleting = false,
  onDelete,
}: RecipeLibraryCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { recipe, nutritionPerServing } = summary;

  return (
    <>
      <Card
        id={`recipe-${recipe.id}`}
        className={cn(
          'scroll-mt-28 p-4 transition-colors sm:p-5 motion-reduce:transition-none',
          highlighted && 'border-brand-300 bg-brand-50/70 dark:border-brand-800 dark:bg-brand-950/30',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words font-semibold text-slate-950 dark:text-white">{recipe.name}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {summary.ingredientCount} ingrédient{summary.ingredientCount > 1 ? 's' : ''} · {recipe.numberOfServings} portion{recipe.numberOfServings > 1 ? 's' : ''}
            </p>
          </div>

          <details className="relative shrink-0">
            <summary
              role="button"
              aria-label={`Actions pour ${recipe.name}`}
              className="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden"
            >
              <MoreHorizontal aria-hidden="true" className="size-5" />
            </summary>
            <div className="absolute right-0 z-20 mt-1 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <Link
                to={editRecipePath(recipe.id)}
                state={navigationState}
                onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}
                className="inline-flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Pencil aria-hidden="true" className="size-4" />
                Modifier
              </Link>
              <Button
                className="w-full justify-start"
                size="sm"
                variant="dangerGhost"
                disabled={deleting}
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  setDeleteOpen(true);
                }}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Supprimer
              </Button>
            </div>
          </details>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-orange-50 px-2 py-1 font-semibold text-orange-900 dark:bg-orange-950/40 dark:text-orange-100">
            {Math.round(nutritionPerServing.caloriesKcal)} kcal / portion
          </span>
          <span className="rounded-lg bg-blue-50 px-2 py-1 font-medium text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
            P {format(nutritionPerServing.proteinGrams)} g
          </span>
          <span className="rounded-lg bg-amber-50 px-2 py-1 font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            G {format(nutritionPerServing.carbohydratesGrams)} g
          </span>
          <span className="rounded-lg bg-rose-50 px-2 py-1 font-medium text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            L {format(nutritionPerServing.fatGrams)} g
          </span>
        </div>

        {recipe.notes ? (
          <details className="mt-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/70">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
              Notes de la recette
            </summary>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{recipe.notes}</p>
          </details>
        ) : null}

        <Link
          to={addRecipeToJournalPath(recipe.id, targetDate, targetSlot)}
          state={journalNavigationState}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500 sm:w-auto"
        >
          <Plus aria-hidden="true" className="size-4" />
          Ajouter au journal
        </Link>
      </Card>

      <ConfirmationDialog
        open={deleteOpen}
        title="Supprimer cette recette ?"
        description={`« ${recipe.name} » sera supprimée. Les anciennes entrées du journal conserveront leurs valeurs nutritionnelles.`}
        confirmLabel="Supprimer"
        tone="danger"
        isPending={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          void onDelete(recipe.id).then((removed) => {
            if (removed) setDeleteOpen(false);
          });
        }}
      />
    </>
  );
}
