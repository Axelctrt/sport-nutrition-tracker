import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import type { FoodProduct } from '@/domain/models/food';
import { FoodProductForm } from '@/features/products/components/FoodProductForm';
import type { FoodProductFormValues } from '@/features/products/schemas/foodProductSchema';
import {
  defaultFoodProductFormValues,
  formValuesToProductInput,
  productToFormValues,
} from '@/features/products/utils/foodProductForm';
import { repositories } from '@/infrastructure/repositories/repositories';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

export function FoodProductEditorPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<FoodProduct>();
  const [loading, setLoading] = useState(Boolean(productId));
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    if (!productId) {
      return;
    }
    let active = true;
    void repositories.food.getProductById(productId)
      .then((found) => {
        if (!active) return;
        if (!found) {
          setErrorMessage('Aliment introuvable.');
        } else {
          setProduct(found);
        }
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger cet aliment.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  const handleSubmit = async (values: FoodProductFormValues) => {
    const input = formValuesToProductInput(values);
    if (productId) {
      const source = product?.source.type === 'openFoodFacts'
        ? {
            ...product.source,
            ...(input.barcode === undefined ? {} : { barcode: input.barcode }),
          }
        : input.source;
      await repositories.food.updateProduct(productId, { ...input, source });
    } else {
      await repositories.food.createProduct(input);
    }
    await navigate(routePaths.foodProducts);
  };

  return (
    <section aria-labelledby="food-product-editor-title">
      <Link to={routePaths.foodProducts} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour aux aliments
      </Link>
      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Catalogue alimentaire</p>
        <h1 id="food-product-editor-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          {productId ? 'Modifier un aliment' : 'Créer un aliment manuel'}
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          Les valeurs sont enregistrées pour 100 g ou 100 ml et restent disponibles hors connexion.
        </p>
      </div>

      {loading ? (
        <Card className="mt-8 p-8 text-center" role="status">
          <LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" />
          <p className="mt-3 font-semibold">Chargement de l’aliment…</p>
        </Card>
      ) : null}

      {errorMessage ? <InlineNotice className="mt-8" tone="error" title="Aliment indisponible">{errorMessage}</InlineNotice> : null}

      {!loading && !errorMessage ? (
        <Card className="mt-8 p-5 sm:p-7">
          <FoodProductForm
            initialValues={product ? productToFormValues(product) : defaultFoodProductFormValues}
            submitLabel={product ? 'Enregistrer les modifications' : 'Créer l’aliment'}
            onSubmit={handleSubmit}
          />
        </Card>
      ) : null}
    </section>
  );
}
