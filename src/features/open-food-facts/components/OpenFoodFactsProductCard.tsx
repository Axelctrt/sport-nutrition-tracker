import { CircleCheck, Database, Pencil, Save, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { editFoodProductPath } from '@/app/routePaths';
import type { FoodProduct } from '@/domain/models/food';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import { formatMissingNutritionFields } from '@/features/open-food-facts/utils/openFoodFactsLabels';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

interface RemoteProductCardProps {
  product: OpenFoodFactsProductCandidate;
  saving: boolean;
  localProduct: FoodProduct | undefined;
  onSave: (product: OpenFoodFactsProductCandidate) => Promise<void>;
}

export function RemoteOpenFoodFactsProductCard({
  product,
  saving,
  localProduct,
  onSave,
}: RemoteProductCardProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
            Source : Open Food Facts
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{product.name}</h3>
          {product.brand ? <p className="text-sm text-slate-500 dark:text-slate-400">{product.brand}</p> : null}
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Code : {product.barcode}</p>
        </div>
        <p className="font-bold tabular-nums text-slate-950 dark:text-white">
          {Math.round(product.nutritionPer100.caloriesKcal)} kcal
        </p>
      </div>

      <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">
        Pour 100 {product.basisUnit} · P {product.nutritionPer100.proteinGrams} g · G{' '}
        {product.nutritionPer100.carbohydratesGrams} g · L {product.nutritionPer100.fatGrams} g
      </p>
      {product.servingSize ? (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Portion détectée : {product.servingSize} {product.basisUnit}
        </p>
      ) : null}

      {product.isNutritionComplete ? (
        <div className="mt-4 flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Calories et macronutriments principaux disponibles.
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            Données à vérifier : {formatMissingNutritionFields(product.missingNutritionFields)}. Les valeurs manquantes sont provisoirement enregistrées à zéro.
          </span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {localProduct ? (
          <Link
            to={editFoodProductPath(localProduct.id)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Vérifier la version locale
          </Link>
        ) : (
          <Button disabled={saving} onClick={() => void onSave(product)}>
            <Save aria-hidden="true" className="size-4" />
            {saving
              ? 'Enregistrement…'
              : product.isNutritionComplete
                ? 'Enregistrer localement'
                : 'Enregistrer et corriger'}
          </Button>
        )}
      </div>
    </Card>
  );
}

interface LocalProductCardProps {
  product: FoodProduct;
}

export function LocalFoodProductCard({ product }: LocalProductCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            <Database aria-hidden="true" className="size-3.5" />
            Disponible localement
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{product.name}</h3>
          {product.brand ? <p className="text-sm text-slate-500 dark:text-slate-400">{product.brand}</p> : null}
        </div>
        <p className="font-bold tabular-nums text-slate-950 dark:text-white">
          {Math.round(product.nutritionPer100.caloriesKcal)} kcal
        </p>
      </div>
      <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">
        Pour 100 {product.basisUnit} · P {product.nutritionPer100.proteinGrams} g · G{' '}
        {product.nutritionPer100.carbohydratesGrams} g · L {product.nutritionPer100.fatGrams} g
      </p>
      <Link
        to={editFoodProductPath(product.id)}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <Pencil aria-hidden="true" className="size-4" />
        Ouvrir l’aliment local
      </Link>
    </Card>
  );
}
