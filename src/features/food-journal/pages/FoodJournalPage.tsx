import { CalendarCheck, Copy, CopyPlus, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { addRecipeToJournalPath, editFoodEntryPath, routePaths, selectFoodPath } from '@/app/routePaths';
import { calculateRemainingNutrition } from '@/domain/calculations/nutrition';
import { CopyMealForm } from '@/features/food-journal/components/CopyMealForm';
import { SaveFavoriteMealForm } from '@/features/food-journal/components/SaveFavoriteMealForm';
import { useFoodJournal } from '@/features/food-journal/hooks/useFoodJournal';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { repositories } from '@/infrastructure/repositories/repositories';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';
import { useEffect } from 'react';
import type { DailyTarget } from '@/domain/models/targets';

function round(value: number): number {
  return Math.round(value);
}

export function FoodJournalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedDate = searchParams.get('date') ?? '';
  const date = isValidLocalDate(requestedDate) ? requestedDate : toLocalDate();
  const { snapshot, status, errorMessage, busyId, refresh, duplicate, remove, copyMealTo, copyDayTo, toggleComplete, saveFavorite } = useFoodJournal(date);
  const [copyTargetDate, setCopyTargetDate] = useState(date);
  const [target, setTarget] = useState<DailyTarget>();

  useEffect(() => {
    void repositories.targets.getTargetByDate(date).then(setTarget);
  }, [date, snapshot]);

  const remaining = snapshot && target
    ? calculateRemainingNutrition(target.targetCaloriesKcal, target.macros, snapshot.totals)
    : undefined;

  const confirmDelete = async (id: string, name: string) => {
    if (window.confirm(`Supprimer « ${name} » du journal ?`)) await remove(id);
  };

  return (
    <section aria-labelledby="food-journal-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Nutrition quotidienne</p>
          <h1 id="food-journal-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Journal alimentaire</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Suis les calories et macronutriments réellement renseignés, repas par repas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={routePaths.foodProducts} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Aliments locaux</Link>
          <Link to={routePaths.recipes} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Recettes</Link>
          <Link to={routePaths.favoriteMeals} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Repas favoris</Link>
          <Link to={selectFoodPath(date, 'snacks')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 font-semibold text-white hover:bg-brand-800"><Plus aria-hidden="true" className="size-4" />Ajouter une collation</Link>
        </div>
      </div>

      <Card className="mt-8 p-5 sm:p-6">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <label htmlFor="food-journal-date" className="text-sm font-semibold">Journée consultée</label>
            <input id="food-journal-date" type="date" value={date} onChange={(event) => setSearchParams({ date: event.target.value })} className={`${inputClassName} mt-2`} />
          </div>
          <div className="min-w-0">
            <label htmlFor="copy-day-date" className="text-sm font-semibold">Copier toute la journée vers</label>
            <input id="copy-day-date" type="date" value={copyTargetDate} onChange={(event) => setCopyTargetDate(event.target.value)} className={`${inputClassName} mt-2`} />
          </div>
          <Button className="w-full lg:w-auto" variant="secondary" disabled={busyId === 'copy-day' || !snapshot?.entries.length} onClick={() => void copyDayTo(copyTargetDate)}><Copy aria-hidden="true" className="size-4" />Copier la journée</Button>
        </div>
      </Card>

      {errorMessage ? <InlineNotice className="mt-6" tone="error" title="Opération impossible"><p>{errorMessage}</p><Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button></InlineNotice> : null}
      {status === 'loading' && !snapshot ? <Card className="mt-6 p-8 text-center" role="status"><LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" /><p className="mt-3 font-semibold">Chargement du journal…</p></Card> : null}

      {snapshot ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-5"><p className="text-sm text-slate-500">Calories consommées</p><p className="mt-1 text-2xl font-bold tabular-nums">{round(snapshot.totals.caloriesKcal)} kcal</p>{target ? <ProgressBar className="mt-4" label="Cible calorique" value={snapshot.totals.caloriesKcal} max={target.targetCaloriesKcal} indicatorClassName="bg-orange-500" /> : null}</Card>
            <Card className="p-5"><p className="text-sm text-slate-500">Protéines</p><p className="mt-1 text-2xl font-bold tabular-nums">{round(snapshot.totals.proteinGrams)} g</p>{target ? <ProgressBar className="mt-4" label="Objectif protéines" value={snapshot.totals.proteinGrams} max={target.macros.proteinGrams} indicatorClassName="bg-emerald-600" /> : null}</Card>
            <Card className="p-5"><p className="text-sm text-slate-500">Glucides</p><p className="mt-1 text-2xl font-bold tabular-nums">{round(snapshot.totals.carbohydratesGrams)} g</p>{target ? <ProgressBar className="mt-4" label="Objectif glucides" value={snapshot.totals.carbohydratesGrams} max={target.macros.carbohydratesGrams} indicatorClassName="bg-amber-500" /> : null}</Card>
            <Card className="p-5"><p className="text-sm text-slate-500">Lipides</p><p className="mt-1 text-2xl font-bold tabular-nums">{round(snapshot.totals.fatGrams)} g</p>{target ? <ProgressBar className="mt-4" label="Objectif lipides" value={snapshot.totals.fatGrams} max={target.macros.fatGrams} indicatorClassName="bg-violet-600" /> : null}</Card>
          </div>

          {remaining ? <InlineNotice className="mt-4" title="Reste pour la journée">{remaining.caloriesKcal >= 0 ? `${round(remaining.caloriesKcal)} kcal restantes` : `${Math.abs(round(remaining.caloriesKcal))} kcal au-dessus de la cible`} · P {round(remaining.proteinGrams)} g · G {round(remaining.carbohydratesGrams)} g · L {round(remaining.fatGrams)} g</InlineNotice> : null}

          <div className="mt-6 space-y-4">
            {snapshot.meals.map((meal) => (
              <Card key={meal.slot} className="p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><h2 className="text-xl font-semibold text-slate-950 dark:text-white">{mealSlotLabels[meal.slot]}</h2><p className="mt-1 text-sm text-slate-500">{round(meal.totals.caloriesKcal)} kcal · {meal.entries.length} entrée{meal.entries.length > 1 ? 's' : ''}</p></div>
                  <div className="flex flex-wrap gap-2"><Link aria-label={`Ajouter un aliment au ${mealSlotLabels[meal.slot].toLocaleLowerCase('fr')}`} to={selectFoodPath(date, meal.slot)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Plus aria-hidden="true" className="size-4" />Ajouter un aliment</Link><Link to={`${routePaths.recipes}?date=${encodeURIComponent(date)}&slot=${encodeURIComponent(meal.slot)}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Plus aria-hidden="true" className="size-4" />Recette</Link></div>
                </div>
                {meal.entries.length === 0 ? <p className="mt-4 text-sm text-slate-500">Aucun aliment enregistré.</p> : (
                  <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
                    {meal.entries.map(({ entry, product, recipe, nutrition }) => (
                      <div key={entry.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="font-semibold text-slate-950 dark:text-white">{product?.name ?? recipe?.name ?? (entry.reference.sourceType === 'recipe' ? 'Recette supprimée' : 'Aliment local indisponible')}</p><p className="mt-1 text-sm text-slate-500">{entry.reference.sourceType === 'product' ? `${entry.reference.inputQuantity} ${entry.reference.inputMode === 'servings' ? 'portion(s)' : entry.reference.normalizedUnit}` : `${entry.reference.servingsConsumed} portion(s)`} · {round(nutrition.caloriesKcal)} kcal · P {nutrition.proteinGrams.toFixed(1)} g · G {nutrition.carbohydratesGrams.toFixed(1)} g · L {nutrition.fatGrams.toFixed(1)} g</p></div>
                        <div className="flex flex-wrap gap-2">
                          <Link to={entry.reference.sourceType === 'recipe' ? addRecipeToJournalPath(entry.reference.recipeId, entry.date, entry.mealSlot, entry.id) : editFoodEntryPath(entry.id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-semibold dark:border-slate-700"><Pencil aria-hidden="true" className="size-4" />Modifier</Link>
                          <Button size="sm" variant="ghost" disabled={busyId === `duplicate-${entry.id}`} onClick={() => void duplicate(entry.id)}><CopyPlus aria-hidden="true" className="size-4" />Dupliquer</Button>
                          <Button size="sm" variant="danger" disabled={busyId === `delete-${entry.id}`} onClick={() => void confirmDelete(entry.id, product?.name ?? recipe?.name ?? 'cette entrée')}><Trash2 aria-hidden="true" className="size-4" />Supprimer</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {meal.entries.length > 0 ? (
                  <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <div className="flex flex-wrap gap-2">
                      <SaveFavoriteMealForm disabled={busyId === `favorite-${meal.slot}`} suggestedName={`${mealSlotLabels[meal.slot]} du ${formatLocalDate(date)}`} onSave={(name) => saveFavorite(meal.slot, name)} />
                    </div>
                    <CopyMealForm initialDate={date} initialSlot={meal.slot} disabled={busyId === `copy-meal-${meal.slot}`} onSubmit={(values) => copyMealTo({ sourceDate: date, sourceSlot: meal.slot, targetDate: values.targetDate, targetSlot: values.targetSlot })} />
                  </div>
                ) : null}
              </Card>
            ))}
          </div>

          <Card className="mt-6 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex items-center gap-2"><CalendarCheck aria-hidden="true" className="size-5 text-brand-700" /><h2 className="font-semibold text-slate-950 dark:text-white">Journée alimentaire {snapshot.status?.isComplete ? 'terminée' : 'en cours'}</h2></div><p className="mt-1 text-sm text-slate-500">Le statut terminé servira au bilan hebdomadaire et à la calibration.</p></div>
              <Button variant={snapshot.status?.isComplete ? 'secondary' : 'primary'} disabled={busyId === 'complete'} onClick={() => void toggleComplete(!snapshot.status?.isComplete)}>{snapshot.status?.isComplete ? 'Rouvrir la journée' : 'Marquer comme terminée'}</Button>
            </div>
          </Card>
        </>
      ) : null}

      <InlineNotice className="mt-6" title={`Données du ${formatLocalDate(date)}`}>Les valeurs consommées reposent sur les quantités saisies et les snapshots nutritionnels enregistrés au moment de l’ajout.</InlineNotice>
    </section>
  );
}
