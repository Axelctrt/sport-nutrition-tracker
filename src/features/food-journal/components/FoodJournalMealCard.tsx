import { CopyPlus, MoreHorizontal, Pencil, Plus, Save, Trash2, Utensils } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FoodEntryWithProduct, MealJournalSnapshot } from '@/application/food/foodJournalService';
import { addRecipeToJournalPath, editFoodEntryPath, routePaths, selectFoodPath } from '@/app/routePaths';
import type { FoodJournalNavigationState } from '@/features/food-journal/navigation/foodJournalNavigation';
import { CopyMealForm } from '@/features/food-journal/components/CopyMealForm';
import { SaveFavoriteMealForm } from '@/features/food-journal/components/SaveFavoriteMealForm';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { cn } from '@/shared/utils/cn';
import { formatLocalDate } from '@/shared/utils/dates';

interface FoodJournalMealCardProps {
  date: string;
  meal: MealJournalSnapshot;
  busyId?: string | undefined;
  navigationState: FoodJournalNavigationState;
  highlightedEntryId?: string | undefined;
  onDuplicate: (id: string) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
  onUpdateQuantity: (item: FoodEntryWithProduct, quantity: number) => Promise<unknown>;
  onCopyMeal: (targetDate: string, targetSlot: MealJournalSnapshot['slot']) => Promise<unknown>;
  onSaveFavorite: (name: string) => Promise<unknown>;
}

function round(value: number): number {
  return Math.round(value);
}

function entryName(item: FoodEntryWithProduct): string {
  return item.product?.name
    ?? item.recipe?.name
    ?? (item.entry.reference.sourceType === 'recipe' ? 'Recette supprimée' : 'Aliment local indisponible');
}

function entryQuantity(item: FoodEntryWithProduct): number {
  return item.entry.reference.sourceType === 'product'
    ? item.entry.reference.inputQuantity
    : item.entry.reference.servingsConsumed;
}

function entryQuantityLabel(item: FoodEntryWithProduct): string {
  if (item.entry.reference.sourceType === 'recipe') {
    return `${item.entry.reference.servingsConsumed} portion(s)`;
  }
  return `${item.entry.reference.inputQuantity} ${item.entry.reference.inputMode === 'servings' ? 'portion(s)' : item.entry.reference.normalizedUnit}`;
}

