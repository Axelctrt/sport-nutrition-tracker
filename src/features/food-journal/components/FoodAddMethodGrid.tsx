import {
  BookOpen,
  Camera,
  ChevronDown,
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
import type { FoodAddMethod } from '@/features/food-journal/preferences/foodAddMethodPreference';
import { cn } from '@/shared/utils/cn';

interface FoodAddMethodGridProps {
  date: string;
  mealSlot: MealSlot;
  activeSource: FoodSelectorSource;
  searchActive: boolean;
  hasFavoriteProducts: boolean;
  lastMethod?: FoodAddMethod | undefined;
  navigationState?: FoodJournalNavigationState | null;
  onSelectSource: (source: FoodSelectorSource) => void;
  onSearchRequested: () => void;
  onMethodUsed: (method: FoodAddMethod) => void;
}

interface MethodButtonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string | undefined;
  active?: boolean;
  onClick: () => void;
}

interface MethodLinkProps {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string | undefined;
  to: string;
  state?: FoodJournalNavigationState | null | undefined;
  onClick: () => void;
}

const methodClassName =
  'flex min-h-24 min-w-0 items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

const primaryMethods: readonly FoodAddMethod[] = ['search', 'recent', 'scanner'];
const advancedMethods: readonly FoodAddMethod[] = [
  'favorites',
  'all',
  'favoriteMeals',
  'photo',
  'recipes',
  'openFoodFacts',
  'manual',
];

function MethodContent({
  icon: Icon,
  title,
  description,
  eyebrow,
  active = false,
}: Pick<MethodButtonProps, 'icon' | 'title' | 'description' | 'eyebrow' | 'active'>) {
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
        {eyebrow ? (
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            {eyebrow}
          </span>
        ) : null}
        <span className="block font-semibold text-slate-950 dark:text-white">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
          {description}
        </span>
      </span>
    </>
  );
}

function MethodButton({ icon, title, description, eyebrow, active = false, onClick }: MethodButtonProps) {
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
      <MethodContent
        icon={icon}
        title={title}
        description={description}
        eyebrow={eyebrow}
        active={active}
      />
    </button>
  );
}

function MethodLink({ icon, title, description, eyebrow, to, state, onClick }: MethodLinkProps) {
  return (
    <Link
      to={to}
      state={state ?? undefined}
      onClick={onClick}
      className={cn(
        methodClassName,
        'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/20',
      )}
    >
      <MethodContent icon={icon} title={title} description={description} eyebrow={eyebrow} />
    </Link>
  );
}

