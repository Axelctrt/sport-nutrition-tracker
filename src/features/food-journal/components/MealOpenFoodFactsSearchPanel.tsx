import { LoaderCircle, PackageSearch, RefreshCw, Search } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import type { FoodProduct } from '@/domain/models/food';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import { normalizeOpenFoodFactsBarcode } from '@/infrastructure/open-food-facts/barcode';
import { MealOpenFoodFactsProductCard } from '@/features/food-journal/components/MealOpenFoodFactsProductCard';
import { useMealOpenFoodFactsSearch } from '@/features/food-journal/hooks/useMealOpenFoodFactsSearch';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface MealOpenFoodFactsSearchPanelProps {
  localProducts: FoodProduct[];
  selectedProductId: string | undefined;
  onProductReady: (product: FoodProduct, message: string) => Promise<void>;
}

export function MealOpenFoodFactsSearchPanel({
  localProducts,
  selectedProductId,
  onProductReady,
}: MealOpenFoodFactsSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string>();
  const [savedProductsByBarcode, setSavedProductsByBarcode] = useState<Map<string, FoodProduct>>(
    () => new Map(),
  );
  const {
    products,
    status,
    errorMessage,
    informationMessage,
    totalCount,
    savingBarcode,
    search,
    saveCandidate,
    reset,
  } = useMealOpenFoodFactsSearch();

  const localProductsByBarcode = useMemo(
    () => new Map(
      localProducts
        .filter((product) => product.barcode)
        .map((product) => [normalizeOpenFoodFactsBarcode(product.barcode ?? ''), product]),
    ),
    [localProducts],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(undefined);
    await search(query);
  };

  const handleChoose = async (candidate: OpenFoodFactsProductCandidate) => {
    setSuccessMessage(undefined);
    const result = await saveCandidate(candidate);
    const message = result.status === 'created'
      ? 'Produit enregistré localement et prêt à être ajouté au repas.'
      : result.status === 'updated'
        ? 'Produit local actualisé avec les données Open Food Facts.'
        : 'La version manuelle déjà enregistrée a été conservée.';
    setSavedProductsByBarcode((current) => {
      const next = new Map(current);
      next.set(normalizeOpenFoodFactsBarcode(result.product.barcode ?? candidate.barcode), result.product);
      return next;
    });
    setSuccessMessage(message);
    await onProductReady(result.product, message);
  };

  return (
    <div className="min-w-0">
      <InlineNotice tone="info" title="Recherche en ligne">
        La recherche nécessite Internet. Une fois choisi, le produit est enregistré localement et reste disponible hors connexion.
      </InlineNotice>

      <Card className="mt-4 min-w-0 p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="min-w-0">
          <label htmlFor="meal-off-search" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Rechercher dans Open Food Facts
          </label>
          <div className="mt-2 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative min-w-0">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              />
              <input
                id="meal-off-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={`${inputClassName} pl-10`}
                autoComplete="off"
                placeholder="Ex. yaourt grec, flocons d’avoine"
              />
            </div>
            <Button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto">
              {status === 'loading' ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Search aria-hidden="true" className="size-4" />
              )}
              {status === 'loading' ? 'Recherche…' : 'Rechercher'}
            </Button>
          </div>
        </form>

        {status !== 'idle' ? (
          <Button
            className="mt-3"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSuccessMessage(undefined);
              setQuery('');
              reset();
            }}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Effacer la recherche
          </Button>
        ) : null}
      </Card>

      {status === 'loading' ? (
        <InlineNotice className="mt-4" title="Recherche en cours" role="status">
          <span className="flex items-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Consultation d’Open Food Facts.
          </span>
        </InlineNotice>
      ) : null}

      {errorMessage ? (
        <InlineNotice className="mt-4" tone="error" title="Service externe indisponible">
          {errorMessage}
        </InlineNotice>
      ) : null}

      {informationMessage ? (
        <InlineNotice className="mt-4" tone="info" title="Résultat de la recherche">
          {informationMessage}
        </InlineNotice>
      ) : null}

      {successMessage ? (
        <InlineNotice className="mt-4" tone="success" title="Produit prêt">
          {successMessage}
        </InlineNotice>
      ) : null}

      {status === 'ready' && products.length === 0 && !informationMessage ? (
        <EmptyState
          className="mt-4"
          icon={PackageSearch}
          title="Aucun résultat exploitable"
          description="Modifie la recherche ou utilise la création manuelle."
        />
      ) : null}

      {products.length > 0 ? (
        <section className="mt-5" aria-labelledby="meal-off-results-title">
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-3">
            <h2 id="meal-off-results-title" className="text-xl font-semibold text-slate-950 dark:text-white">
              Résultats Open Food Facts
            </h2>
            {totalCount !== undefined ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {totalCount.toLocaleString('fr-FR')} correspondance{totalCount > 1 ? 's' : ''}, 12 maximum affichées
              </p>
            ) : null}
          </div>
          <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
            {products.map((product) => {
              const normalizedBarcode = normalizeOpenFoodFactsBarcode(product.barcode);
              const localProduct = savedProductsByBarcode.get(normalizedBarcode)
                ?? localProductsByBarcode.get(normalizedBarcode);
              return (
                <MealOpenFoodFactsProductCard
                  key={product.barcode}
                  product={product}
                  localProduct={localProduct}
                  saving={savingBarcode === product.barcode}
                  selected={localProduct !== undefined && localProduct.id === selectedProductId}
                  onChoose={handleChoose}
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