export function FoodJournalMealCard({
  date,
  meal,
  busyId,
  navigationState,
  highlightedEntryId,
  onDuplicate,
  onRemove,
  onUpdateQuantity,
  onCopyMeal,
  onSaveFavorite,
}: FoodJournalMealCardProps) {
  const [editingId, setEditingId] = useState<string>();
  const [quantity, setQuantity] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FoodEntryWithProduct>();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const label = mealSlotLabels[meal.slot];
  const addAriaLabel = meal.slot === 'snacks'
    ? 'Ajouter un aliment aux collations'
    : `Ajouter un aliment au ${label.toLocaleLowerCase('fr')}`;

  const beginEdit = (item: FoodEntryWithProduct) => {
    setEditingId(item.entry.id);
    setQuantity(String(entryQuantity(item)));
  };

  const saveQuantity = async (item: FoodEntryWithProduct) => {
    const parsed = Number(quantity.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    await onUpdateQuantity(item, parsed);
    setEditingId(undefined);
  };

  return (
    <Card id={`food-meal-${meal.slot}`} className="scroll-mt-24 overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{label}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {round(meal.totals.caloriesKcal)} kcal · P {round(meal.totals.proteinGrams)} g · G {round(meal.totals.carbohydratesGrams)} g · L {round(meal.totals.fatGrams)} g
          </p>
        </div>
        <Link
          aria-label={addAriaLabel}
          to={selectFoodPath(date, meal.slot)}
          state={navigationState}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          <Plus aria-hidden="true" className="size-4" />
          Ajouter
        </Link>
      </div>

      {meal.entries.length === 0 ? (
        <div className="border-t border-slate-200 px-4 py-5 text-center dark:border-slate-800 sm:px-5">
          <Utensils aria-hidden="true" className="mx-auto size-8 text-slate-400" />
          <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">Aucun aliment pour ce repas</p>
          <p className="mt-1 text-sm text-slate-500">Ajoute un aliment, une recette ou un produit scanné.</p>
        </div>
      ) : (
        <div className="border-t border-slate-200 px-4 dark:border-slate-800 sm:px-5">
          {meal.entries.map((item) => {
            const { entry, nutrition } = item;
            const isEditing = editingId === entry.id;
            const editPath = entry.reference.sourceType === 'recipe'
              ? addRecipeToJournalPath(entry.reference.recipeId, entry.date, entry.mealSlot, entry.id)
              : editFoodEntryPath(entry.id);

            return (
              <article
                key={entry.id}
                id={`food-entry-${entry.id}`}
                className={cn(
                  'scroll-mt-28 border-b border-slate-200 py-3 transition-colors last:border-b-0 dark:border-slate-800 motion-reduce:transition-none',
                  highlightedEntryId === entry.id && 'rounded-xl bg-brand-50 px-3 dark:bg-brand-950/35',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-slate-950 dark:text-white">{entryName(item)}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {entryQuantityLabel(item)} · {round(nutrition.caloriesKcal)} kcal
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      P {nutrition.proteinGrams.toFixed(1)} g · G {nutrition.carbohydratesGrams.toFixed(1)} g · L {nutrition.fatGrams.toFixed(1)} g
                    </p>
                  </div>

                  <details className="relative shrink-0">
                    <summary
                      role="button"
                      aria-label={`Actions pour ${entryName(item)}`}
                      className="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden"
                    >
                      <MoreHorizontal aria-hidden="true" className="size-5" />
                    </summary>
                    <div className="absolute right-0 z-20 mt-1 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                      <Button
                        className="w-full justify-start"
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.currentTarget.closest('details')?.removeAttribute('open');
                          beginEdit(item);
                        }}
                      >
                        <Pencil aria-hidden="true" className="size-4" />Modifier la quantité
                      </Button>
                      <Link
                        to={editPath}
                        state={navigationState}
                        onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}
                        className="inline-flex min-h-9 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Pencil aria-hidden="true" className="size-4" />Modifier les détails
                      </Link>
                      <Button
                        className="w-full justify-start"
                        size="sm"
                        variant="ghost"
                        disabled={busyId === `duplicate-${entry.id}`}
                        onClick={(event) => {
                          event.currentTarget.closest('details')?.removeAttribute('open');
                          void onDuplicate(entry.id);
                        }}
                      >
                        <CopyPlus aria-hidden="true" className="size-4" />Dupliquer
                      </Button>
                      <Button
                        className="w-full justify-start"
                        size="sm"
                        variant="dangerGhost"
                        disabled={busyId === `delete-${entry.id}`}
                        onClick={(event) => {
                          event.currentTarget.closest('details')?.removeAttribute('open');
                          setDeleteTarget(item);
                        }}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />Supprimer
                      </Button>
                    </div>
                  </details>
                </div>

                {isEditing ? (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`quick-quantity-${entry.id}`} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {entry.reference.sourceType === 'recipe'
                          ? 'Nombre de portions'
                          : entry.reference.inputMode === 'servings'
                            ? 'Nombre de portions'
                            : `Quantité en ${entry.reference.normalizedUnit}`}
                      </label>
                      <input
                        id={`quick-quantity-${entry.id}`}
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        className={`${inputClassName} mt-1`}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === `update-${entry.id}` || !Number.isFinite(Number(quantity.replace(',', '.'))) || Number(quantity.replace(',', '.')) <= 0}
                        onClick={() => void saveQuantity(item)}
                      >
                        <Save aria-hidden="true" className="size-4" />Enregistrer
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(undefined)}>Annuler</Button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <div className="border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          aria-expanded={optionsOpen}
          aria-label={`Options du ${label.toLocaleLowerCase('fr')}`}
          className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60 sm:px-5"
          onClick={() => setOptionsOpen((current) => !current)}
        >
          Options du repas
          <span className="text-xs font-normal text-slate-500">Recette, copie, favori</span>
        </button>
        {optionsOpen ? (
          <div className="border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50 sm:p-5">
            <Link
              to={`${routePaths.recipes}?date=${encodeURIComponent(date)}&slot=${encodeURIComponent(meal.slot)}`}
              state={navigationState}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Plus aria-hidden="true" className="size-4" />Ajouter une recette
            </Link>
            {meal.entries.length > 0 ? (
              <div className="mt-3">
                <SaveFavoriteMealForm
                  disabled={busyId === `favorite-${meal.slot}`}
                  suggestedName={`${label} du ${formatLocalDate(date)}`}
                  onSave={onSaveFavorite}
                />
                <CopyMealForm
                  initialDate={date}
                  initialSlot={meal.slot}
                  disabled={busyId === `copy-meal-${meal.slot}`}
                  onSubmit={async (values) => { await onCopyMeal(values.targetDate, values.targetSlot); }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Supprimer cette entrée ?"
        description={deleteTarget ? `« ${entryName(deleteTarget)} » sera retiré du ${label.toLocaleLowerCase('fr')}.` : ''}
        confirmLabel="Supprimer"
        tone="danger"
        isPending={deleteTarget ? busyId === `delete-${deleteTarget.entry.id}` : false}
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void onRemove(deleteTarget.entry.id).then(() => setDeleteTarget(undefined));
        }}
      />
    </Card>
  );
}
