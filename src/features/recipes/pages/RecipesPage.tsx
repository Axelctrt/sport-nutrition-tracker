import { LoaderCircle, Pencil, Plus, Trash2, Utensils } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  deleteRecipe,
  listRecipeSummaries,
  type RecipeSummary,
} from '@/application/recipes/recipeService';
import { addRecipeToJournalPath, editRecipePath, routePaths } from '@/app/routePaths';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { toLocalDate } from '@/shared/utils/dates';
import type { MealSlot } from '@/domain/models/food';
import { isValidLocalDate } from '@/shared/validation/localDate';

const mealSlots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export function RecipesPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const requestedDate = searchParams.get('date') ?? '';
  const requestedSlot = searchParams.get('slot') as MealSlot | null;
  const targetDate = isValidLocalDate(requestedDate) ? requestedDate : toLocalDate();
  const targetSlot = requestedSlot && mealSlots.includes(requestedSlot) ? requestedSlot : 'lunch';
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [busyId, setBusyId] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      setRecipes(await listRecipeSummaries());
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les recettes.');
      setStatus('error');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const remove = async (summary: RecipeSummary) => {
    if (!window.confirm(`Supprimer « ${summary.recipe.name} » ? Les anciennes entrées du journal conserveront leurs valeurs.`)) return;
    setBusyId(summary.recipe.id);
    try {
      await deleteRecipe(summary.recipe.id);
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de supprimer la recette.');
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <section aria-labelledby="recipes-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Recettes personnalisées</p>
          <h1 id="recipes-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Recettes</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Assemble des aliments locaux, calcule les valeurs totales et ajoute une ou plusieurs portions au journal.</p>
        </div>
        <Link to={routePaths.newRecipe} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800">
          <Plus aria-hidden="true" className="size-5" />Nouvelle recette
        </Link>
      </div>

      {errorMessage ? <InlineNotice className="mt-6" tone="error" title="Recettes indisponibles">{errorMessage}</InlineNotice> : null}
      {status === 'loading' ? <Card className="mt-8 p-8 text-center" role="status"><LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" /><p className="mt-3 font-semibold">Chargement des recettes…</p></Card> : null}
      {status === 'ready' && recipes.length === 0 ? (
        <Card className="mt-8 p-8 text-center">
          <Utensils aria-hidden="true" className="mx-auto size-10 text-brand-700" />
          <h2 className="mt-3 text-xl font-semibold text-slate-950 dark:text-white">Aucune recette</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Crée une recette à partir de tes aliments enregistrés.</p>
        </Card>
      ) : null}

      {status === 'ready' && recipes.length > 0 ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {recipes.map((summary) => (
            <Card key={summary.recipe.id} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{summary.recipe.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{summary.ingredientCount} ingrédient{summary.ingredientCount > 1 ? 's' : ''} · {summary.recipe.numberOfServings} portion{summary.recipe.numberOfServings > 1 ? 's' : ''}</p>
                </div>
                <p className="font-bold tabular-nums text-slate-950 dark:text-white">{Math.round(summary.nutritionPerServing.caloriesKcal)} kcal/portion</p>
              </div>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Par portion · P {summary.nutritionPerServing.proteinGrams.toFixed(1)} g · G {summary.nutritionPerServing.carbohydratesGrams.toFixed(1)} g · L {summary.nutritionPerServing.fatGrams.toFixed(1)} g</p>
              {summary.recipe.notes ? <p className="mt-3 text-sm text-slate-500">{summary.recipe.notes}</p> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to={addRecipeToJournalPath(summary.recipe.id, targetDate, targetSlot)} state={location.state} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800"><Plus aria-hidden="true" className="size-4" />Ajouter au journal</Link>
                <Link to={editRecipePath(summary.recipe.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold dark:border-slate-700"><Pencil aria-hidden="true" className="size-4" />Modifier</Link>
                <Button size="sm" variant="danger" disabled={busyId === summary.recipe.id} onClick={() => void remove(summary)}><Trash2 aria-hidden="true" className="size-4" />Supprimer</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
