import { lazy, Suspense, type PropsWithChildren } from 'react';

const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);

const OnboardingPage = lazy(() =>
  import('@/features/onboarding/pages/OnboardingPage').then((module) => ({
    default: module.OnboardingPage,
  })),
);

const ProfilePage = lazy(() =>
  import('@/features/profile/pages/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
);

const AdvancedSettingsPage = lazy(() =>
  import('@/features/settings/pages/AdvancedSettingsPage').then((module) => ({
    default: module.AdvancedSettingsPage,
  })),
);


const ActivityJournalPage = lazy(() =>
  import('@/features/activities/pages/ActivityJournalPage').then((module) => ({
    default: module.ActivityJournalPage,
  })),
);

const AddActivityPage = lazy(() =>
  import('@/features/activities/pages/AddActivityPage').then((module) => ({
    default: module.AddActivityPage,
  })),
);

const RunningActivityPage = lazy(() =>
  import('@/features/activities/pages/ActivityEditorPage').then((module) => ({
    default: module.RunningActivityPage,
  })),
);

const SwimmingActivityPage = lazy(() =>
  import('@/features/activities/pages/ActivityEditorPage').then((module) => ({
    default: module.SwimmingActivityPage,
  })),
);

const StrengthActivityPage = lazy(() =>
  import('@/features/activities/pages/ActivityEditorPage').then((module) => ({
    default: module.StrengthActivityPage,
  })),
);

const OtherActivityPage = lazy(() =>
  import('@/features/activities/pages/ActivityEditorPage').then((module) => ({
    default: module.OtherActivityPage,
  })),
);

const EditActivityPage = lazy(() =>
  import('@/features/activities/pages/ActivityEditorPage').then((module) => ({
    default: module.EditActivityPage,
  })),
);


const StrengthExercisesPage = lazy(() =>
  import('@/features/strength-exercises/pages/StrengthExercisesPage').then((module) => ({
    default: module.StrengthExercisesPage,
  })),
);

const StrengthExerciseEditorPage = lazy(() =>
  import('@/features/strength-exercises/pages/StrengthExerciseEditorPage').then((module) => ({
    default: module.StrengthExerciseEditorPage,
  })),
);



const WorkoutSessionsPage = lazy(() =>
  import('@/features/strength-sessions/pages/WorkoutSessionsPage').then((module) => ({
    default: module.WorkoutSessionsPage,
  })),
);

const WorkoutSessionPage = lazy(() =>
  import('@/features/strength-sessions/pages/WorkoutSessionPage').then((module) => ({
    default: module.WorkoutSessionPage,
  })),
);

const WorkoutTemplatesPage = lazy(() =>
  import('@/features/strength-templates/pages/WorkoutTemplatesPage').then((module) => ({
    default: module.WorkoutTemplatesPage,
  })),
);

const WorkoutTemplateEditorPage = lazy(() =>
  import('@/features/strength-templates/pages/WorkoutTemplateEditorPage').then((module) => ({
    default: module.WorkoutTemplateEditorPage,
  })),
);

const FoodJournalPage = lazy(() =>
  import('@/features/food-journal/pages/FoodJournalPage').then((module) => ({
    default: module.FoodJournalPage,
  })),
);

const FoodEntryEditorPage = lazy(() =>
  import('@/features/food-journal/pages/FoodEntryEditorPage').then((module) => ({
    default: module.FoodEntryEditorPage,
  })),
);

const MealFoodSelectorPage = lazy(() =>
  import('@/features/food-journal/pages/MealFoodSelectorPage').then((module) => ({
    default: module.MealFoodSelectorPage,
  })),
);

const BarcodeScannerPage = lazy(() =>
  import('@/features/barcode-scanner/pages/BarcodeScannerPage').then((module) => ({
    default: module.BarcodeScannerPage,
  })),
);


const OpenFoodFactsSearchPage = lazy(() =>
  import('@/features/open-food-facts/pages/OpenFoodFactsSearchPage').then((module) => ({
    default: module.OpenFoodFactsSearchPage,
  })),
);

const FoodProductsPage = lazy(() =>
  import('@/features/products/pages/FoodProductsPage').then((module) => ({
    default: module.FoodProductsPage,
  })),
);

const FoodProductEditorPage = lazy(() =>
  import('@/features/products/pages/FoodProductEditorPage').then((module) => ({
    default: module.FoodProductEditorPage,
  })),
);


const RecipesPage = lazy(() =>
  import('@/features/recipes/pages/RecipesPage').then((module) => ({
    default: module.RecipesPage,
  })),
);

const RecipeEditorPage = lazy(() =>
  import('@/features/recipes/pages/RecipeEditorPage').then((module) => ({
    default: module.RecipeEditorPage,
  })),
);

const RecipeEntryEditorPage = lazy(() =>
  import('@/features/recipes/pages/RecipeEntryEditorPage').then((module) => ({
    default: module.RecipeEntryEditorPage,
  })),
);

const FavoriteMealsPage = lazy(() =>
  import('@/features/favorite-meals/pages/FavoriteMealsPage').then((module) => ({
    default: module.FavoriteMealsPage,
  })),
);


const AnalyticsPage = lazy(() =>
  import('@/features/analytics/pages/AnalyticsPage').then((module) => ({
    default: module.AnalyticsPage,
  })),
);

const HistoryPage = lazy(() =>
  import('@/features/history/pages/HistoryPage').then((module) => ({
    default: module.HistoryPage,
  })),
);

const WeightPage = lazy(() =>
  import('@/features/weight/pages/WeightPage').then((module) => ({
    default: module.WeightPage,
  })),
);

const WeeklyReviewPage = lazy(() =>
  import('@/features/weekly-review/pages/WeeklyReviewPage').then((module) => ({
    default: module.WeeklyReviewPage,
  })),
);

const BackupPage = lazy(() =>
  import('@/features/backup/pages/BackupPage').then((module) => ({
    default: module.BackupPage,
  })),
);

function RouteSuspense({ children }: PropsWithChildren) {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center" role="status">
          <p className="font-semibold text-slate-700 dark:text-slate-200">
            Chargement de la page…
          </p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function LazyDashboardPage() {
  return (
    <RouteSuspense>
      <DashboardPage />
    </RouteSuspense>
  );
}

export function LazyOnboardingPage() {
  return (
    <RouteSuspense>
      <OnboardingPage />
    </RouteSuspense>
  );
}

export function LazyProfilePage() {
  return (
    <RouteSuspense>
      <ProfilePage />
    </RouteSuspense>
  );
}

export function LazyAdvancedSettingsPage() {
  return (
    <RouteSuspense>
      <AdvancedSettingsPage />
    </RouteSuspense>
  );
}


export function LazyAnalyticsPage() {
  return (
    <RouteSuspense>
      <AnalyticsPage />
    </RouteSuspense>
  );
}

export function LazyHistoryPage() {
  return (
    <RouteSuspense>
      <HistoryPage />
    </RouteSuspense>
  );
}

export function LazyWeightPage() {
  return (
    <RouteSuspense>
      <WeightPage />
    </RouteSuspense>
  );
}

export function LazyActivityJournalPage() {
  return (
    <RouteSuspense>
      <ActivityJournalPage />
    </RouteSuspense>
  );
}

export function LazyAddActivityPage() {
  return (
    <RouteSuspense>
      <AddActivityPage />
    </RouteSuspense>
  );
}

export function LazyRunningActivityPage() {
  return (
    <RouteSuspense>
      <RunningActivityPage />
    </RouteSuspense>
  );
}

export function LazySwimmingActivityPage() {
  return (
    <RouteSuspense>
      <SwimmingActivityPage />
    </RouteSuspense>
  );
}

export function LazyStrengthActivityPage() {
  return (
    <RouteSuspense>
      <StrengthActivityPage />
    </RouteSuspense>
  );
}

export function LazyOtherActivityPage() {
  return (
    <RouteSuspense>
      <OtherActivityPage />
    </RouteSuspense>
  );
}

export function LazyEditActivityPage() {
  return (
    <RouteSuspense>
      <EditActivityPage />
    </RouteSuspense>
  );
}



export function LazyStrengthExercisesPage() {
  return (
    <RouteSuspense>
      <StrengthExercisesPage />
    </RouteSuspense>
  );
}

export function LazyStrengthExerciseEditorPage() {
  return (
    <RouteSuspense>
      <StrengthExerciseEditorPage />
    </RouteSuspense>
  );
}



export function LazyWorkoutSessionsPage() {
  return <RouteSuspense><WorkoutSessionsPage /></RouteSuspense>;
}

export function LazyWorkoutSessionPage() {
  return <RouteSuspense><WorkoutSessionPage /></RouteSuspense>;
}

export function LazyWorkoutTemplatesPage() {
  return <RouteSuspense><WorkoutTemplatesPage /></RouteSuspense>;
}

export function LazyWorkoutTemplateEditorPage() {
  return <RouteSuspense><WorkoutTemplateEditorPage /></RouteSuspense>;
}

export function LazyFoodJournalPage() {
  return (
    <RouteSuspense>
      <FoodJournalPage />
    </RouteSuspense>
  );
}

export function LazyFoodEntryEditorPage() {
  return (
    <RouteSuspense>
      <FoodEntryEditorPage />
    </RouteSuspense>
  );
}

export function LazyMealFoodSelectorPage() {
  return (
    <RouteSuspense>
      <MealFoodSelectorPage />
    </RouteSuspense>
  );
}

export function LazyBarcodeScannerPage() {
  return (
    <RouteSuspense>
      <BarcodeScannerPage />
    </RouteSuspense>
  );
}


export function LazyOpenFoodFactsSearchPage() {
  return (
    <RouteSuspense>
      <OpenFoodFactsSearchPage />
    </RouteSuspense>
  );
}

export function LazyFoodProductsPage() {
  return (
    <RouteSuspense>
      <FoodProductsPage />
    </RouteSuspense>
  );
}

export function LazyFoodProductEditorPage() {
  return (
    <RouteSuspense>
      <FoodProductEditorPage />
    </RouteSuspense>
  );
}


export function LazyRecipesPage() {
  return <RouteSuspense><RecipesPage /></RouteSuspense>;
}

export function LazyRecipeEditorPage() {
  return <RouteSuspense><RecipeEditorPage /></RouteSuspense>;
}

export function LazyRecipeEntryEditorPage() {
  return <RouteSuspense><RecipeEntryEditorPage /></RouteSuspense>;
}

export function LazyFavoriteMealsPage() {
  return <RouteSuspense><FavoriteMealsPage /></RouteSuspense>;
}


export function LazyWeeklyReviewPage() {
  return <RouteSuspense><WeeklyReviewPage /></RouteSuspense>;
}

export function LazyBackupPage() {
  return <RouteSuspense><BackupPage /></RouteSuspense>;
}
