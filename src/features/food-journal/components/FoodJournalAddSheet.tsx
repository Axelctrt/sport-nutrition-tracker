import {
  Apple,
  ArrowLeft,
  BookOpen,
  Camera,
  Clock3,
  Coffee,
  Database,
  FilePlus2,
  Globe2,
  Heart,
  MoonStar,
  Plus,
  Salad,
  ScanLine,
  Search,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  loadFoodJournal,
  type FoodEntryWithProduct,
  type MealJournalSnapshot,
} from '@/application/food/foodJournalService';
import {
  barcodeScannerPath,
  favoriteMealsForMealPath,
  newFoodProductForMealPath,
  photoNutritionEstimatePath,
  recipesForMealPath,
  selectFoodPath,
  type MealAddStep,
} from '@/app/routePaths';
import type { MealSlot } from '@/domain/models/food';
import type { FoodJournalNavigationState } from '@/features/food-journal/navigation/foodJournalNavigation';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import {
  recommendedMealSlot,
  type MealEntryCounts,
} from '@/features/food-journal/utils/recommendedMealSlot';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { ChoiceCard, ChoiceCardGroup } from '@/shared/ui/ChoiceCard';
import { FirstUseHint } from '@/shared/ui/FirstUseHint';

interface FoodJournalAddSheetProps {
  open: boolean;
  date: string;
  navigationStates: ReadonlyMap<MealSlot, FoodJournalNavigationState>;
  entryCounts?: MealEntryCounts;
  currentHour?: number;
  initialSlot?: MealSlot;
  initialStep?: MealAddStep;
  meals?: readonly MealJournalSnapshot[];
  onStepChange?: (step: MealAddStep, slot: MealSlot) => void;
  onFinish?: (slot: MealSlot) => void;
  onClose: () => void;
}

const mealOptions = [
  { slot: 'breakfast', icon: Coffee, description: 'Petit-déjeuner' },
  { slot: 'lunch', icon: Salad, description: 'Repas du midi' },
  { slot: 'dinner', icon: MoonStar, description: 'Repas du soir' },
  { slot: 'snacks', icon: Apple, description: 'Collation ou encas' },
] satisfies ReadonlyArray<{
  slot: MealSlot;
  icon: LucideIcon;
  description: string;
}>;

const emptyEntryCounts: MealEntryCounts = {};

interface AddMethod {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  path: (date: string, slot: MealSlot) => string;
}

const addMethods: readonly AddMethod[] = [
  {
    id: 'search',
    title: 'Rechercher un aliment',
    description: 'Trouver un aliment local ou en ligne.',
    icon: Search,
    path: (date, slot) => selectFoodPath(date, slot),
  },
  {
    id: 'scanner',
    title: 'Scanner un produit',
    description: 'Lire son code-barres avec l’appareil photo.',
    icon: ScanLine,
    path: barcodeScannerPath,
  },
  {
    id: 'recent',
    title: 'Utiliser un aliment récent',
    description: 'Reprendre rapidement un aliment déjà ajouté.',
    icon: Clock3,
    path: (date, slot) => selectFoodPath(date, slot, undefined, 'recent'),
  },
  {
    id: 'favorite-meal',
    title: 'Utiliser un repas favori',
    description: 'Ajouter en une fois un repas enregistré.',
    icon: Heart,
    path: favoriteMealsForMealPath,
  },
  {
    id: 'recipe',
    title: 'Utiliser une recette',
    description: 'Choisir une recette et le nombre de portions.',
    icon: BookOpen,
    path: recipesForMealPath,
  },
  {
    id: 'photo',
    title: 'Photo du repas',
    description: 'Estimer le repas depuis une photo, puis vérifier.',
    icon: Camera,
    path: photoNutritionEstimatePath,
  },
  {
    id: 'manual',
    title: 'Saisie manuelle',
    description: 'Créer un produit avec ses valeurs nutritionnelles.',
    icon: FilePlus2,
    path: newFoodProductForMealPath,
  },
];

function entryName(item: FoodEntryWithProduct): string {
  return item.product?.name
    ?? item.recipe?.name
    ?? (item.entry.reference.sourceType === 'recipe'
      ? 'Recette indisponible'
      : 'Aliment indisponible');
}

function entryQuantity(item: FoodEntryWithProduct): string {
  if (item.entry.reference.sourceType === 'recipe') {
    return `${item.entry.reference.servingsConsumed} portion(s)`;
  }
  return `${item.entry.reference.inputQuantity} ${
    item.entry.reference.inputMode === 'servings'
      ? 'portion(s)'
      : item.entry.reference.normalizedUnit
  }`;
}

