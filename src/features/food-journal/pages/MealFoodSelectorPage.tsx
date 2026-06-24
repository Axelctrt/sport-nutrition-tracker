import {
  ArrowLeft,
  Globe2,
  History,
  LibraryBig,
  LoaderCircle,
  Plus,
  Search,
  ScanLine,
  Star,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  barcodeScannerPath,
  foodJournalPath,
  newFoodProductForMealPath,
} from '@/app/routePaths';
import { filterMealFoodProducts } from '@/application/food/mealFoodSelectorService';
import { saveProductEntry } from '@/application/food/foodJournalService';
import type { FoodProduct, MealSlot } from '@/domain/models/food';
import { FoodProductPickerCard } from '@/features/food-journal/components/FoodProductPickerCard';
import { MealFoodSelectionForm } from '@/features/food-journal/components/MealFoodSelectionForm';
import { MealOpenFoodFactsSearchPanel } from '@/features/food-journal/components/MealOpenFoodFactsSearchPanel';
import type { FoodEntryFormValues } from '@/features/food-journal/schemas/foodEntrySchema';
import { useMealFoodSelector } from '@/features/food-journal/hooks/useMealFoodSelector';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

const mealSlots: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
type ProductSource = 'recent' | 'favorites' | 'all' | 'openFoodFacts';

function isMealSlot(value: string | null): value is MealSlot {
  return value !== null && mealSlots.includes(value as MealSlot);
}

const sourceLabels: Record<Exclude<ProductSource, 'openFoodFacts'>, string> = {
  recent: 'Récents',
  favorites: 'Favoris',
  all: 'Tous les aliments',
};

