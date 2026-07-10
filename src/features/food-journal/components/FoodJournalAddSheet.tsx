import { Apple, Coffee, MoonStar, Salad } from 'lucide-react';
import { Link } from 'react-router-dom';
import { selectFoodPath } from '@/app/routePaths';
import type { MealSlot } from '@/domain/models/food';
import type { FoodJournalNavigationState } from '@/features/food-journal/navigation/foodJournalNavigation';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { BottomSheet } from '@/shared/ui/BottomSheet';

interface FoodJournalAddSheetProps {
  open: boolean;
  date: string;
  navigationStates: ReadonlyMap<MealSlot, FoodJournalNavigationState>;
  onClose: () => void;
}

const mealOptions = [
  { slot: 'breakfast', icon: Coffee, description: 'Commencer la journée' },
  { slot: 'lunch', icon: Salad, description: 'Repas du midi' },
  { slot: 'dinner', icon: MoonStar, description: 'Repas du soir' },
  { slot: 'snacks', icon: Apple, description: 'Collations et encas' },
] satisfies ReadonlyArray<{
  slot: MealSlot;
  icon: typeof Coffee;
  description: string;
}>;

export function FoodJournalAddSheet({
  open,
  date,
  navigationStates,
  onClose,
}: FoodJournalAddSheetProps) {
  return (
    <BottomSheet
      open={open}
      title="Ajouter un aliment"
      description="Choisissez le repas à compléter. Les autres méthodes d’ajout restent accessibles dans l’écran suivant."
      onClose={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {mealOptions.map(({ slot, icon: Icon, description }) => (
          <Link
            key={slot}
            to={selectFoodPath(date, slot)}
            state={navigationStates.get(slot) ?? {}}
            onClick={onClose}
            className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/40"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-slate-950 dark:text-white">
                {mealSlotLabels[slot]}
              </span>
              <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </BottomSheet>
  );
}
