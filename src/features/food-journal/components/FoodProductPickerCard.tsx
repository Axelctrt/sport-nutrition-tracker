import { Check, Star } from 'lucide-react';
import type { FoodProduct } from '@/domain/models/food';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { cn } from '@/shared/utils/cn';

interface FoodProductPickerCardProps {
  product: FoodProduct;
  selected: boolean;
  onSelect: (product: FoodProduct) => void;
}

export function FoodProductPickerCard({
  product,
  selected,
  onSelect,
}: FoodProductPickerCardProps) {
  return (
    <Card
      className={cn(
        'min-w-0 p-4 transition-colors',
        selected && 'border-brand-500 bg-brand-50/80 dark:border-brand-500 dark:bg-brand-950/20',
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {product.isFavorite ? (
              <Star aria-label="Aliment favori" className="size-4 shrink-0 fill-amber-400 text-amber-500" />
            ) : null}
            <h3 className="min-w-0 break-words font-semibold text-slate-950 dark:text-white">
              {product.name}
            </h3>
          </div>
          {product.brand ? (
            <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
              {product.brand}
            </p>
          ) : null}
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
          1 portion{product.servingLabel ? ` (${product.servingLabel})` : ''} = {product.servingSize} {product.basisUnit}
        </p>
      ) : null}

      <Button
        className="mt-4 w-full"
        variant={selected ? 'primary' : 'secondary'}
        aria-pressed={selected}
        onClick={() => onSelect(product)}
      >
        {selected ? <Check aria-hidden="true" className="size-4" /> : null}
        {selected ? 'Aliment sélectionné' : 'Choisir cet aliment'}
      </Button>
    </Card>
  );
}