export function MealFoodSelectorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedDate = searchParams.get('date');
  const requestedSlot = searchParams.get('slot');
  const requestedProductId = searchParams.get('productId');
  const requestedSource = searchParams.get('source');
  const date = requestedDate && isValidLocalDate(requestedDate) ? requestedDate : toLocalDate();
  const mealSlot = isMealSlot(requestedSlot) ? requestedSlot : 'snacks';
  const { data, status, errorMessage, refresh } = useMealFoodSelector();
  const [source, setSource] = useState<ProductSource>(
    requestedSource === 'openFoodFacts' ? 'openFoodFacts' : 'recent',
  );
  const [query, setQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(
    requestedProductId ?? undefined,
  );
  const [remoteSelectedProduct, setRemoteSelectedProduct] = useState<FoodProduct>();
  const [submitError, setSubmitError] = useState<string>();
  const selectionFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data) return;

    if (requestedSource === 'openFoodFacts') return;

    if (data.recentProducts.length === 0) {
      setSource(data.favoriteProducts.length > 0 ? 'favorites' : 'all');
    }
  }, [data, requestedSource]);

  useEffect(() => {
    if (!data || !requestedProductId) return;
    if (data.allProducts.some((product) => product.id === requestedProductId)) {
      setSelectedProductId(requestedProductId);
    }
  }, [data, requestedProductId]);

  const sourceProducts = useMemo(() => {
    if (!data || source === 'openFoodFacts') return [];
    if (source === 'recent') return data.recentProducts;
    if (source === 'favorites') return data.favoriteProducts;
    return data.allProducts;
  }, [data, source]);

  const visibleProducts = useMemo(
    () => filterMealFoodProducts(query.trim().length > 0 && data ? data.allProducts : sourceProducts, query),
    [data, query, sourceProducts],
  );

  const selectedProduct = data?.allProducts.find(
    (product) => product.id === selectedProductId,
  ) ?? (remoteSelectedProduct?.id === selectedProductId ? remoteSelectedProduct : undefined);

  useEffect(() => {
    if (!selectedProductId) return;
    selectionFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedProductId]);

  const handleSelect = (product: FoodProduct) => {
    setRemoteSelectedProduct(undefined);
    setSelectedProductId(product.id);
    setSubmitError(undefined);
  };

  const handleRemoteProductReady = async (product: FoodProduct) => {
    setRemoteSelectedProduct(product);
    setSelectedProductId(product.id);
    setSubmitError(undefined);
  };

  const handleSubmit = async (values: FoodEntryFormValues) => {
    setSubmitError(undefined);
    try {
      await saveProductEntry(values);
      await navigate(foodJournalPath(values.date));
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Impossible d’ajouter cet aliment au repas.',
      );
    }
  };

  return (
    <section className="min-w-0 overflow-x-clip" aria-labelledby="meal-food-selector-title">
      <Link
        to={foodJournalPath(date)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour au journal
      </Link>

      <div className="mt-5 flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            {mealSlotLabels[mealSlot]} · {formatLocalDate(date)}
          </p>
          <h1
            id="meal-food-selector-title"
            className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
          >
            Ajouter un aliment
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            Choisis un aliment local ou recherche-le dans Open Food Facts, puis indique la quantité sans quitter le repas.
          </p>
        </div>
        <Link
          to={newFoodProductForMealPath(date, mealSlot)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <Plus aria-hidden="true" className="size-4" />
          Créer un aliment manuel
        </Link>
      </div>

      {errorMessage ? (
        <InlineNotice className="mt-6" tone="error" title="Aliments indisponibles">
          <p>{errorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {status === 'loading' ? (
        <Card className="mt-6 p-8 text-center" role="status">
          <LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" />
          <p className="mt-3 font-semibold">Chargement des aliments…</p>
        </Card>
      ) : null}

      {status === 'ready' && data ? (
        <>
          <Card className="mt-6 min-w-0 p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Source de l’aliment
            </p>
            <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Sources d’aliments">
              <Button
                variant={source === 'recent' && query.length === 0 ? 'primary' : 'secondary'}
                aria-pressed={source === 'recent' && query.length === 0}
                onClick={() => {
                  setQuery('');
                  setSource('recent');
                }}
              >
                <History aria-hidden="true" className="size-4" />
                Récents ({data.recentProducts.length})
              </Button>
              <Button
                variant={source === 'favorites' && query.length === 0 ? 'primary' : 'secondary'}
                aria-pressed={source === 'favorites' && query.length === 0}
                onClick={() => {
                  setQuery('');
                  setSource('favorites');
                }}
              >
                <Star aria-hidden="true" className="size-4" />
                Favoris ({data.favoriteProducts.length})
              </Button>
              <Button
                variant={source === 'all' && query.length === 0 ? 'primary' : 'secondary'}
                aria-pressed={source === 'all' && query.length === 0}
                onClick={() => {
                  setQuery('');
                  setSource('all');
                }}
              >
                <LibraryBig aria-hidden="true" className="size-4" />
                Tous ({data.allProducts.length})
              </Button>
              <Button
                variant={source === 'openFoodFacts' ? 'primary' : 'secondary'}
                aria-pressed={source === 'openFoodFacts'}
                onClick={() => {
                  setQuery('');
                  setSource('openFoodFacts');
                }}
              >
                <Globe2 aria-hidden="true" className="size-4" />
                Open Food Facts
              </Button>
            </div>

            <Link
              to={barcodeScannerPath(date, mealSlot)}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 sm:w-auto"
            >
              <ScanLine aria-hidden="true" className="size-4" />
              Scanner un code-barres
            </Link>

            {source !== 'openFoodFacts' ? (
              <div className="mt-4">
                <label htmlFor="meal-food-search" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Rechercher dans les aliments locaux
                </label>
                <div className="relative mt-2 min-w-0">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="meal-food-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className={`${inputClassName} pl-10`}
                    autoComplete="off"
                    placeholder="Nom, marque ou code-barres"
                  />
                </div>
              </div>
            ) : null}
          </Card>

          {source === 'openFoodFacts' ? (
            <div className="mt-6">
              <MealOpenFoodFactsSearchPanel
                localProducts={data.allProducts}
                selectedProductId={selectedProductId}
                onProductReady={handleRemoteProductReady}
              />
            </div>
          ) : (
            <>
              <div className="mt-6 flex min-w-0 items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-semibold text-slate-950 dark:text-white">
                    {query.trim().length > 0 ? 'Résultats locaux' : sourceLabels[source]}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {visibleProducts.length} aliment{visibleProducts.length > 1 ? 's' : ''} disponible{visibleProducts.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {visibleProducts.length > 0 ? (
                <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
                  {visibleProducts.map((product) => (
                    <FoodProductPickerCard
                      key={product.id}
                      product={product}
                      selected={product.id === selectedProductId}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              ) : (
                <Card className="mt-4 p-6 text-center">
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    {query.trim().length > 0
                      ? 'Aucun aliment local ne correspond'
                      : source === 'recent'
                        ? 'Aucun aliment récent'
                        : source === 'favorites'
                          ? 'Aucun aliment favori'
                          : 'Aucun aliment enregistré'}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Recherche un autre nom, utilise Open Food Facts ou crée un aliment manuel.
                  </p>
                  <Link
                    to={newFoodProductForMealPath(date, mealSlot)}
                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Créer un aliment
                  </Link>
                </Card>
              )}
            </>
          )}

          {selectedProduct ? (
            <div ref={selectionFormRef} className="scroll-mt-4">
              <Card className="mt-6 min-w-0 p-5 sm:p-7">
                {submitError ? (
                  <InlineNotice className="mb-5" tone="error" title="Ajout impossible">
                    {submitError}
                  </InlineNotice>
                ) : null}
                {!selectedProduct.isNutritionComplete ? (
                  <InlineNotice className="mb-5" tone="info" title="Valeurs nutritionnelles à vérifier">
                    Certaines valeurs sont absentes de la source et ont été enregistrées à zéro. Tu peux ajouter le produit, puis corriger sa fiche locale si nécessaire.
                  </InlineNotice>
                ) : null}
                <MealFoodSelectionForm
                  product={selectedProduct}
                  date={date}
                  mealSlot={mealSlot}
                  onSubmit={handleSubmit}
                />
              </Card>
            </div>
          ) : (
            <InlineNotice className="mt-6" title="Choisis un aliment">
              Sélectionne un résultat pour afficher ses valeurs, régler la quantité et confirmer le repas cible.
            </InlineNotice>
          )}
        </>
      ) : null}
    </section>
  );
}
