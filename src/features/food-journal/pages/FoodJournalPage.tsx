import { CalendarCheck, Copy, LibraryBig, Plus, UtensilsCrossed } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import { calculateRemainingNutrition } from '@/domain/calculations/nutrition';
import type { MealSlot } from '@/domain/models/food';
import type { DailyTarget } from '@/domain/models/targets';
import { FoodJournalAddSheet } from '@/features/food-journal/components/FoodJournalAddSheet';
import { FoodJournalDateNavigator } from '@/features/food-journal/components/FoodJournalDateNavigator';
import { FoodJournalMealCard } from '@/features/food-journal/components/FoodJournalMealCard';
import { FoodJournalSummary } from '@/features/food-journal/components/FoodJournalSummary';
import { useFoodJournal } from '@/features/food-journal/hooks/useFoodJournal';
import {
  createFoodJournalReturnState,
  type FoodJournalNavigationState,
} from '@/features/food-journal/navigation/foodJournalNavigation';
import { repositories } from '@/infrastructure/repositories/repositories';
import { inputClassName } from '@/shared/forms/formStyles';
import { useToast } from '@/shared/toast/useToast';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { RefreshStatus } from '@/shared/ui/RefreshStatus';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

export function FoodJournalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const handledFeedbackRef = useRef<string | undefined>(undefined);
  const initializedMealDateRef = useRef<string | undefined>(undefined);
  const locationState = location.state as FoodJournalNavigationState | null;
  const requestedDate = searchParams.get('date') ?? '';
  const date = isValidLocalDate(requestedDate) ? requestedDate : toLocalDate();
  const {
    snapshot,
    status,
    errorMessage,
    busyId,
    isRefreshing,
    refresh,
    duplicate,
    remove,
    updateQuantity,
    copyMealTo,
    repeatMealTo,
    copyDayTo,
    toggleComplete,
    saveFavorite,
  } = useFoodJournal(date);
  const [copyTargetDate, setCopyTargetDate] = useState(date);
  const [target, setTarget] = useState<DailyTarget>();
  const [dayOptionsOpen, setDayOptionsOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [expandedMealSlot, setExpandedMealSlot] = useState<MealSlot>('breakfast');
  const [highlightedEntryId, setHighlightedEntryId] = useState<string>();
  const [returnFeedback, setReturnFeedback] = useState(locationState?.foodJournalFeedback);

  const setJournalDate = (nextDate: string) => {
    if (!isValidLocalDate(nextDate)) return;
    setExpandedMealSlot('breakfast');
    setDayOptionsOpen(false);
    setSearchParams({ date: nextDate });
  };

  useEffect(() => {
    let active = true;
    setCopyTargetDate(date);
    setTarget(undefined);
    void repositories.targets.getTargetByDate(date).then((nextTarget) => {
      if (active) setTarget(nextTarget);
    });
    return () => {
      active = false;
    };
  }, [date]);

  useEffect(() => {
    if (!snapshot || initializedMealDateRef.current === date) return;
    initializedMealDateRef.current = date;
    const firstMealWithEntries = snapshot.meals.find((meal) => meal.entries.length > 0);
    setExpandedMealSlot(firstMealWithEntries?.slot ?? 'breakfast');
  }, [date, snapshot]);

  const remaining = snapshot && target
    ? calculateRemainingNutrition(target.targetCaloriesKcal, target.macros, snapshot.totals)
    : undefined;

  const currentJournalPath = `${location.pathname}${location.search}`;

  useEffect(() => {
    const feedback = locationState?.foodJournalFeedback;
    if (!feedback) return;
    const feedbackKey = `${feedback.title}:${feedback.entryId ?? feedback.mealSlot}`;
    if (handledFeedbackRef.current === feedbackKey) return;
    handledFeedbackRef.current = feedbackKey;
    setExpandedMealSlot(feedback.mealSlot);
    setReturnFeedback(feedback);
    toast.success(feedback.title);
    void navigate(currentJournalPath, { replace: true, state: null });
  }, [currentJournalPath, locationState, navigate, toast]);

  useEffect(() => {
    if (!snapshot || !returnFeedback) return;
    setExpandedMealSlot(returnFeedback.mealSlot);
    setHighlightedEntryId(returnFeedback.entryId);
    window.requestAnimationFrame(() => {
      const targetElement = document.getElementById(
        returnFeedback.entryId
          ? `food-entry-${returnFeedback.entryId}`
          : `food-meal-${returnFeedback.mealSlot}`,
      );
      targetElement?.scrollIntoView({
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'nearest',
      });
    });
    const timer = window.setTimeout(() => {
      setHighlightedEntryId(undefined);
      setReturnFeedback(undefined);
    }, 2_500);
    return () => window.clearTimeout(timer);
  }, [returnFeedback, snapshot]);

  const navigationStates = useMemo<ReadonlyMap<MealSlot, FoodJournalNavigationState>>(() => {
    if (!snapshot) return new Map<MealSlot, FoodJournalNavigationState>();
    return new Map(snapshot.meals.map((meal): [MealSlot, FoodJournalNavigationState] => [
      meal.slot,
      createFoodJournalReturnState(currentJournalPath, location.key, meal.slot),
    ]));
  }, [currentJournalPath, location.key, snapshot]);

  const hasEntries = Boolean(snapshot?.entries.length);

  return (
    <section className="min-w-0" aria-labelledby="food-journal-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Nutrition quotidienne
          </p>
          <h1 id="food-journal-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Journal alimentaire
          </h1>
          <p className="mt-2 hidden max-w-3xl text-slate-600 dark:text-slate-300 sm:block">
            Suivez vos calories, vos macros et vos repas sur une seule vue quotidienne.
          </p>
        </div>
        <Button className="w-full sm:w-auto" size="lg" onClick={() => setAddSheetOpen(true)}>
          <Plus aria-hidden="true" className="size-5" />Ajouter un aliment
        </Button>
      </div>

      <FoodJournalDateNavigator className="mt-5" date={date} onChange={setJournalDate} />

      <RefreshStatus
        visible={isRefreshing}
        label="Actualisation du journal…"
        className="mt-4"
      />

      {errorMessage ? (
        <InlineNotice className="mt-6" tone="error" title="Opération impossible">
          <p>{errorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button>
        </InlineNotice>
      ) : null}

      {status === 'loading' && !snapshot ? <PageSkeleton className="mt-6" variant="list" /> : null}

      {snapshot ? (
        <>
          <FoodJournalSummary className="mt-5" totals={snapshot.totals} target={target} remaining={remaining} />

          {!hasEntries ? (
            <EmptyState
              className="mt-4"
              compact
              icon={UtensilsCrossed}
              title="Aucun aliment pour cette journée"
              description="Ajoutez votre premier aliment puis complétez les repas au fil de la journée."
              primaryAction={(
                <Button onClick={() => setAddSheetOpen(true)}>
                  <Plus aria-hidden="true" className="size-4" />Ajouter un aliment
                </Button>
              )}
            />
          ) : null}

          <div className="mt-4 space-y-3">
            {snapshot.meals.map((meal) => (
              <FoodJournalMealCard
                key={meal.slot}
                date={date}
                meal={meal}
                expanded={expandedMealSlot === meal.slot}
                busyId={busyId}
                navigationState={navigationStates.get(meal.slot) ?? {}}
                highlightedEntryId={highlightedEntryId}
                repeatSourceDate={snapshot.repeatSourceDates[meal.slot]}
                onToggle={() => setExpandedMealSlot(meal.slot)}
                onDuplicate={duplicate}
                onRemove={remove}
                onUpdateQuantity={updateQuantity}
                onCopyMeal={(targetDate, targetSlot) => copyMealTo({
                  sourceDate: date,
                  sourceSlot: meal.slot,
                  targetDate,
                  targetSlot,
                })}
                onRepeatMeal={(sourceDate) => repeatMealTo({
                  sourceDate,
                  sourceSlot: meal.slot,
                  targetDate: date,
                  targetSlot: meal.slot,
                })}
                onSaveFavorite={(name) => saveFavorite(meal.slot, name)}
              />
            ))}
          </div>

          <Card className="mt-4 overflow-hidden">
            <button
              type="button"
              aria-expanded={dayOptionsOpen}
              aria-label="Options de la journée"
              className="flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left sm:px-5"
              onClick={() => setDayOptionsOpen((current) => !current)}
            >
              <span>
                <span className="block font-semibold text-slate-950 dark:text-white">Options de la journée</span>
                <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                  Copie, bibliothèque et statut du {formatLocalDate(date)}
                </span>
              </span>
              <LibraryBig aria-hidden="true" className="size-5 shrink-0 text-slate-500" />
            </button>

            {dayOptionsOpen ? (
              <div className="border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Link to={routePaths.foodProducts} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    Aliments locaux
                  </Link>
                  <Link to={routePaths.recipes} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    Recettes
                  </Link>
                  <Link to={routePaths.favoriteMeals} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    Repas favoris
                  </Link>
                </div>

                <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="min-w-0">
                    <label htmlFor="copy-day-date" className="text-sm font-semibold">Copier toute la journée vers</label>
                    <input
                      id="copy-day-date"
                      type="date"
                      value={copyTargetDate}
                      onChange={(event) => setCopyTargetDate(event.target.value)}
                      className={`${inputClassName} mt-2`}
                    />
                  </div>
                  <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    disabled={busyId === 'copy-day' || !snapshot.entries.length}
                    onClick={() => void copyDayTo(copyTargetDate)}
                  >
                    <Copy aria-hidden="true" className="size-4" />Copier la journée
                  </Button>
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CalendarCheck aria-hidden="true" className="size-5 text-brand-700" />
                      <p className="font-semibold text-slate-950 dark:text-white">
                        Journée {snapshot.status?.isComplete ? 'terminée' : 'en cours'}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Ce statut alimente le bilan hebdomadaire.</p>
                  </div>
                  <Button
                    variant={snapshot.status?.isComplete ? 'secondary' : 'primary'}
                    disabled={busyId === 'complete'}
                    onClick={() => void toggleComplete(!snapshot.status?.isComplete)}
                  >
                    <UtensilsCrossed aria-hidden="true" className="size-4" />
                    {snapshot.status?.isComplete ? 'Rouvrir la journée' : 'Marquer comme terminée'}
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </>
      ) : null}

      <FoodJournalAddSheet
        open={addSheetOpen}
        date={date}
        navigationStates={navigationStates}
        onClose={() => setAddSheetOpen(false)}
      />
    </section>
  );
}
