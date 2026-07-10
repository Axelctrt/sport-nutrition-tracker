import {
  BookOpen,
  Camera,
  Clock3,
  FilePlus2,
  Globe2,
  Heart,
  LibraryBig,
  ScanLine,
  Search,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  barcodeScannerPath,
  favoriteMealsForMealPath,
  newFoodProductForMealPath,
  photoNutritionEstimatePath,
  recipesForMealPath,
  type FoodSelectorSource,
} from '@/app/routePaths';
import type { MealSlot } from '@/domain/models/food';
import type { FoodJournalNavigationState } from '@/features/food-journal/navigation/foodJournalNavigation';
import { cn } from '@/shared/utils/cn';

interface FoodAddMethodGridProps {
  date: string;
  mealSlot: MealSlot;
  activeSource: FoodSelectorSource;
  searchActive: boolean;
  navigationState?: FoodJournalNavigationState | null;
  onSelectSource: (source: FoodSelectorSource) => void;
  onSearchRequested: () => void;
}

interface MethodButtonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  active?: boolean;
  onClick: () => void;
}

interface MethodLinkProps {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  state?: FoodJournalNavigationState | null | undefined;
}

const methodClassName =
  'flex min-h-24 min-w-0 items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

function MethodContent({
  icon: Icon,
  title,
  description,
  active = false,
}: Pick<MethodButtonProps, 'icon' | 'title' | 'description' | 'active'>) {
  return (
    <>
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-2xl',
          active
            ? 'bg-brand-700 text-white dark:bg-brand-500'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-950 dark:text-white">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
          {description}
        </span>
      </span>
    </>
  );
}

function MethodButton({ icon, title, description, active = false, onClick }: MethodButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        methodClassName,
        active
          ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/35'
          : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/20',
      )}
    >
      <MethodContent icon={icon} title={title} description={description} active={active} />
    </button>
  );
}

function MethodLink({ icon, title, description, to, state }: MethodLinkProps) {
  return (
    <Link
      to={to}
      state={state ?? undefined}
      className={cn(
        methodClassName,
        'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/20',
      )}
    >
      <MethodContent icon={icon} title={title} description={description} />
    </Link>
  );
}

export function FoodAddMethodGrid({
  date,
  mealSlot,
  activeSource,
  searchActive,
  navigationState,
  onSelectSource,
  onSearchRequested,
}: FoodAddMethodGridProps) {
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Méthodes d’ajout d’un aliment">
      <MethodButton
        icon={Search}
        title="Rechercher"
        description="Chercher dans tes aliments, même avec un accent ou une petite faute."
        active={searchActive}
        onClick={onSearchRequested}
      />
      <MethodButton
        icon={Globe2}
        title="Open Food Facts"
        description="Rechercher dans la base collaborative en ligne."
        active={activeSource === 'openFoodFacts'}
        onClick={() => onSelectSource('openFoodFacts')}
      />
      <MethodLink
        icon={ScanLine}
        title="Scanner"
        description="Lire un code-barres avec l’appareil photo."
        to={barcodeScannerPath(date, mealSlot)}
        state={navigationState}
      />
      <MethodLink
        icon={Camera}
        title="Photo"
        description="Estimer un repas à partir d’une photo, avec validation obligatoire."
        to={photoNutritionEstimatePath(date, mealSlot)}
        state={navigationState}
      />
      <MethodButton
        icon={Clock3}
        title="Récents"
        description="Retrouver les aliments ajoutés dernièrement."
        active={activeSource === 'recent'}
        onClick={() => onSelectSource('recent')}
      />
      <MethodButton
        icon={Star}
        title="Favoris"
        description="Afficher tes aliments marqués comme favoris."
        active={activeSource === 'favorites'}
        onClick={() => onSelectSource('favorites')}
      />
      <MethodButton
        icon={LibraryBig}
        title="Mes aliments"
        description="Parcourir toute ta bibliothèque locale."
        active={activeSource === 'all' && !searchActive}
        onClick={() => onSelectSource('all')}
      />
      <MethodLink
        icon={BookOpen}
        title="Recettes"
        description="Ajouter une ou plusieurs portions d’une recette."
        to={recipesForMealPath(date, mealSlot)}
        state={navigationState}
      />
      <MethodLink
        icon={Heart}
        title="Repas favoris"
        description="Réutiliser un repas complet déjà enregistré."
        to={favoriteMealsForMealPath(date, mealSlot)}
        state={navigationState}
      />
      <MethodLink
        icon={FilePlus2}
        title="Ajout manuel"
        description="Créer un aliment avec ses valeurs pour 100 g ou 100 ml."
        to={newFoodProductForMealPath(date, mealSlot)}
        state={navigationState}
      />
    </div>
  );
}
