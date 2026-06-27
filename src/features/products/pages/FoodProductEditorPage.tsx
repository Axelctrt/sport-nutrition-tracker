import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { editFoodProductPath, routePaths, selectFoodPath } from '@/app/routePaths';
import { findFoodProductDuplicates, type FoodProductDuplicateMatch } from '@/application/food/foodProductDuplicateService';
import { refreshOpenFoodFactsProduct } from '@/application/open-food-facts/openFoodFactsProductService';
import { collectFoodProductLocalOverrides } from '@/domain/food/foodProductFields';
import type { FoodProduct, MealSlot } from '@/domain/models/food';
import {
  createFoodLibraryFeedbackState,
  createFoodLibraryRestoreState,
  type FoodLibraryNavigationState,
} from '@/features/food-library/navigation/foodLibraryNavigation';
import { FoodProductForm } from '@/features/products/components/FoodProductForm';
import type { FoodProductFormValues } from '@/features/products/schemas/foodProductSchema';
import {
  defaultFoodProductFormValues,
  formValuesToProductInput,
  productToFormValues,
} from '@/features/products/utils/foodProductForm';
import { openFoodFactsClient } from '@/infrastructure/open-food-facts/OpenFoodFactsClient';
import { isSupportedBarcode, normalizeOpenFoodFactsBarcode } from '@/infrastructure/open-food-facts/barcode';
import { repositories } from '@/infrastructure/repositories/repositories';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { isValidLocalDate } from '@/shared/validation/localDate';

const mealSlots: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

function isMealSlot(value: string | null): value is MealSlot {
  return value !== null && mealSlots.includes(value as MealSlot);
}

function formatRefreshDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function FoodProductEditorPage() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as FoodLibraryNavigationState | null;
  const libraryReturn = navigationState?.foodLibraryReturn?.section === 'products'
    ? navigationState.foodLibraryReturn
    : undefined;
  const returnDate = searchParams.get('returnDate');
  const returnSlot = searchParams.get('returnSlot');
  const requestedBarcode = searchParams.get('barcode');
  const mealReturnContext = !productId && returnDate !== null && isValidLocalDate(returnDate) && isMealSlot(returnSlot)
    ? { date: returnDate, slot: returnSlot }
    : undefined;
  const returnPath = mealReturnContext
    ? selectFoodPath(mealReturnContext.date, mealReturnContext.slot)
    : libraryReturn?.path ?? routePaths.foodProducts;
  const [product, setProduct] = useState<FoodProduct>();
  const initialValues = useMemo(() => {
    if (product) return productToFormValues(product);
    if (requestedBarcode && isSupportedBarcode(requestedBarcode)) {
      return {
        ...defaultFoodProductFormValues,
        barcode: normalizeOpenFoodFactsBarcode(requestedBarcode),
      };
    }
    return defaultFoodProductFormValues;
  }, [product, requestedBarcode]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [errorMessage, setErrorMessage] = useState<string>();
  const [actionErrorMessage, setActionErrorMessage] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const [duplicateMatches, setDuplicateMatches] = useState<FoodProductDuplicateMatch[]>([]);
  const [pendingDuplicateValues, setPendingDuplicateValues] = useState<FoodProductFormValues>();
  const [refreshing, setRefreshing] = useState(false);
  const [replaceConfirmationOpen, setReplaceConfirmationOpen] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    void repositories.food.getProductById(productId)
      .then((found) => {
        if (!active) return;
        if (!found) setErrorMessage('Aliment introuvable.');
        else setProduct(found);
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger cet aliment.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [productId]);

  const saveValues = async (
    values: FoodProductFormValues,
    allowNameDuplicate: boolean,
  ) => {
    const input = formValuesToProductInput(values);
    const products = await repositories.food.listProducts(true);
    const duplicates = findFoodProductDuplicates(input, products, productId);
    const barcodeDuplicate = duplicates.find((match) => match.reason === 'barcode');
    const nameDuplicates = duplicates.filter((match) => match.reason === 'name-and-brand');

    if (barcodeDuplicate || (nameDuplicates.length > 0 && !allowNameDuplicate)) {
      setDuplicateMatches(barcodeDuplicate ? [barcodeDuplicate] : nameDuplicates);
      setPendingDuplicateValues(barcodeDuplicate ? undefined : values);
      return;
    }

    setDuplicateMatches([]);
    setPendingDuplicateValues(undefined);

    if (productId && product) {
      const source = product.source.type === 'openFoodFacts'
        ? {
            ...product.source,
            ...(input.barcode === undefined ? {} : { barcode: input.barcode }),
          }
        : input.source;
      const localOverrides = product.source.type === 'openFoodFacts'
        ? collectFoodProductLocalOverrides(product, input, product.localOverrides)
        : undefined;
      const updated = await repositories.food.updateProduct(productId, {
        ...input,
        source,
        ...(localOverrides && localOverrides.length > 0 ? { localOverrides } : {}),
      });
      await navigate(libraryReturn?.path ?? routePaths.foodProducts, {
        state: createFoodLibraryFeedbackState(libraryReturn, {
          title: 'Aliment mis à jour',
          itemId: updated.id,
        }),
      });
      return;
    }

    const createdProduct = await repositories.food.createProduct(input);
    if (mealReturnContext) {
      await navigate(
        selectFoodPath(mealReturnContext.date, mealReturnContext.slot, createdProduct.id),
        { state: location.state },
      );
      return;
    }

    await navigate(libraryReturn?.path ?? routePaths.foodProducts, {
      state: createFoodLibraryFeedbackState(libraryReturn, {
        title: 'Aliment créé',
        itemId: createdProduct.id,
      }),
    });
  };

  const handleRefresh = async (preserveLocalOverrides: boolean) => {
    if (!product || product.source.type !== 'openFoodFacts') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setActionErrorMessage('La connexion est nécessaire pour actualiser ce produit.');
      return;
    }

    setRefreshing(true);
    setActionErrorMessage(undefined);
    setFeedback(undefined);
    try {
      const result = await refreshOpenFoodFactsProduct(
        product,
        repositories.food,
        (barcode, signal) => openFoodFactsClient.getProductByBarcode(barcode, signal),
        { preserveLocalOverrides },
      );
      setProduct(result.product);
      setFeedback(preserveLocalOverrides && result.preservedLocalOverrides.length > 0
        ? `${result.preservedLocalOverrides.length} correction(s) locale(s) conservée(s).`
        : 'Données Open Food Facts actualisées.');
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Impossible d’actualiser ce produit.');
    } finally {
      setRefreshing(false);
      setReplaceConfirmationOpen(false);
    }
  };

  const openFoodFactsSource = product?.source.type === 'openFoodFacts' ? product.source : undefined;

  return (
    <section className="min-w-0" aria-labelledby="food-product-editor-title">
      <Link
        to={returnPath}
        state={mealReturnContext ? location.state : createFoodLibraryRestoreState(libraryReturn)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {mealReturnContext ? 'Retour au choix de l’aliment' : 'Retour aux aliments'}
      </Link>
      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Bibliothèque alimentaire</p>
        <h1 id="food-product-editor-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          {productId ? 'Modifier un aliment' : 'Créer un aliment'}
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
          Les valeurs sont enregistrées pour 100 g ou 100 ml et restent disponibles hors connexion.
        </p>
      </div>

      {loading ? <PageSkeleton className="mt-6" variant="form" /> : null}
      {errorMessage ? <InlineNotice className="mt-6" tone="error" title="Aliment indisponible">{errorMessage}</InlineNotice> : null}
      {actionErrorMessage ? <InlineNotice className="mt-6" tone="error" title="Actualisation impossible">{actionErrorMessage}</InlineNotice> : null}
      {feedback ? <InlineNotice className="mt-6" tone="success" title="Actualisation terminée">{feedback}</InlineNotice> : null}

      {duplicateMatches.length > 0 ? (
        <InlineNotice className="mt-6" tone="info" title="Doublon potentiel détecté">
          <p>
            {duplicateMatches[0]?.reason === 'barcode'
              ? 'Un aliment possède déjà ce code-barres. Modifie plutôt l’aliment existant.'
              : 'Un aliment avec le même nom et la même marque existe déjà.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {duplicateMatches.map(({ product: duplicate }) => (
              <Link
                key={duplicate.id}
                to={editFoodProductPath(duplicate.id)}
                className="inline-flex min-h-10 items-center rounded-xl border border-amber-300 px-3 text-sm font-semibold text-amber-900 dark:border-amber-700 dark:text-amber-100"
              >
                Ouvrir « {duplicate.name} »
              </Link>
            ))}
            {pendingDuplicateValues ? (
              <Button variant="secondary" onClick={() => void saveValues(pendingDuplicateValues, true)}>
                Enregistrer quand même
              </Button>
            ) : null}
          </div>
        </InlineNotice>
      ) : null}

      {!loading && !errorMessage && openFoodFactsSource ? (
        <Card className="mt-6 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="size-5 text-emerald-600" />
                <h2 className="font-semibold text-slate-950 dark:text-white">Produit Open Food Facts</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Dernière récupération : {formatRefreshDate(openFoodFactsSource.fetchedAt)}.
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {product?.localOverrides?.length
                  ? `${product?.localOverrides?.length ?? 0} champ(s) corrigé(s) localement seront protégés.`
                  : 'Aucune correction locale protégée.'}
              </p>
            </div>
            <div className="grid gap-2 sm:min-w-64">
              <Button
                variant="secondary"
                disabled={refreshing}
                onClick={() => void handleRefresh(true)}
              >
                <RefreshCw aria-hidden="true" className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              {product?.localOverrides?.length ? (
                <Button
                  variant="dangerGhost"
                  disabled={refreshing}
                  onClick={() => setReplaceConfirmationOpen(true)}
                >
                  Remplacer mes corrections
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      {!loading && !errorMessage ? (
        <Card className="mt-6 p-4 sm:p-6">
          <FoodProductForm
            initialValues={initialValues}
            submitLabel={product ? 'Enregistrer les modifications' : 'Créer l’aliment'}
            onSubmit={(values) => saveValues(values, false)}
          />
        </Card>
      ) : null}

      <ConfirmationDialog
        open={replaceConfirmationOpen}
        title="Remplacer les corrections locales ?"
        description="Les champs corrigés sur cet appareil seront remplacés par les valeurs actuellement disponibles sur Open Food Facts."
        confirmLabel="Remplacer et actualiser"
        tone="danger"
        isPending={refreshing}
        onCancel={() => setReplaceConfirmationOpen(false)}
        onConfirm={() => { void handleRefresh(false); }}
      />
    </section>
  );
}
