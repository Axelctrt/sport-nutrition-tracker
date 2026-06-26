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

  const metrics = [
    ['kcal', Math.round(product.nutritionPer100.caloriesKcal)],
    ['P', `${product.nutritionPer100.proteinGrams} g`],
    ['G', `${product.nutritionPer100.carbohydratesGrams} g`],
    ['L', `${product.nutritionPer100.fatGrams} g`],
  ] as const;

  return (
    <Card className="min-w-0 p-4 sm:p-5">
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

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {metrics.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl bg-slate-50 px-1.5 py-2 dark:bg-slate-950/60">
            <p className="truncate text-sm font-bold tabular-nums text-slate-950 dark:text-white">{value}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        Pour 100 {product.basisUnit}{product.servingSize ? ` · Portion ${product.servingSize} ${product.basisUnit}` : ''}
      </p>

      {localProduct ? (
        <div className="mt-4 flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <Database aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Une version locale est déjà disponible.
        </div>
      ) : null}

      {!product.isNutritionComplete ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>Données incomplètes : {formatMissingNutritionFields(product.missingNutritionFields)}.</span>
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
