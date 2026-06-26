import { DatabaseZap, Plus, Search, Utensils } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import {
  createFoodLibraryReturnState,
  type FoodLibraryNavigationState,
} from '@/features/food-library/navigation/foodLibraryNavigation';
import { FoodProductCard } from '@/features/products/components/FoodProductCard';
import { FoodProductsSummary } from '@/features/products/components/FoodProductsSummary';
import { useFoodProducts } from '@/features/products/hooks/useFoodProducts';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { cn } from '@/shared/utils/cn';

type ProductFilter = 'all' | 'favorites' | 'verification';

const filterLabels: Record<ProductFilter, string> = {
  all: 'Tous',
  favorites: 'Favoris',
  verification: 'À vérifier',
};

export function FoodProductsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as FoodLibraryNavigationState | null;
  const handledFeedbackRef = useRef<string | undefined>(undefined);
  const highlightTimerRef = useRef<number | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProductFilter>('all');
  const [feedback, setFeedback] = useState<string>();
  const [highlightedProductId, setHighlightedProductId] = useState<string>();
  const {
    products,
    allProducts,
    status,
    errorMessage,
    archivingId,
    refresh,
    archive,
  } = useFoodProducts(query);
  const currentPath = `${location.pathname}${location.search}`;
  const navigationState = useMemo(
    () => createFoodLibraryReturnState(currentPath, location.key, 'products'),
    [currentPath, location.key],
  );

  const visibleProducts = useMemo(() => products.filter((product) => {
    if (filter === 'favorites') return product.isFavorite;
    if (filter === 'verification') return !product.isNutritionComplete;
    return true;
  }), [filter, products]);

  const highlightProduct = (productId: string) => {
    if (highlightTimerRef.current !== undefined) window.clearTimeout(highlightTimerRef.current);
    setHighlightedProductId(productId);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedProductId(undefined);
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
    if (returnFeedback.itemId) highlightProduct(returnFeedback.itemId);
    void navigate(currentPath, { replace: true, state: null });
  }, [currentPath, locationState, navigate]);

  useEffect(() => {
    if (!highlightedProductId || status !== 'ready') return;
    window.requestAnimationFrame(() => {
      document.getElementById(`food-product-${highlightedProductId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }, [highlightedProductId, status, visibleProducts.length]);

  const handleArchive = async (productId: string) => {
    const archived = await archive(productId);
    if (archived) setFeedback('Aliment archivé');
    return archived;
  };

  const favoriteCount = allProducts.filter((product) => product.isFavorite).length;
  const openFoodFactsCount = allProducts.filter((product) => product.source.type === 'openFoodFacts').length;
  const incompleteCount = allProducts.filter((product) => !product.isNutritionComplete).length;
  const hasActiveSearch = query.trim().length > 0 || filter !== 'all';

  return (
    <section className="min-w-0" aria-labelledby="food-products-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Bibliothèque alimentaire</p>
          <h1 id="food-products-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Aliments locaux</h1>
          <p className="mt-2 hidden max-w-2xl text-slate-600 dark:text-slate-300 sm:block">
            Retrouve les produits enregistrés sur cet appareil et disponibles hors connexion.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
          <Link
            to={routePaths.foodSearch}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 sm:px-4"
          >
            <DatabaseZap aria-hidden="true" className="size-5" />
            Rechercher
          </Link>
          <Link
            to={routePaths.newFoodProduct}
            state={navigationState}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500 sm:px-4"
          >
            <Plus aria-hidden="true" className="size-5" />
            Créer
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <InlineNotice className="mt-5" tone="error" title="Catalogue indisponible" role="alert">
          <p>{errorMessage}</p>
          {status === 'error' ? <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button> : null}
        </InlineNotice>
      ) : null}

      {feedback ? (
        <InlineNotice className="mt-5" tone="success" title={feedback} role="status">
          La bibliothèque locale a été actualisée.
        </InlineNotice>
      ) : null}

      {status === 'loading' ? <PageSkeleton className="mt-6" variant="list" /> : null}

      {status === 'ready' ? (
        <>
          <FoodProductsSummary
            totalCount={allProducts.length}
            favoriteCount={favoriteCount}
            openFoodFactsCount={openFoodFactsCount}
            incompleteCount={incompleteCount}
          />

          <Card className="mt-4 p-4 sm:p-5">
            <label htmlFor="food-product-search" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Rechercher un aliment
            </label>
            <div className="relative mt-2">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="food-product-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={`${inputClassName} pl-10`}
                placeholder="Nom, marque ou code-barres"
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Filtrer les aliments">
              {(Object.keys(filterLabels) as ProductFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    'min-h-11 rounded-xl border px-2 text-sm font-semibold transition-colors motion-reduce:transition-none',
                    filter === value
                      ? 'border-brand-700 bg-brand-700 text-white dark:border-brand-500 dark:bg-brand-600'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
                  )}
                >
                  {filterLabels[value]}
                </button>
              ))}
            </div>
          </Card>

          {allProducts.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={Utensils}
              title="Aucun aliment local"
              description="Crée un aliment manuel ou enregistre un produit depuis Open Food Facts pour commencer ta bibliothèque hors connexion."
              primaryAction={(
                <Link to={routePaths.newFoodProduct} state={navigationState} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
                  <Plus aria-hidden="true" className="size-4" />Créer un aliment
                </Link>
              )}
              secondaryAction={(
                <Link to={routePaths.foodSearch} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold dark:border-slate-700">
                  <DatabaseZap aria-hidden="true" className="size-4" />Open Food Facts
                </Link>
              )}
            />
          ) : visibleProducts.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={Search}
              title="Aucun résultat"
              description="Modifie la recherche ou affiche tous les aliments de la bibliothèque."
              primaryAction={(
                <Button variant="secondary" onClick={() => { setQuery(''); setFilter('all'); }}>
                  Réinitialiser les filtres
                </Button>
              )}
            />
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {visibleProducts.map((product) => (
                <FoodProductCard
                  key={product.id}
                  product={product}
                  navigationState={navigationState}
                  highlighted={highlightedProductId === product.id}
                  archiving={archivingId === product.id}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          )}

          {hasActiveSearch && visibleProducts.length > 0 ? (
            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
              {visibleProducts.length} résultat{visibleProducts.length > 1 ? 's' : ''} affiché{visibleProducts.length > 1 ? 's' : ''}.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