export function FoodJournalAddSheet({
  open,
  date,
  navigationStates,
  entryCounts,
  currentHour = new Date().getHours(),
  initialSlot,
  initialStep = 'meal',
  meals,
  onStepChange,
  onFinish,
  onClose,
}: FoodJournalAddSheetProps) {
  const [step, setStep] = useState<MealAddStep>('meal');
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('breakfast');
  const [availableMeals, setAvailableMeals] = useState<readonly MealJournalSnapshot[]>([]);
  const [isLoadingMeal, setIsLoadingMeal] = useState(false);
  const [searchSourceOpen, setSearchSourceOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(initialStep);
    setSearchSourceOpen(false);
    setSelectedSlot(initialSlot ?? recommendedMealSlot(
      currentHour,
      entryCounts ?? emptyEntryCounts,
    ));
  }, [currentHour, entryCounts, initialSlot, initialStep, open]);

  useEffect(() => {
    if (!open) return undefined;
    if (meals) {
      setAvailableMeals(meals);
      setIsLoadingMeal(false);
      return undefined;
    }

    let active = true;
    setIsLoadingMeal(true);
    void loadFoodJournal(date)
      .then((snapshot) => {
        if (active) setAvailableMeals(snapshot.meals);
      })
      .catch(() => {
        if (active) setAvailableMeals([]);
      })
      .finally(() => {
        if (active) setIsLoadingMeal(false);
      });
    return () => {
      active = false;
    };
  }, [date, meals, open]);

  const changeStep = (nextStep: MealAddStep, slot = selectedSlot) => {
    setStep(nextStep);
    setSearchSourceOpen(false);
    onStepChange?.(nextStep, slot);
  };
  const selectedMeal = availableMeals.find((meal) => meal.slot === selectedSlot);
  const selectedEntries = selectedMeal?.entries ?? [];

  const title = (
    <span className="flex items-center gap-2">
      {step !== 'meal' ? (
        <button
          type="button"
          aria-label={searchSourceOpen
            ? 'Retour aux méthodes d’ajout'
            : step === 'method'
              ? 'Retour au repas'
              : 'Choisir un autre repas'}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={() => {
            if (searchSourceOpen) setSearchSourceOpen(false);
            else changeStep(step === 'method' ? 'overview' : 'meal');
          }}
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </button>
      ) : null}
      <span>Ajouter un repas</span>
    </span>
  );

  return (
    <BottomSheet
      open={open}
      title={title}
      description={
        step === 'meal'
          ? 'Choisis le repas que tu souhaites compléter.'
          : step === 'overview'
            ? `Ajoute autant d’éléments que nécessaire au ${mealSlotLabels[selectedSlot].toLocaleLowerCase('fr')}.`
            : searchSourceOpen
              ? 'Choisis où rechercher cet aliment.'
              : `Choisis comment compléter le ${mealSlotLabels[selectedSlot].toLocaleLowerCase('fr')}.`
      }
      onClose={onClose}
      footer={step === 'overview' ? (
        <Button fullWidth onClick={() => (onFinish ?? onClose)(selectedSlot)}>
          Terminer le repas
        </Button>
      ) : undefined}
    >
      {step === 'meal' ? (
        <ChoiceCardGroup label="Quel repas souhaites-tu compléter ?" columns={1}>
          {mealOptions.map(({ slot, icon, description }) => (
            <ChoiceCard
              key={slot}
              name="meal-add-slot"
              value={slot}
              title={mealSlotLabels[slot]}
              description={description}
              icon={icon}
              selected={selectedSlot === slot}
              onSelect={() => {
                setSelectedSlot(slot);
                changeStep('overview', slot);
              }}
              comfortable
            />
          ))}
        </ChoiceCardGroup>
      ) : step === 'overview' ? (
        <div className="space-y-4">
          <FirstUseHint hintKey="nutrition-compose-meal" title="Composer ton repas">
            Ajoute plusieurs éléments, puis termine le repas quand il est complet.
          </FirstUseHint>
          <div
            className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
            aria-label={`Contenu du ${mealSlotLabels[selectedSlot].toLocaleLowerCase('fr')}`}
          >
            {isLoadingMeal ? (
              <p className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400" role="status">
                Chargement du repas…
              </p>
            ) : selectedEntries.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Utensils aria-hidden="true" className="mx-auto size-8 text-slate-400" />
                <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                  Aucun élément enregistré
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Commence avec la méthode qui te convient.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {selectedEntries.map((item) => (
                  <article key={item.entry.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-950 dark:text-white">
                        {entryName(item)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {entryQuantity(item)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                      {Math.round(item.nutrition.caloriesKcal)} kcal
                    </span>
                  </article>
                ))}
              </div>
            )}
          </div>

          <Button fullWidth onClick={() => changeStep('method')}>
            <Plus aria-hidden="true" className="size-4" />
            {selectedEntries.length > 0 ? 'Ajouter un autre élément' : 'Ajouter un élément'}
          </Button>
        </div>
      ) : searchSourceOpen ? (
        <div className="grid gap-3" aria-label="Source de recherche">
          <Link
            to={selectFoodPath(date, selectedSlot, undefined, 'all')}
            state={navigationStates.get(selectedSlot) ?? {}}
            className="flex min-h-20 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/40"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <Database aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-950 dark:text-white">Mes aliments</span>
              <span className="mt-1 block text-xs leading-4 text-slate-500 dark:text-slate-400">
                Recherche par nom, marque ou code-barres dans tes aliments enregistrés.
              </span>
            </span>
          </Link>
          <Link
            to={selectFoodPath(date, selectedSlot, undefined, 'openFoodFacts')}
            state={navigationStates.get(selectedSlot) ?? {}}
            className="flex min-h-20 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/40"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <Globe2 aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-950 dark:text-white">Open Food Facts</span>
              <span className="mt-1 block text-xs leading-4 text-slate-500 dark:text-slate-400">
                Recherche en ligne dans le catalogue Open Food Facts.
              </span>
            </span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Méthodes d’ajout">
          {addMethods.map(({ id, title: methodTitle, description, icon: Icon, path }) => {
            const content = (
              <>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-950 dark:text-white">
                  {methodTitle}
                </span>
                <span className="mt-1 block text-xs leading-4 text-slate-500 dark:text-slate-400">
                  {description}
                </span>
              </span>
              </>
            );
            const className = 'flex min-h-20 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/40';

            return id === 'search' ? (
              <button
                key={id}
                type="button"
                className={className}
                onClick={() => setSearchSourceOpen(true)}
              >
                {content}
              </button>
            ) : (
              <Link
                key={id}
                to={path(date, selectedSlot)}
                state={navigationStates.get(selectedSlot) ?? {}}
                className={className}
              >
                {content}
              </Link>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
}
