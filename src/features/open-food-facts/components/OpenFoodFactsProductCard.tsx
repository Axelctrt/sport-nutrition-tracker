import { CircleCheck, Database, Pencil, Save, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { editFoodProductPath } from '@/app/routePaths';
import type { FoodProduct } from '@/domain/models/food';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import { formatMissingNutritionFields } from '@/features/open-food-facts/utils/openFoodFactsLabels';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

function NutritionMetrics({
  calories,
  protein,
  carbohydrates,
  fat,
}: {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}) {
  return (
    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
      {[
        ['kcal', Math.round(calories)],
        ['P', `${protein} g`],
        ['G', `${carbohydrates} g`],
        ['L', `${fat} g`],
      ].map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-xl bg-slate-50 px-1.5 py-2 dark:bg-slate-950/60">
          <p className="truncate text-sm font-bold tabular-nums text-slate-950 dark:text-white">{value}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      ))}
    </div>
  );
}

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
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
          Open Food Facts
        </p>
        <h3 className="mt-1 break-words text-lg font-semibold text-slate-950 dark:text-white">{product.name}</h3>
        {product.brand ? <p className="break-words text-sm text-slate-500 dark:text-slate-400">{product.brand}</p> : null}
        <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">Code : {product.barcode}</p>
      </div>

      <NutritionMetrics
        calories={product.nutritionPer100.caloriesKcal}
        protein={product.nutritionPer100.proteinGrams}
        carbohydrates={product.nutritionPer100.carbohydratesGrams}
        fat={product.nutritionPer100.fatGrams}
      />
      <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        Valeurs pour 100 {product.basisUnit}{product.servingSize ? ` · Portion${product.servingLabel ? ` (${product.servingLabel})` : ''} ${product.servingSize} ${product.basisUnit}` : ''}
      </p>
      {product.nutritionPer100.fiberGrams !== undefined || product.nutritionPer100.saltGrams !== undefined ? (
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          {product.nutritionPer100.fiberGrams !== undefined ? `Fibres ${product.nutritionPer100.fiberGrams} g` : ''}
          {product.nutritionPer100.fiberGrams !== undefined && product.nutritionPer100.saltGrams !== undefined ? ' · ' : ''}
          {product.nutritionPer100.saltGrams !== undefined ? `Sel ${product.nutritionPer100.saltGrams} g` : ''}
        </p>
      ) : null}

      {product.isNutritionComplete ? (
        <div className="mt-4 flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Données principales disponibles.
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>Données à vérifier : {formatMissingNutritionFields(product.missingNutritionFields)}.</span>
        </div>
      )}

      {localProduct ? (
        <Link
          to={editFoodProductPath(localProduct.id)}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <Pencil aria-hidden="true" className="size-4" />
          Vérifier la version locale
        </Link>
      ) : (
        <Button className="mt-4 w-full" disabled={saving} onClick={() => void onSave(product)}>
          <Save aria-hidden="true" className="size-4" />
          {saving ? 'Enregistrement…' : product.isNutritionComplete ? 'Enregistrer localement' : 'Enregistrer et corriger'}
        </Button>
      )}
    </Card>
  );
}

interface LocalProductCardProps {
  product: FoodProduct;
}

export function LocalFoodProductCard({ product }: LocalProductCardProps) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
        <Database aria-hidden="true" className="size-3.5" />
        Disponible localement
      </p>
      <h3 className="mt-1 break-words text-lg font-semibold text-slate-950 dark:text-white">{product.name}</h3>
      {product.brand ? <p className="break-words text-sm text-slate-500 dark:text-slate-400">{product.brand}</p> : null}
      <NutritionMetrics
        calories={product.nutritionPer100.caloriesKcal}
        protein={product.nutritionPer100.proteinGrams}
        carbohydrates={product.nutritionPer100.carbohydratesGrams}
        fat={product.nutritionPer100.fatGrams}
      />
      <Link
        to={editFoodProductPath(product.id)}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <Pencil aria-hidden="true" className="size-4" />
        Ouvrir l’aliment local
      </Link>
    </Card>
  );
}
