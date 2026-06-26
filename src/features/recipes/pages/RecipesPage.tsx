import { Plus, Search, Utensils } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import type { MealSlot } from '@/domain/models/food';
import {
  createFoodLibraryReturnState,
  type FoodLibraryNavigationState,
} from '@/features/food-library/navigation/foodLibraryNavigation';
import { RecipeLibraryCard } from '@/features/recipes/components/RecipeLibraryCard';
import { RecipesSummary } from '@/features/recipes/components/RecipesSummary';
import { useRecipes } from '@/features/recipes/hooks/useRecipes';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

const mealSlots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export function RecipesPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as (FoodLibraryNavigationState & Record<string, unknown>) | null;
  const handledFeedbackRef = useRef<string | undefined>(undefined);
  const highlightTimerRef = useRef<number | undefined>(undefined);
  const requestedDate = searchParams.get('date') ?? '';
  const requestedSlot = searchParams.get('slot') as MealSlot | null;
  const targetDate = isValidLocalDate(requestedDate) ? requestedDate : toLocalDate();
  const targetSlot = requestedSlot && mealSlots.includes(requestedSlot) ? requestedSlot : 'lunch';
  const { recipes, status, errorMessage, busyId, refresh, remove } = useRecipes();
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<string>();
  const [highlightedRecipeId, setHighlightedRecipeId] = useState<string>();
  const currentPath = `${location.pathname}${location.search}`;
  const navigationState = useMemo(() => ({
    ...(location.state && typeof location.state === 'object' ? location.state : {}),
    ...createFoodLibraryReturnState(currentPath, location.key, 'recipes'),
  }), [currentPath, location.key, location.state]);

  const visibleRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');
    if (!normalizedQuery) return recipes;
    return recipes.filter((summary) => [summary.recipe.name, summary.recipe.notes]
      .some((value) => value?.toLocaleLowerCase('fr').includes(normalizedQuery)));
  }, [query, recipes]);

  const highlightRecipe = (recipeId: string) => {
    if (highlightTimerRef.current !== undefined) window.clearTimeout(highlightTimerRef.current);
    setHighlightedRecipeId(recipeId);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedRecipeId(undefined);
      highlightTimerRef.current = undefined;
    }, 2_500);
  };

  useEffect(() => () => {
    if (highlightTimerRef.current !== undefined) window.clearTimeout(highlightTimerRef.current);
  }, []);

  useEffect(() => {
    const returnFeedback = locationState?.foodLibraryFeedback;
    if (!returnFeedback) return;
    const key = `${returnFeedback.title}:${returnFeedback.itemId ?? ''}`;
    if (handledFeedbackRef.current === key) return;
    handledFeedbackRef.current = key;
    setFeedback(returnFeedback.title);
    if (returnFeedback.itemId) highlightRecipe(returnFeedback.itemId);
    const preservedState = location.state && typeof location.state === 'object'
      ? { ...location.state }
      : {};
    delete (preservedState as Partial<FoodLibraryNavigationState>).foodLibraryFeedback;
    delete (preservedState as Partial<FoodLibraryNavigationState>).scroll;
    delete (preservedState as Partial<FoodLibraryNavigationState>).restoreScrollKey;
    void navigate(currentPath, { replace: true, state: preservedState });
  }, [currentPath, location.state, locationState, navigate]);

  useEffect(() => {
    if (!highlightedRecipeId || status !== 'ready') return;
    window.requestAnimationFrame(() => {
      document.getElementById(`recipe-${highlightedRecipeId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }, [highlightedRecipeId, status, visibleRecipes.length]);

  const handleDelete = async (recipeId: string) => {
    const removed = await remove(recipeId);
    if (removed) setFeedback('Recette supprimée');
    return removed;
  };

  const totalIngredients = recipes.reduce((sum, summary) => sum + summary.ingredientCount, 0);
  const averageCalories = recipes.length > 0
    ? recipes.reduce((sum, summary) => sum + summary.nutritionPerServing.caloriesKcal, 0) / recipes.length
    : 0;

  return (
    <section className="min-w-0" aria-labelledby="recipes-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Bibliothèque alimentaire</p>
          <h1 id="recipes-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Recettes</h1>
          <p className="mt-2 hidden max-w-2xl text-slate-600 dark:text-slate-300 sm:block">
            Assemble des aliments locaux et ajoute rapidement une ou plusieurs portions au journal.
          </p>
        </div>
        <Link
          to={routePaths.newRecipe}
          state={navigationState}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 font-semibold text-white hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500 sm:w-auto"
        >
          <Plus aria-hidden="true" className="size-5" />Nouvelle recette
        </Link>
      </div>

      {errorMessage ? (
        <InlineNotice className="mt-5" tone="error" title="Recettes indisponibles" role="alert">
          <p>{errorMessage}</p>
          {status === 'error' ? <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button> : null}
        </InlineNotice>
      ) : null}

      {feedback ? (
        <InlineNotice className="mt-5" tone="success" title={feedback} role="status">
          La liste des recettes a été actualisée.
        </InlineNotice>
      ) : null}

      {status === 'loading' ? <PageSkeleton className="mt-6" variant="list" /> : null}

      {status === 'ready' ? (
        <>
          <RecipesSummary
            recipeCount={recipes.length}
            ingredientCount={totalIngredients}
            averageCaloriesPerServing={averageCalories}
          />

          {recipes.length > 0 ? (
            <Card className="mt-4 p-4 sm:p-5">
              <label htmlFor="recipe-search" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Rechercher une recette</label>
              <div className="relative mt-2">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="recipe-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className={`${inputClassName} pl-10`}
                  placeholder="Nom ou note"
                />
              </div>
            </Card>
          ) : null}

          {recipes.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={Utensils}
              title="Aucune recette"
              description="Crée une recette à partir des aliments enregistrés sur cet appareil."
              primaryAction={(
                <Link to={routePaths.newRecipe} state={navigationState} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
                  <Plus aria-hidden="true" className="size-4" />Créer une recette
                </Link>
              )}
              secondaryAction={(
                <Link to={routePaths.foodProducts} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold dark:border-slate-700">
                  Ouvrir les aliments
                </Link>
              )}
            />
          ) : visibleRecipes.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={Search}
              title="Aucune recette trouvée"
              description="Modifie la recherche pour retrouver une autre recette."
              primaryAction={<Button variant="secondary" onClick={() => setQuery('')}>Effacer la recherche</Button>}
            />
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {visibleRecipes.map((summary) => (
                <RecipeLibraryCard
                  key={summary.recipe.id}
                  summary={summary}
                  targetDate={targetDate}
                  targetSlot={targetSlot}
                  navigationState={navigationState}
                  journalNavigationState={location.state}
                  highlighted={highlightedRecipeId === summary.recipe.id}
                  deleting={busyId === summary.recipe.id}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
