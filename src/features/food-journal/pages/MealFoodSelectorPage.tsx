import { ArrowLeft, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  foodJournalPath,
  newFoodProductForMealPath,
  type FoodSelectorSource,
} from '@/app/routePaths';
import { filterMealFoodProducts } from '@/application/food/mealFoodSelectorService';
import { saveProductEntry } from '@/application/food/foodJournalService';
import type { FoodProduct, MealSlot } from '@/domain/models/food';
import { FoodAddMethodGrid } from '@/features/food-journal/components/FoodAddMethodGrid';
import { FoodProductPickerCard } from '@/features/food-journal/components/FoodProductPickerCard';
import { FoodEntryQuickDialog } from '@/features/food-journal/components/FoodEntryQuickDialog';
import { MealOpenFoodFactsSearchPanel } from '@/features/food-journal/components/MealOpenFoodFactsSearchPanel';
import type { FoodEntryFormValues } from '@/features/food-journal/schemas/foodEntrySchema';
import {
  getLastFoodAddMethod,
  saveLastFoodAddMethod,
  type FoodAddMethod,
} from '@/features/food-journal/preferences/foodAddMethodPreference';
import { useMealFoodSelector } from '@/features/food-journal/hooks/useMealFoodSelector';
import {
  createFoodJournalFeedbackState,
  createFoodJournalRestoreState,
  foodJournalCancelPath,
  type FoodJournalNavigationState,
} from '@/features/food-journal/navigation/foodJournalNavigation';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';
import { isSupportedBarcode, sanitizeBarcode } from '@/infrastructure/open-food-facts/barcode';

const mealSlots: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
const selectorSources: readonly FoodSelectorSource[] = [
  'recent',
  'favorites',
  'all',
  'openFoodFacts',
];

function isMealSlot(value: string | null): value is MealSlot {
  return value !== null && mealSlots.includes(value as MealSlot);
}

function isFoodSelectorSource(value: string | null): value is FoodSelectorSource {
  return value !== null && selectorSources.includes(value as FoodSelectorSource);
}

const sourceLabels: Record<Exclude<FoodSelectorSource, 'openFoodFacts'>, string> = {
  recent: 'Récents',
  favorites: 'Favoris',
  all: 'Mes aliments',
};

