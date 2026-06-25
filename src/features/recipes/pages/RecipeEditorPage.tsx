import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  loadRecipeDetails,
  saveRecipe,
} from '@/application/recipes/recipeService';
import { routePaths } from '@/app/routePaths';
import type { FoodProduct } from '@/domain/models/food';
import {
  createFoodLibraryFeedbackState,
  createFoodLibraryRestoreState,
  type FoodLibraryNavigationState,
} from '@/features/food-library/navigation/foodLibraryNavigation';
import { RecipeForm } from '@/features/recipes/components/RecipeForm';
import type { RecipeFormValues } from '@/features/recipes/schemas/recipeFormSchema';
import { repositories } from '@/infrastructure/repositories/repositories';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

export function RecipeEditorPage() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as (FoodLibraryNavigationState & Record<string, unknown>) | null;
  const libraryReturn = navigationState?.foodLibraryReturn?.section === 'recipes'
    ? navigationState.foodLibraryReturn
    : undefined;
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [initialValues, setInitialValues] = useState<RecipeFormValues>({
    name: '',
    numberOfServings: 2,
    notes: '',
    ingredients: [{ productId: '', quantity: 100 }],
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let active = true;
    void Promise.all([
      repositories.food.listProducts(true),
      recipeId ? loadRecipeDetails(recipeId) : Promise.resolve(undefined),
    ]).then(([nextProducts, details]) => {
      if (!active) return;
      setProducts(nextProducts.filter((product) => !product.isArchived || details?.ingredients.some(({ ingredient }) => ingredient.productId === product.id)));
      if (details) {
        setInitialValues({
          name: details.recipe.name,
          numberOfServings: details.recipe.numberOfServings,
          notes: details.recipe.notes ?? '',
          ingredients: details.ingredients.map(({ ingredient }) => ({
            productId: ingredient.productId,
            quantity: ingredient.quantity,
          })),
        });
      }
    }).catch((error: unknown) => {
      if (active) setErrorMessage(error instanceof Error ? error.message : 'Impossible de préparer la recette.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [recipeId]);

  const handleSubmit = async (values: RecipeFormValues) => {
    const saved = await saveRecipe({
      ...(recipeId ? { recipeId } : {}),
      name: values.name,
      numberOfServings: values.numberOfServings,
      ingredients: values.ingredients,
      ...(values.notes === undefined ? {} : { notes: values.notes }),
    });
    const feedbackState = createFoodLibraryFeedbackState(libraryReturn, {
      title: recipeId ? 'Recette mise à jour' : 'Recette créée',
      itemId: saved.recipe.id,
    });
    await navigate(libraryReturn?.path ?? routePaths.recipes, {
      state: {
        ...(navigationState ?? {}),
        ...feedbackState,
      },
    });
  };

  return (
    <section className="min-w-0" aria-labelledby="recipe-editor-title">
      <Link
        to={libraryReturn?.path ?? routePaths.recipes}
        state={{
          ...(navigationState ?? {}),
          ...createFoodLibraryRestoreState(libraryReturn),
        }}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />Retour aux recettes
      </Link>
      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Bibliothèque alimentaire</p>
        <h1 id="recipe-editor-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{recipeId ? 'Modifier la recette' : 'Créer une recette'}</h1>
        <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">Les valeurs sont calculées à partir des quantités et des données nutritionnelles locales.</p>
      </div>

      {loading ? <PageSkeleton className="mt-6" variant="form" /> : null}
      {errorMessage ? <InlineNotice className="mt-6" tone="error" title="Recette indisponible">{errorMessage}</InlineNotice> : null}
      {!loading && !errorMessage && products.length === 0 ? (
        <InlineNotice className="mt-6" tone="info" title="Aucun aliment disponible">
          <p>Crée d’abord un aliment local avant de composer une recette.</p>
          <Link className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white" to={routePaths.newFoodProduct}>Créer un aliment</Link>
        </InlineNotice>
      ) : null}
      {!loading && !errorMessage && products.length > 0 ? (
        <Card className="mt-6 p-4 sm:p-6">
          <RecipeForm
            initialValues={initialValues}
            products={products}
            submitLabel={recipeId ? 'Enregistrer la recette' : 'Créer la recette'}
            onSubmit={handleSubmit}
          />
        </Card>
      ) : null}
    </section>
  );
}
