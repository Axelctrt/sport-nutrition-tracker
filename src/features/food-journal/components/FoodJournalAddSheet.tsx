import {
  Apple,
  ArrowLeft,
  BookOpen,
  Camera,
  Clock3,
  Coffee,
  FilePlus2,
  Heart,
  MoonStar,
  Salad,
  ScanLine,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  barcodeScannerPath,
  favoriteMealsForMealPath,
  newFoodProductForMealPath,
  photoNutritionEstimatePath,
  recipesForMealPath,
  selectFoodPath,
  type DashboardMealAddStep,
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

interface FoodJournalAddSheetProps {
  open: boolean;
  date: string;
  navigationStates: ReadonlyMap<MealSlot, FoodJournalNavigationState>;
  entryCounts?: MealEntryCounts;
  currentHour?: number;
  initialSlot?: MealSlot;
  initialStep?: DashboardMealAddStep;
  onStepChange?: (step: DashboardMealAddStep, slot: MealSlot) => void;
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

export function FoodJournalAddSheet({
  open,
  date,
  navigationStates,
  entryCounts,
  currentHour = new Date().getHours(),
  initialSlot,
  initialStep = 'meal',
  onStepChange,
  onClose,
}: FoodJournalAddSheetProps) {
  const [step, setStep] = useState<DashboardMealAddStep>('meal');
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('breakfast');

  useEffect(() => {
    if (!open) return;
    setStep(initialStep);
    setSelectedSlot(initialSlot ?? recommendedMealSlot(
      currentHour,
      entryCounts ?? emptyEntryCounts,
    ));
  }, [currentHour, entryCounts, initialSlot, initialStep, open]);

  const changeStep = (nextStep: DashboardMealAddStep) => {
    setStep(nextStep);
    onStepChange?.(nextStep, selectedSlot);
  };

  const title = (
    <span className="flex items-center gap-2">
      {step === 'method' ? (
        <button
          type="button"
          aria-label="Choisir un autre repas"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={() => changeStep('meal')}
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
          ? 'Le repas le plus pertinent est présélectionné, mais tu peux le modifier.'
          : `Choisis comment compléter le ${mealSlotLabels[selectedSlot].toLocaleLowerCase('fr')}.`
      }
      onClose={onClose}
      footer={step === 'meal' ? (
        <Button fullWidth onClick={() => changeStep('method')}>
          Continuer
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
              onSelect={() => setSelectedSlot(slot)}
              comfortable
            />
          ))}
        </ChoiceCardGroup>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Méthodes d’ajout">
          {addMethods.map(({ id, title: methodTitle, description, icon: Icon, path }) => (
            <Link
              key={id}
              to={path(date, selectedSlot)}
              state={navigationStates.get(selectedSlot) ?? {}}
              className="flex min-h-20 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/40"
            >
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
            </Link>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
