import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  loadRecipeDetails,
  saveRecipeEntry,
  type RecipeDetails,
} from '@/application/recipes/recipeService';
import { foodJournalPath, routePaths } from '@/app/routePaths';
import type { FoodEntry, MealSlot } from '@/domain/models/food';
import { RecipeEntryForm } from '@/features/recipes/components/RecipeEntryForm';
import type { RecipeEntryFormValues } from '@/features/recipes/schemas/recipeEntrySchema';
import { repositories } from '@/infrastructure/repositories/repositories';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export function RecipeEntryEditorPage() {
  const { recipeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const entryId = searchParams.get('entryId') ?? undefined;
  const [details, setDetails] = useState<RecipeDetails>();
  const [entry, setEntry] = useState<FoodEntry>();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let active = true;
    if (!recipeId) {
      setErrorMessage('Recette introuvable.');
      setLoading(false);
      return () => { active = false; };
    }
    void Promise.all([
      loadRecipeDetails(recipeId),
      entryId ? repositories.food.getEntryById(entryId) : Promise.resolve(undefined),
    ]).then(([nextDetails, foundEntry]) => {
      if (!active) return;
      if (entryId && (!foundEntry || foundEntry.reference.sourceType !== 'recipe')) {
        throw new Error('Entrée de recette introuvable.');
      }
      setDetails(nextDetails);
      setEntry(foundEntry);
    }).catch((error: unknown) => {
      if (active) setErrorMessage(error instanceof Error ? error.message : 'Impossible de préparer le formulaire.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [entryId, recipeId]);

  const requestedDate = searchParams.get('date') ?? '';
  const requestedSlot = searchParams.get('slot') as MealSlot | null;
  const initialValues: RecipeEntryFormValues = entry?.reference.sourceType === 'recipe'
    ? {
        date: entry.date,
        mealSlot: entry.mealSlot,
        servingsConsumed: entry.reference.servingsConsumed,
      }
    : {
        date: isValidLocalDate(requestedDate) ? requestedDate : toLocalDate(),
        mealSlot: requestedSlot && slots.includes(requestedSlot) ? requestedSlot : 'lunch',
        servingsConsumed: 1,
      };

  const handleSubmit = async (values: RecipeEntryFormValues) => {
    if (!recipeId) return;
    await saveRecipeEntry({
      ...(entryId ? { entryId } : {}),
      recipeId,
      ...values,
    });
    await navigate(foodJournalPath(values.date));
  };

  return (
    <section aria-labelledby="recipe-entry-title">
      <Link to={foodJournalPath(initialValues.date)} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"><ArrowLeft aria-hidden="true" className="size-4" />Retour au journal</Link>
      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Journal alimentaire</p>
        <h1 id="recipe-entry-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{entryId ? 'Modifier la recette consommée' : 'Ajouter une recette au journal'}</h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Choisis le repas et le nombre de portions réellement consommées.</p>
      </div>
      {loading ? <Card className="mt-8 p-8 text-center" role="status"><LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" /><p className="mt-3 font-semibold">Chargement…</p></Card> : null}
      {errorMessage ? <InlineNotice className="mt-8" tone="error" title="Ajout indisponible">{errorMessage}</InlineNotice> : null}
      {!loading && !errorMessage && details ? <Card className="mt-8 p-5 sm:p-7"><h2 className="mb-5 text-xl font-semibold text-slate-950 dark:text-white">{details.recipe.name}</h2><RecipeEntryForm details={details} initialValues={initialValues} submitLabel={entryId ? 'Enregistrer les modifications' : 'Ajouter au journal'} onSubmit={handleSubmit} /></Card> : null}
      {!loading && !errorMessage && !details ? <Link to={routePaths.recipes}>Retour aux recettes</Link> : null}
    </section>
  );
}
