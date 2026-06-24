import { Check, CloudDownload, Database, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { FoodProduct } from '@/domain/models/food';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import { formatMissingNutritionFields } from '@/features/open-food-facts/utils/openFoodFactsLabels';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

interface MealOpenFoodFactsProductCardProps {
  product: OpenFoodFactsProductCandidate;
  localProduct: FoodProduct | undefined;
  saving: boolean;
  selected: boolean;
  onChoose: (product: OpenFoodFactsProductCandidate) => Promise<void>;
}

export function MealOpenFoodFactsProductCard({
  product,
  localProduct,
  saving,
  selected,
  onChoose,
}: MealOpenFoodFactsProductCardProps) {
  const actionLabel = localProduct?.source.type === 'manual'
    ? 'Utiliser la version locale'
    : localProduct
      ? 'Actualiser et choisir'
      : 'Enregistrer et choisir';

  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
            Open Food Facts
          </p>
          <h3 className="mt-1 break-words font-semibold text-slate-950 dark:text-white">
            {product.name}
          </h3>
          {product.brand ? (
            <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
              {product.brand}
            </p>
          ) : null}
          <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
            Code : {product.barcode}
          </p>
        </div>
        <p className="shrink-0 text-sm font-bold tabular-nums text-slate-950 dark:text-white">
          {Math.round(product.nutritionPer100.caloriesKcal)} kcal
        </p>
      </div>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Pour 100 {product.basisUnit} · P {product.nutritionPer100.proteinGrams} g · G{' '}
        {product.nutritionPer100.carbohydratesGrams} g · L {product.nutritionPer100.fatGrams} g
      </p>
      {product.servingSize ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Portion détectée : {product.servingSize} {product.basisUnit}
        </p>
      ) : null}

      {localProduct ? (
        <div className="mt-4 flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <Database aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Une version de ce produit est déjà enregistrée sur cet appareil.
        </div>
      ) : null}

      {!product.isNutritionComplete ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            Données incomplètes : {formatMissingNutritionFields(product.missingNutritionFields)}. Les valeurs manquantes seront enregistrées à zéro et devront être vérifiées.
          </span>
        </div>
      ) : null}

      <Button
        className="mt-4 w-full"
        variant={selected ? 'primary' : 'secondary'}
        disabled={saving}
        aria-pressed={selected}
        onClick={() => void onChoose(product)}
      >
        {saving ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : selected ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <CloudDownload aria-hidden="true" className="size-4" />
        )}
        {saving ? 'Enregistrement…' : selected ? 'Produit sélectionné' : actionLabel}
      </Button>
    </Card>
  );
}
