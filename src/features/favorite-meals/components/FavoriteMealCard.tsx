import { CalendarPlus, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FavoriteMealSummary } from '@/application/food/favoriteMealService';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';

interface FavoriteMealCardProps {
  summary: FavoriteMealSummary;
  deleting?: boolean;
  onApply: (summary: FavoriteMealSummary) => void;
  onDelete: (favoriteId: string) => Promise<boolean>;
}

function format(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

export function FavoriteMealCard({ summary, deleting = false, onApply, onDelete }: FavoriteMealCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { favoriteMeal, totals } = summary;

  return (
    <>
      <Card className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words font-semibold text-slate-950 dark:text-white">{favoriteMeal.name}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {favoriteMeal.items.length} élément{favoriteMeal.items.length > 1 ? 's' : ''}
              {favoriteMeal.defaultSlot ? ` · ${mealSlotLabels[favoriteMeal.defaultSlot]}` : ''}
            </p>
          </div>

          <details className="relative shrink-0">
            <summary
              role="button"
              aria-label={`Actions pour ${favoriteMeal.name}`}
              className="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden"
            >
              <MoreHorizontal aria-hidden="true" className="size-5" />
            </summary>
            <div className="absolute right-0 z-20 mt-1 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <Button
                className="w-full justify-start"
                size="sm"
                variant="dangerGhost"
                disabled={deleting}
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  setDeleteOpen(true);
                }}
              >
                <Trash2 aria-hidden="true" className="size-4" />Supprimer
              </Button>
            </div>
          </details>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-orange-50 px-2 py-1 font-semibold text-orange-900 dark:bg-orange-950/40 dark:text-orange-100">{Math.round(totals.caloriesKcal)} kcal</span>
          <span className="rounded-lg bg-blue-50 px-2 py-1 font-medium text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">P {format(totals.proteinGrams)} g</span>
          <span className="rounded-lg bg-amber-50 px-2 py-1 font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">G {format(totals.carbohydratesGrams)} g</span>
          <span className="rounded-lg bg-rose-50 px-2 py-1 font-medium text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">L {format(totals.fatGrams)} g</span>
        </div>

        <Button className="mt-4 w-full sm:w-auto" onClick={() => onApply(summary)}>
          <CalendarPlus aria-hidden="true" className="size-4" />Ajouter au journal
        </Button>
      </Card>

      <ConfirmationDialog
        open={deleteOpen}
        title="Supprimer ce repas favori ?"
        description={`« ${favoriteMeal.name} » sera supprimé de la bibliothèque. Les anciennes entrées du journal ne seront pas modifiées.`}
        confirmLabel="Supprimer"
        tone="danger"
        isPending={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          void onDelete(favoriteMeal.id).then((removed) => {
            if (removed) setDeleteOpen(false);
          });
        }}
      />
    </>
  );
}
