import { Archive, MoreHorizontal, Pencil, Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { editFoodProductPath } from '@/app/routePaths';
import type { FoodProduct } from '@/domain/models/food';
import type { FoodLibraryNavigationState } from '@/features/food-library/navigation/foodLibraryNavigation';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { cn } from '@/shared/utils/cn';

interface FoodProductCardProps {
  product: FoodProduct;
  navigationState: FoodLibraryNavigationState;
  highlighted?: boolean;
  archiving?: boolean;
  onArchive: (productId: string) => Promise<boolean>;
}

function formatNumber(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits });
}

export function FoodProductCard({
  product,
  navigationState,
  highlighted = false,
  archiving = false,
  onArchive,
}: FoodProductCardProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);

  return (
    <>
      <Card
        id={`food-product-${product.id}`}
        className={cn(
          'scroll-mt-28 p-4 transition-colors sm:p-5 motion-reduce:transition-none',
          highlighted && 'border-brand-300 bg-brand-50/70 dark:border-brand-800 dark:bg-brand-950/30',
        )}
      >
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
            <span className="text-sm font-black">{Math.round(product.nutritionPer100.caloriesKcal)}</span>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words font-semibold text-slate-950 dark:text-white">{product.name}</h2>
                  {product.isFavorite ? <Star aria-label="Favori" className="size-4 fill-amber-400 text-amber-500" /> : null}
                </div>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {product.brand || (product.source.type === 'openFoodFacts' ? 'Open Food Facts' : 'Aliment manuel')}
                </p>
              </div>

              <details className="relative shrink-0">
                <summary
                  role="button"
                  aria-label={`Actions pour ${product.name}`}
                  className="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden"
                >
                  <MoreHorizontal aria-hidden="true" className="size-5" />
                </summary>
                <div className="absolute right-0 z-20 mt-1 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <Link
                    to={editFoodProductPath(product.id)}
                    state={navigationState}
                    onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}
                    className="inline-flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                    Modifier
                  </Link>
                  <Button
                    className="w-full justify-start"
                    size="sm"
                    variant="dangerGhost"
                    disabled={archiving}
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      setArchiveOpen(true);
                    }}
                  >
                    <Archive aria-hidden="true" className="size-4" />
                    Archiver
                  </Button>
                </div>
              </details>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {Math.round(product.nutritionPer100.caloriesKcal)} kcal / 100 {product.basisUnit}
              </span>
              <span className="rounded-lg bg-blue-50 px-2 py-1 font-medium text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                P {formatNumber(product.nutritionPer100.proteinGrams)} g
              </span>
              <span className="rounded-lg bg-amber-50 px-2 py-1 font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                G {formatNumber(product.nutritionPer100.carbohydratesGrams)} g
              </span>
              <span className="rounded-lg bg-rose-50 px-2 py-1 font-medium text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                L {formatNumber(product.nutritionPer100.fatGrams)} g
              </span>
              {product.nutritionPer100.fiberGrams !== undefined ? (
                <span className="rounded-lg bg-emerald-50 px-2 py-1 font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                  Fibres {formatNumber(product.nutritionPer100.fiberGrams)} g
                </span>
              ) : null}
              {product.nutritionPer100.saltGrams !== undefined ? (
                <span className="rounded-lg bg-violet-50 px-2 py-1 font-medium text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
                  Sel {formatNumber(product.nutritionPer100.saltGrams, 2)} g
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {product.servingSize ? (
                <span>
                  Portion : {product.servingLabel ? `${product.servingLabel} · ` : ''}
                  {formatNumber(product.servingSize)} {product.basisUnit}
                </span>
              ) : null}
              <span>{product.source.type === 'openFoodFacts' ? 'Source externe enregistrée localement' : 'Saisie manuelle'}</span>
              {product.localOverrides?.length ? (
                <span className="font-semibold text-brand-700 dark:text-brand-300">
                  {product.localOverrides.length} correction(s) locale(s)
                </span>
              ) : null}
              {!product.isNutritionComplete ? (
                <span className="font-semibold text-amber-700 dark:text-amber-300">Valeurs à vérifier</span>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <ConfirmationDialog
        open={archiveOpen}
        title="Archiver cet aliment ?"
        description={`« ${product.name} » ne pourra plus être ajouté au journal, mais restera visible dans les anciennes entrées.`}
        confirmLabel="Archiver"
        tone="danger"
        isPending={archiving}
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => {
          void onArchive(product.id).then((archived) => {
            if (archived) setArchiveOpen(false);
          });
        }}
      />
    </>
  );
}