export function FoodAddMethodGrid({
  date,
  mealSlot,
  activeSource,
  searchActive,
  hasFavoriteProducts,
  lastMethod,
  navigationState,
  onSelectSource,
  onSearchRequested,
  onMethodUsed,
}: FoodAddMethodGridProps) {
  const activeMethod: FoodAddMethod = searchActive ? 'search' : activeSource;
  const shortcutMethod = lastMethod && !primaryMethods.includes(lastMethod)
    ? lastMethod
    : !lastMethod && hasFavoriteProducts
      ? 'favorites'
      : undefined;
  const methodsInAdvancedGroup = advancedMethods.filter((method) => method !== shortcutMethod);
  const advancedOpenByDefault = methodsInAdvancedGroup.includes(activeMethod);

  const activateMethod = (method: FoodAddMethod, action: () => void) => {
    onMethodUsed(method);
    action();
  };

  const renderMethod = (method: FoodAddMethod, eyebrow?: string) => {
    if (method === 'search') {
      return (
        <MethodButton
          key={method}
          icon={Search}
          title="Rechercher"
          description="Trouver un aliment local par son nom, sa marque ou son code-barres."
          eyebrow={eyebrow}
          active={searchActive}
          onClick={() => activateMethod(method, onSearchRequested)}
        />
      );
    }

    if (method === 'recent') {
      return (
        <MethodButton
          key={method}
          icon={Clock3}
          title="Récents"
          description="Reprendre rapidement un aliment ajouté dernièrement."
          eyebrow={eyebrow}
          active={activeSource === 'recent' && !searchActive}
          onClick={() => activateMethod(method, () => onSelectSource('recent'))}
        />
      );
    }

    if (method === 'scanner') {
      return (
        <MethodLink
          key={method}
          icon={ScanLine}
          title="Scanner"
          description="Lire un code-barres avec l’appareil photo."
          eyebrow={eyebrow}
          to={barcodeScannerPath(date, mealSlot)}
          state={navigationState}
          onClick={() => onMethodUsed(method)}
        />
      );
    }

    if (method === 'favorites') {
      return (
        <MethodButton
          key={method}
          icon={Star}
          title="Favoris"
          description="Afficher les aliments marqués comme favoris."
          eyebrow={eyebrow}
          active={activeSource === 'favorites' && !searchActive}
          onClick={() => activateMethod(method, () => onSelectSource('favorites'))}
        />
      );
    }

    if (method === 'all') {
      return (
        <MethodButton
          key={method}
          icon={LibraryBig}
          title="Mes aliments"
          description="Parcourir toute la bibliothèque disponible hors connexion."
          eyebrow={eyebrow}
          active={activeSource === 'all' && !searchActive}
          onClick={() => activateMethod(method, () => onSelectSource('all'))}
        />
      );
    }

    if (method === 'favoriteMeals') {
      return (
        <MethodLink
          key={method}
          icon={Heart}
          title="Repas favoris"
          description="Ajouter en une fois un repas complet déjà enregistré."
          eyebrow={eyebrow}
          to={favoriteMealsForMealPath(date, mealSlot)}
          state={navigationState}
          onClick={() => onMethodUsed(method)}
        />
      );
    }

    if (method === 'photo') {
      return (
        <MethodLink
          key={method}
          icon={Camera}
          title="Photo"
          description="Estimer un repas à partir d’une photo, puis vérifier le résultat."
          eyebrow={eyebrow}
          to={photoNutritionEstimatePath(date, mealSlot)}
          state={navigationState}
          onClick={() => onMethodUsed(method)}
        />
      );
    }

    if (method === 'recipes') {
      return (
        <MethodLink
          key={method}
          icon={BookOpen}
          title="Recettes"
          description="Ajouter une ou plusieurs portions d’une recette."
          eyebrow={eyebrow}
          to={recipesForMealPath(date, mealSlot)}
          state={navigationState}
          onClick={() => onMethodUsed(method)}
        />
      );
    }

    if (method === 'openFoodFacts') {
      return (
        <MethodButton
          key={method}
          icon={Globe2}
          title="Open Food Facts"
          description="Rechercher dans la base collaborative en ligne."
          eyebrow={eyebrow}
          active={activeSource === 'openFoodFacts'}
          onClick={() => activateMethod(method, () => onSelectSource('openFoodFacts'))}
        />
      );
    }

    return (
      <MethodLink
        key={method}
        icon={FilePlus2}
        title="Ajout manuel"
        description="Créer un aliment avec ses valeurs pour 100 g ou 100 ml."
        eyebrow={eyebrow}
        to={newFoodProductForMealPath(date, mealSlot)}
        state={navigationState}
        onClick={() => onMethodUsed(method)}
      />
    );
  };

  return (
    <div className="min-w-0 space-y-4" aria-label="Méthodes d’ajout d’un aliment">
      <section aria-labelledby="food-add-fast-methods">
        <h3 id="food-add-fast-methods" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Ajouter rapidement
        </h3>
        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {primaryMethods.map((method) => renderMethod(method))}
        </div>
      </section>

      {shortcutMethod ? (
        <section aria-labelledby="food-add-shortcut">
          <h3 id="food-add-shortcut" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Ton raccourci
          </h3>
          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {renderMethod(
              shortcutMethod,
              lastMethod === shortcutMethod ? 'Dernière méthode' : 'Selon tes favoris',
            )}
          </div>
        </section>
      ) : null}

      <details
        className="group rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40"
        open={advancedOpenByDefault}
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
          <span>
            Autres méthodes
            <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
              bibliothèque, recettes et services en ligne
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div className="grid min-w-0 gap-3 border-t border-slate-200 p-3 sm:grid-cols-2 xl:grid-cols-3 dark:border-slate-800">
          {methodsInAdvancedGroup.map((method) => renderMethod(method))}
        </div>
      </details>
    </div>
  );
}
