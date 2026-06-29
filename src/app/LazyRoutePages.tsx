import { lazy, Suspense, type PropsWithChildren } from 'react';
import { PageSkeleton, type PageSkeletonVariant } from '@/shared/ui/PageSkeleton';

const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);


const GlobalSearchPage = lazy(() =>
  import('@/features/global-search/pages/GlobalSearchPage').then(
    (module) => ({
      default: module.GlobalSearchPage,
    }),
  ),
);

const DashboardCustomizationPage = lazy(() =>
  import('@/features/dashboard-customization/pages/DashboardCustomizationPage').then((module) => ({
    default: module.DashboardCustomizationPage,
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
const RoutineRemindersPage = lazy(() =>
  import('@/features/reminders/pages/RoutineRemindersPage').then((module) => ({
    default: module.RoutineRemindersPage,
  })),
);


const ActivityJournalPage = lazy(() =>
  import('@/features/activities/pages/ActivityJournalPage').then((module) => ({
    default: module.ActivityJournalPage,
  })),
);


const EnduranceTemplatesPage = lazy(() =>
  import('@/features/endurance-templates/pages/EnduranceTemplatesPage').then((module) => ({
    default: module.EnduranceTemplatesPage,
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


const StrengthExerciseHistoryPage = lazy(() =>
  import('@/features/strength-history/pages/StrengthExerciseHistoryPage').then((module) => ({
    default: module.StrengthExerciseHistoryPage,
  })),
);




const WeeklyPlanningPage = lazy(() =>
  import('@/features/strength-planning/pages/WeeklyPlanningPage').then((module) => ({
    default: module.WeeklyPlanningPage,
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

const ProgressReportsPage = lazy(() =>
  import('@/features/progress-reports/pages/ProgressReportsPage').then(
    (module) => ({
      default: module.ProgressReportsPage,
    }),
  ),
);

const GoalsPage = lazy(() =>
  import('@/features/goals/pages/GoalsPage').then((module) => ({
    default: module.GoalsPage,
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

const RewardsCenterPage = lazy(() =>
  import('@/features/rewards/pages/RewardsCenterPage').then((module) => ({
    default: module.RewardsCenterPage,
  })),
);
const TrashPage = lazy(() =>
  import('@/features/trash/pages/TrashPage').then((module) => ({
    default: module.TrashPage,
  })),
);
const BackupPage = lazy(() =>
  import('@/features/backup/pages/BackupPage').then((module) => ({
    default: module.BackupPage,
  })),
);

const PrivacyPage = lazy(() =>
  import('@/features/information/pages/PrivacyPage').then((module) => ({
    default: module.PrivacyPage,
  })),
);

export function RouteSuspense({
  children,
  variant = 'list',
}: PropsWithChildren<{ variant?: PageSkeletonVariant }>) {
  return (
    <Suspense fallback={<PageSkeleton variant={variant} />}>
      {children}
    </Suspense>
  );
}

export function LazyDashboardPage() {
  return (
    <RouteSuspense variant="dashboard">
      <DashboardPage />
    </RouteSuspense>
  );
}

export function LazyGlobalSearchPage() {
  return (
    <RouteSuspense variant="list">
      <GlobalSearchPage />
    </RouteSuspense>
  );
}

export function LazyDashboardCustomizationPage() {
  return (
    <RouteSuspense variant="form">
      <DashboardCustomizationPage />
    </RouteSuspense>
  );
}

export function LazyOnboardingPage() {
  return (
    <RouteSuspense variant="form">
      <OnboardingPage />
    </RouteSuspense>
  );
}

export function LazyProfilePage() {
  return (
    <RouteSuspense variant="form">
      <ProfilePage />
    </RouteSuspense>
  );
}

export function LazyAdvancedSettingsPage() {
  return (
    <RouteSuspense variant="form">
      <AdvancedSettingsPage />
    </RouteSuspense>
  );
}
export function LazyRoutineRemindersPage() {
  return (
    <RouteSuspense variant="form">
      <RoutineRemindersPage />
    </RouteSuspense>
  );
}


export function LazyAnalyticsPage() {
  return (
    <RouteSuspense variant="dashboard">
      <AnalyticsPage />
    </RouteSuspense>
  );
}

export function LazyProgressReportsPage() {
  return (
    <RouteSuspense variant="dashboard">
      <ProgressReportsPage />
    </RouteSuspense>
  );
}

export function LazyGoalsPage() {
  return (
    <RouteSuspense variant="list">
      <GoalsPage />
    </RouteSuspense>
  );
}

export function LazyHistoryPage() {
  return (
    <RouteSuspense variant="list">
      <HistoryPage />
    </RouteSuspense>
  );
}

export function LazyWeightPage() {
  return (
    <RouteSuspense variant="dashboard">
      <WeightPage />
    </RouteSuspense>
  );
}

export function LazyActivityJournalPage() {
  return (
    <RouteSuspense variant="list">
      <ActivityJournalPage />
    </RouteSuspense>
  );
}


export function LazyEnduranceTemplatesPage() {
  return (
    <RouteSuspense variant="list">
      <EnduranceTemplatesPage />
    </RouteSuspense>
  );
}

export function LazyAddActivityPage() {
  return (
    <RouteSuspense variant="form">
      <AddActivityPage />
    </RouteSuspense>
  );
}

export function LazyRunningActivityPage() {
  return (
    <RouteSuspense variant="form">
      <RunningActivityPage />
    </RouteSuspense>
  );
}

export function LazySwimmingActivityPage() {
  return (
    <RouteSuspense variant="form">
      <SwimmingActivityPage />
    </RouteSuspense>
  );
}

export function LazyStrengthActivityPage() {
  return (
    <RouteSuspense variant="form">
      <StrengthActivityPage />
    </RouteSuspense>
  );
}

export function LazyOtherActivityPage() {
  return (
    <RouteSuspense variant="form">
      <OtherActivityPage />
    </RouteSuspense>
  );
}

export function LazyEditActivityPage() {
  return (
    <RouteSuspense variant="form">
      <EditActivityPage />
    </RouteSuspense>
  );
}



export function LazyStrengthExercisesPage() {
  return (
    <RouteSuspense variant="list">
      <StrengthExercisesPage />
    </RouteSuspense>
  );
}

export function LazyStrengthExerciseEditorPage() {
  return (
    <RouteSuspense variant="form">
      <StrengthExerciseEditorPage />
    </RouteSuspense>
  );
}


export function LazyStrengthExerciseHistoryPage() {
  return (
    <RouteSuspense variant="detail">
      <StrengthExerciseHistoryPage />
    </RouteSuspense>
  );
}



export function LazyWeeklyPlanningPage() {
  return <RouteSuspense variant="list"><WeeklyPlanningPage /></RouteSuspense>;
}

export function LazyWorkoutSessionsPage() {
  return <RouteSuspense variant="list"><WorkoutSessionsPage /></RouteSuspense>;
}

export function LazyWorkoutSessionPage() {
  return <RouteSuspense variant="workout"><WorkoutSessionPage /></RouteSuspense>;
}

export function LazyWorkoutTemplatesPage() {
  return <RouteSuspense variant="list"><WorkoutTemplatesPage /></RouteSuspense>;
}

export function LazyWorkoutTemplateEditorPage() {
  return <RouteSuspense variant="form"><WorkoutTemplateEditorPage /></RouteSuspense>;
}

export function LazyFoodJournalPage() {
  return (
    <RouteSuspense variant="dashboard">
      <FoodJournalPage />
    </RouteSuspense>
  );
}

export function LazyFoodEntryEditorPage() {
  return (
    <RouteSuspense variant="form">
      <FoodEntryEditorPage />
    </RouteSuspense>
  );
}

export function LazyMealFoodSelectorPage() {
  return (
    <RouteSuspense variant="list">
      <MealFoodSelectorPage />
    </RouteSuspense>
  );
}

export function LazyBarcodeScannerPage() {
  return (
    <RouteSuspense variant="detail">
      <BarcodeScannerPage />
    </RouteSuspense>
  );
}


export function LazyOpenFoodFactsSearchPage() {
  return (
    <RouteSuspense variant="list">
      <OpenFoodFactsSearchPage />
    </RouteSuspense>
  );
}

export function LazyFoodProductsPage() {
  return (
    <RouteSuspense variant="list">
      <FoodProductsPage />
    </RouteSuspense>
  );
}

export function LazyFoodProductEditorPage() {
  return (
    <RouteSuspense variant="form">
      <FoodProductEditorPage />
    </RouteSuspense>
  );
}


export function LazyRecipesPage() {
  return <RouteSuspense variant="list"><RecipesPage /></RouteSuspense>;
}

export function LazyRecipeEditorPage() {
  return <RouteSuspense variant="form"><RecipeEditorPage /></RouteSuspense>;
}

export function LazyRecipeEntryEditorPage() {
  return <RouteSuspense variant="form"><RecipeEntryEditorPage /></RouteSuspense>;
}

export function LazyFavoriteMealsPage() {
  return <RouteSuspense variant="list"><FavoriteMealsPage /></RouteSuspense>;
}


export function LazyWeeklyReviewPage() {
  return <RouteSuspense variant="dashboard"><WeeklyReviewPage /></RouteSuspense>;
}

export function LazyRewardsCenterPage() {
  return (
    <RouteSuspense variant="list">
      <RewardsCenterPage />
    </RouteSuspense>
  );
}
export function LazyTrashPage() {
  return (
    <RouteSuspense variant="list">
      <TrashPage />
    </RouteSuspense>
  );
}
export function LazyBackupPage() {
  return <RouteSuspense variant="form"><BackupPage /></RouteSuspense>;
}

export function LazyPrivacyPage() {
  return <RouteSuspense variant="detail"><PrivacyPage /></RouteSuspense>;
}
