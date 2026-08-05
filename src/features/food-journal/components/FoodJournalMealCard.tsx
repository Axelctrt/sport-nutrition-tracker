import {
  ChevronDown,
  CopyPlus,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Utensils,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FoodEntryWithProduct, MealJournalSnapshot } from '@/application/food/foodJournalService';
import {
  addRecipeToJournalPath,
  editFoodEntryPath,
} from '@/app/routePaths';
import { CopyMealForm } from '@/features/food-journal/components/CopyMealForm';
import { SaveFavoriteMealForm } from '@/features/food-journal/components/SaveFavoriteMealForm';
import type { FoodJournalNavigationState } from '@/features/food-journal/navigation/foodJournalNavigation';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuLink,
  ActionMenuSeparator,
} from '@/shared/ui/ActionMenu';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { cn } from '@/shared/utils/cn';
import { formatLocalDate } from '@/shared/utils/dates';

interface FoodJournalMealCardProps {
  date: string;
  meal: MealJournalSnapshot;
  expanded: boolean;
  busyId?: string | undefined;
  navigationState: FoodJournalNavigationState;
  highlightedEntryId?: string | undefined;
  repeatSourceDate?: string | undefined;
  onToggle: () => void;
  onAdd: () => void;
  onDuplicate: (id: string) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
  onUpdateQuantity: (item: FoodEntryWithProduct, quantity: number) => Promise<unknown>;
  onCopyMeal: (targetDate: string, targetSlot: MealJournalSnapshot['slot']) => Promise<unknown>;
  onRepeatMeal: (sourceDate: string) => Promise<unknown>;
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

function entryCountLabel(count: number): string {
  if (count === 0) return 'Aucun aliment';
  if (count === 1) return '1 aliment';
  return `${count} aliments`;
}

export function FoodJournalMealCard({
  date,
  meal,
  expanded,
  busyId,
  navigationState,
  highlightedEntryId,
  repeatSourceDate,
  onToggle,
  onAdd,
  onDuplicate,
  onRemove,
  onUpdateQuantity,
  onCopyMeal,
  onRepeatMeal,
  onSaveFavorite,
}: FoodJournalMealCardProps) {
  const [editingId, setEditingId] = useState<string>();
  const [quantity, setQuantity] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const label = mealSlotLabels[meal.slot];
  const contentId = `food-meal-${meal.slot}-content`;

  useEffect(() => {
    if (expanded) return;
    setOptionsOpen(false);
    setEditingId(undefined);
  }, [expanded]);

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
    <Card
      id={`food-meal-${meal.slot}`}
      className={cn(
        'scroll-mt-24 overflow-hidden transition-shadow motion-reduce:transition-none',
        expanded && 'shadow-[var(--sp-shadow-panel)]',
      )}
    >
      <div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          className="flex min-h-20 min-w-0 items-center gap-3 px-4 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 dark:hover:bg-slate-800/60 sm:px-5"
          onClick={onToggle}
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-slate-950 dark:text-white">{label}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {entryCountLabel(meal.entries.length)}
              </span>
            </span>
            <span className="mt-1 block truncate text-sm text-slate-500 dark:text-slate-400">
              {round(meal.totals.caloriesKcal)} kcal · P {round(meal.totals.proteinGrams)} g · G {round(meal.totals.carbohydratesGrams)} g · L {round(meal.totals.fatGrams)} g
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-5 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none',
              expanded && 'rotate-180',
            )}
          />
        </button>
      </div>

      {expanded ? (
        <div id={contentId} className="border-t border-slate-200 dark:border-slate-800">
          {meal.entries.length === 0 ? (
            <div className="px-4 py-6 text-center sm:px-5">
              <Utensils aria-hidden="true" className="mx-auto size-8 text-slate-400" />
              <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">Aucun aliment pour ce repas</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Ajoutez un aliment ou reprenez votre dernier repas équivalent.
              </p>
              {repeatSourceDate ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Dernier {label.toLocaleLowerCase('fr')} enregistré le {formatLocalDate(repeatSourceDate)}.
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {repeatSourceDate ? (
                  <Button
                    disabled={busyId === `repeat-meal-${meal.slot}`}
                    onClick={() => void onRepeatMeal(repeatSourceDate)}
                  >
                    <RefreshCcw aria-hidden="true" className="size-4" />Répéter ce repas
                  </Button>
                ) : null}
                <Button
                  variant={repeatSourceDate ? 'secondary' : 'primary'}
                  aria-label={meal.slot === 'snacks'
                    ? 'Ajouter un aliment aux collations'
                    : `Ajouter un aliment au ${label.toLocaleLowerCase('fr')}`}
                  onClick={onAdd}
                  className={cn(
                    !repeatSourceDate && 'shadow-sm',
                  )}
                >
                  <Plus aria-hidden="true" className="size-4" />Ajouter un aliment
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-4 dark:border-slate-800 sm:px-5">
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

                      <ActionMenu label={`Actions pour ${entryName(item)}`}>
                        <ActionMenuItem
                          icon={Pencil}
                          onClick={() => beginEdit(item)}
                        >
                          Modifier la quantité
                        </ActionMenuItem>
                        <ActionMenuLink
                          to={editPath}
                          state={navigationState}
                          icon={Pencil}
                        >
                          Modifier les détails
                        </ActionMenuLink>
                        <ActionMenuItem
                          icon={CopyPlus}
                          disabled={busyId === `duplicate-${entry.id}`}
                          onClick={() => void onDuplicate(entry.id)}
                        >
                          Dupliquer
                        </ActionMenuItem>
                        <ActionMenuSeparator />
                        <ActionMenuItem
                          icon={Trash2}
                          tone="danger"
                          disabled={busyId === `delete-${entry.id}`}
                          onClick={() => void onRemove(item.entry.id)}
                        >
                          Supprimer
                        </ActionMenuItem>
                      </ActionMenu>
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
                            data-clear-on-focus="true"
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

          {meal.entries.length > 0 ? (
            <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
              <Button
                className="w-full"
                variant="secondary"
                aria-label={meal.slot === 'snacks'
                  ? 'Ajouter un aliment aux collations'
                  : `Ajouter un aliment au ${label.toLocaleLowerCase('fr')}`}
                onClick={onAdd}
              >
                <Plus aria-hidden="true" className="size-4" />
                Ajouter un aliment
              </Button>
            </div>
          ) : null}

          {meal.entries.length > 0 ? (
            <div className="border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                aria-expanded={optionsOpen}
                aria-label={`Options du ${label.toLocaleLowerCase('fr')}`}
                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60 sm:px-5"
                onClick={() => setOptionsOpen((current) => !current)}
              >
                Options du repas
                <span className="text-xs font-normal text-slate-500">Copier ou enregistrer en favori</span>
              </button>
              {optionsOpen ? (
                <div className="border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50 sm:p-5">
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
      ) : null}
    </Card>
  );
}