export function MealFoodSelectorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as FoodJournalNavigationState | null;
  const requestedDate = searchParams.get('date');
  const requestedSlot = searchParams.get('slot');
  const requestedProductId = searchParams.get('productId');
  const requestedSource = searchParams.get('source');
  const directSearchSource = requestedSource === 'all' || requestedSource === 'openFoodFacts';
  const date = requestedDate && isValidLocalDate(requestedDate) ? requestedDate : toLocalDate();
  const mealSlot = isMealSlot(requestedSlot) ? requestedSlot : 'snacks';
  const { data, status, errorMessage, refresh } = useMealFoodSelector();
  const [source, setSource] = useState<FoodSelectorSource>(
    isFoodSelectorSource(requestedSource) ? requestedSource : 'recent',
  );
  const [lastMethod, setLastMethod] = useState<FoodAddMethod | undefined>(() =>
    getLastFoodAddMethod(mealSlot),
  );
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState(requestedSource === 'all');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(
    requestedProductId ?? undefined,
  );
  const [remoteSelectedProduct, setRemoteSelectedProduct] = useState<FoodProduct>();
  const [submitError, setSubmitError] = useState<string>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLastMethod(getLastFoodAddMethod(mealSlot));
  }, [mealSlot]);

  useEffect(() => {
    if (!data || isFoodSelectorSource(requestedSource)) return;

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

  useEffect(() => {
    if (status !== 'ready' || requestedSource !== 'all') return;
    searchInputRef.current?.focus();
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [requestedSource, status]);

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

  const rememberMethod = (method: FoodAddMethod) => {
    setLastMethod(method);
    saveLastFoodAddMethod(mealSlot, method);
  };

  const selectSource = (nextSource: FoodSelectorSource) => {
    setQuery('');
    setSearchMode(false);
    setSource(nextSource);
    setSubmitError(undefined);
  };

  const requestSearch = () => {
    setSearchMode(true);
    setSource('all');
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleSelect = (product: FoodProduct) => {
    rememberMethod(searchMode ? 'search' : source);
    setRemoteSelectedProduct(undefined);
    setSelectedProductId(product.id);
    setSubmitError(undefined);
  };

  const handleRemoteProductReady = async (product: FoodProduct) => {
    rememberMethod('openFoodFacts');
    setRemoteSelectedProduct(product);
    setSelectedProductId(product.id);
    setSubmitError(undefined);
  };

  const handleSubmit = async (values: FoodEntryFormValues) => {
    setSubmitError(undefined);
    try {
      const entry = await saveProductEntry(values);
      const returnContext = navigationState?.foodJournalReturn;
      await navigate(returnContext?.path ?? foodJournalPath(values.date), {
        state: createFoodJournalFeedbackState(returnContext, {
          title: `Aliment ajouté au ${mealSlotLabels[values.mealSlot].toLocaleLowerCase('fr')}`,
          mealSlot: values.mealSlot,
          entryId: entry.id,
        }),
      });
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
        to={foodJournalCancelPath(
          navigationState?.foodJournalReturn,
          foodJournalPath(date),
        )}
        state={createFoodJournalRestoreState(navigationState?.foodJournalReturn)}
        className="hidden items-center gap-2 text-sm font-semibold text-brand-700 hover:underline lg:inline-flex dark:text-brand-300"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {navigationState?.foodJournalReturn?.addMethodsPath
          ? 'Retour aux méthodes d’ajout'
          : 'Retour au journal'}
      </Link>

      <div className="mt-5 min-w-0">
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
          Choisis la méthode la plus rapide. La date et le repas resteront sélectionnés jusqu’au retour au journal.
        </p>
      </div>

      {errorMessage ? (
        <InlineNotice className="mt-6" tone="error" title="Aliments indisponibles">
          <p>{errorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {status === 'loading' ? <PageSkeleton className="mt-6" variant="list" /> : null}

      {status === 'ready' && data ? (
        <>
          <Card className="mt-6 min-w-0 p-4 sm:p-5">
            {!directSearchSource ? (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    Choisir une méthode
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Les aliments locaux restent disponibles hors connexion. Open Food Facts, le scanner et l’IA peuvent nécessiter le réseau.
                  </p>
                </div>
                <div className="mt-4">
                  <FoodAddMethodGrid
                    date={date}
                    mealSlot={mealSlot}
                    activeSource={source}
                    searchActive={searchMode}
                    hasFavoriteProducts={data.favoriteProducts.length > 0}
                    lastMethod={lastMethod}
                    navigationState={navigationState}
                    onSelectSource={selectSource}
                    onSearchRequested={requestSearch}
                    onMethodUsed={rememberMethod}
                  />
                </div>
              </>
            ) : null}

            {source !== 'openFoodFacts' ? (
              <div className={directSearchSource ? '' : 'mt-5 border-t border-slate-200 pt-5 dark:border-slate-800'}>
                <label htmlFor="meal-food-search" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Rechercher dans mes aliments
                </label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  La recherche ignore les accents et tolère une petite faute dans les mots longs.
                </p>
                <div className="relative mt-2 min-w-0">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    ref={searchInputRef}
                    id="meal-food-search"
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      if (event.target.value.length > 0) {
                        setSearchMode(true);
                        setSource('all');
                      }
                    }}
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
                date={date}
                mealSlot={mealSlot}
                navigationState={location.state}
                autoFocus={requestedSource === 'openFoodFacts'}
              />
            </div>
          ) : (
            <>
              <div className="mt-6 flex min-w-0 items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-semibold text-slate-950 dark:text-white">
                    {query.trim().length > 0 ? 'Résultats dans mes aliments' : sourceLabels[source]}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {visibleProducts.length} aliment{visibleProducts.length > 1 ? 's' : ''} disponible{visibleProducts.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {visibleProducts.length > 0 ? (
                <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
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
                <EmptyState
                  className="mt-4"
                  icon={Search}
                  title={query.trim().length > 0
                    ? 'Aucun aliment local ne correspond'
                    : source === 'recent'
                      ? 'Aucun aliment récent'
                      : source === 'favorites'
                        ? 'Aucun aliment favori'
                        : 'Aucun aliment enregistré'}
                  description="Essaie un autre nom, recherche dans Open Food Facts ou crée un aliment manuel."
                  primaryAction={(
                    <Link
                      to={newFoodProductForMealPath(date, mealSlot, {
                        ...(isSupportedBarcode(query.trim())
                          ? { barcode: sanitizeBarcode(query.trim()) }
                          : query.trim()
                            ? { name: query.trim() }
                            : {}),
                        returnSource: source,
                      })}
                      state={location.state}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      {query.trim() ? 'Créer cet aliment' : 'Créer un aliment'}
                    </Link>
                  )}
                  secondaryAction={!directSearchSource ? (
                    <Button variant="secondary" onClick={() => selectSource('openFoodFacts')}>
                      Rechercher dans Open Food Facts
                    </Button>
                  ) : undefined}
                />
              )}
            </>
          )}

          <FoodEntryQuickDialog
            product={selectedProduct}
            date={date}
            mealSlot={mealSlot}
            errorMessage={submitError}
            onClose={() => {
              setSelectedProductId(undefined);
              setRemoteSelectedProduct(undefined);
              setSubmitError(undefined);
            }}
            onSubmit={handleSubmit}
          />
        </>
      ) : null}
    </section>
  );
}
