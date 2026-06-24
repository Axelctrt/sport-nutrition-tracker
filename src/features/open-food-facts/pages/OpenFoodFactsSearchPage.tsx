import { ArrowLeft, LoaderCircle, RefreshCw, WifiOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { editFoodProductPath, routePaths } from '@/app/routePaths';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import { normalizeOpenFoodFactsBarcode } from '@/infrastructure/open-food-facts/barcode';
import { RemoteOpenFoodFactsProductCard, LocalFoodProductCard } from '@/features/open-food-facts/components/OpenFoodFactsProductCard';
import { OpenFoodFactsSearchForms } from '@/features/open-food-facts/components/OpenFoodFactsSearchForms';
import { useOpenFoodFactsSearch } from '@/features/open-food-facts/hooks/useOpenFoodFactsSearch';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

export function OpenFoodFactsSearchPage() {
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState<string>();
  const {
    remoteProducts,
    localProducts,
    status,
    errorMessage,
    informationMessage,
    totalCount,
    savingBarcode,
    searchText,
    searchBarcode,
    saveCandidate,
    reset,
  } = useOpenFoodFactsSearch();

  const localProductsByBarcode = useMemo(
    () => new Map(
      localProducts
        .filter((product) => product.barcode)
        .map((product) => [normalizeOpenFoodFactsBarcode(product.barcode ?? ''), product]),
    ),
    [localProducts],
  );

  const handleSave = async (candidate: OpenFoodFactsProductCandidate) => {
    setSuccessMessage(undefined);
    const result = await saveCandidate(candidate);

    if (result.status === 'existing-manual') {
      setSuccessMessage('Un aliment manuel utilise déjà ce code-barres. Ses valeurs n’ont pas été remplacées.');
      return;
    }

    if (!candidate.isNutritionComplete) {
      await navigate(editFoodProductPath(result.product.id));
      return;
    }

    setSuccessMessage(
      result.status === 'created'
        ? 'Produit enregistré localement. Il est maintenant disponible hors connexion.'
        : 'Produit local mis à jour avec les dernières données Open Food Facts.',
    );
  };

  const hasResults = remoteProducts.length > 0 || localProducts.length > 0;

  return (
    <section aria-labelledby="open-food-facts-title">
      <Link
        to={routePaths.foodProducts}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour aux aliments
      </Link>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Étape 8 opérationnelle
          </p>
          <h1 id="open-food-facts-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Rechercher dans Open Food Facts
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            Recherche explicite par nom ou code-barres. Un produit n’est enregistré sur cet appareil qu’après ta confirmation.
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Connecteur Open Food Facts 0.8.6 · origine {window.location.origin}
          </p>
        </div>
        {status !== 'idle' ? (
          <Button variant="ghost" onClick={() => {
            setSuccessMessage(undefined);
            reset();
          }}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Nouvelle recherche
          </Button>
        ) : null}
      </div>

      <InlineNotice className="mt-6" tone="info" title="Données externes et limites">
        Open Food Facts est une base collaborative. Les valeurs peuvent être incomplètes ou incorrectes. Les recherches nécessitent Internet, mais les aliments déjà enregistrés restent disponibles hors connexion.
      </InlineNotice>

      <Card className="mt-6 p-5 sm:p-7">
        <OpenFoodFactsSearchForms
          loading={status === 'loading'}
          onTextSearch={async (query) => {
            setSuccessMessage(undefined);
            await searchText(query);
          }}
          onBarcodeSearch={async (barcode) => {
            setSuccessMessage(undefined);
            await searchBarcode(barcode);
          }}
        />
      </Card>

      {status === 'loading' ? (
        <Card className="mt-6 p-8 text-center" role="status">
          <LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" />
          <p className="mt-3 font-semibold text-slate-950 dark:text-white">Recherche en cours…</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Une seule requête est envoyée à Open Food Facts.
          </p>
        </Card>
      ) : null}

      {errorMessage ? (
        <InlineNotice className="mt-6" tone="error" title="Service externe indisponible">
          {errorMessage}
        </InlineNotice>
      ) : null}

      {informationMessage ? (
        <InlineNotice className="mt-6" tone="info" title="Résultat de la recherche">
          {informationMessage}
        </InlineNotice>
      ) : null}

      {successMessage ? (
        <InlineNotice className="mt-6" tone="success" title="Produit local enregistré">
          {successMessage}
        </InlineNotice>
      ) : null}

      {status !== 'idle' && status !== 'loading' && !hasResults ? (
        <Card className="mt-6 p-8 text-center">
          <WifiOff aria-hidden="true" className="mx-auto size-8 text-slate-400" />
          <h2 className="mt-3 text-xl font-semibold text-slate-950 dark:text-white">Aucun produit exploitable</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Modifie la recherche ou crée directement un aliment manuel.
          </p>
          <Link
            to={routePaths.newFoodProduct}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Créer un aliment manuel
          </Link>
        </Card>
      ) : null}

      {localProducts.length > 0 ? (
        <section className="mt-8" aria-labelledby="local-results-title">
          <h2 id="local-results-title" className="text-xl font-semibold text-slate-950 dark:text-white">
            Déjà disponibles sur cet appareil
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Ces aliments fonctionnent même sans connexion Internet.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {localProducts.map((product) => (
              <LocalFoodProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      {remoteProducts.length > 0 ? (
        <section className="mt-8" aria-labelledby="remote-results-title">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="remote-results-title" className="text-xl font-semibold text-slate-950 dark:text-white">
              Résultats Open Food Facts
            </h2>
            {totalCount !== undefined ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {totalCount.toLocaleString('fr-FR')} correspondance{totalCount > 1 ? 's' : ''} dans la base, 12 résultats maximum affichés.
              </p>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {remoteProducts.map((product) => (
              <RemoteOpenFoodFactsProductCard
                key={product.barcode}
                product={product}
                saving={savingBarcode === product.barcode}
                localProduct={localProductsByBarcode.get(
                  normalizeOpenFoodFactsBarcode(product.barcode),
                )}
                onSave={handleSave}
              />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
