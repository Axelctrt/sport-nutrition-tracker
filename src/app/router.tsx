import { createHashRouter } from 'react-router-dom';
import {
  LazyAddActivityPage,
  LazyBackupPage,
  LazyBarcodeScannerPage,
  LazyAdvancedSettingsPage,
  LazyAnalyticsPage,
  LazyActivityJournalPage,
  LazyDashboardPage,
  LazyEditActivityPage,
  LazyFoodEntryEditorPage,
  LazyFoodJournalPage,
  LazyMealFoodSelectorPage,
  LazyFoodProductEditorPage,
  LazyFoodProductsPage,
  LazyHistoryPage,
  LazyFavoriteMealsPage,
  LazyOpenFoodFactsSearchPage,
  LazyOnboardingPage,
  LazyRecipeEditorPage,
  LazyRecipeEntryEditorPage,
  LazyRecipesPage,
  LazyOtherActivityPage,
  LazyProfilePage,
  LazyRunningActivityPage,
  LazyStrengthActivityPage,
  LazyStrengthExercisesPage,
  LazyStrengthExerciseEditorPage,
  LazyStrengthExerciseHistoryPage,
  LazyWorkoutSessionsPage,
  LazyWorkoutSessionPage,
  LazyWorkoutTemplatesPage,
  LazyWorkoutTemplateEditorPage,
  LazySwimmingActivityPage,
  LazyWeightPage,
  LazyWeeklyReviewPage,
} from '@/app/LazyRoutePages';
import { OnboardingGuard } from '@/app/guards/OnboardingGuard';
import { OnboardingRoute } from '@/app/guards/OnboardingRoute';
import { AppLayout } from '@/app/layouts/AppLayout';
import { routePaths } from '@/app/routePaths';
import { NotFoundPage } from '@/features/foundation/pages/NotFoundPage';
import { CalculationsInformationPage } from '@/features/information/pages/CalculationsInformationPage';
import { OfflinePage } from '@/pwa/OfflinePage';

export const router = createHashRouter([
  {
    path: routePaths.onboarding,
    element: (
      <OnboardingRoute>
        <LazyOnboardingPage />
      </OnboardingRoute>
    ),
  },
  {
    path: routePaths.offline,
    element: <OfflinePage />,
  },
  {
    element: (
      <OnboardingGuard>
        <AppLayout />
      </OnboardingGuard>
    ),
    children: [
      {
        path: routePaths.dashboard,
        element: <LazyDashboardPage />,
      },
      {
        path: routePaths.profile,
        element: <LazyProfilePage />,
      },
      {
        path: routePaths.settings,
        element: <LazyAdvancedSettingsPage />,
      },
      {
        path: routePaths.food,
        element: <LazyFoodJournalPage />,
      },
      {
        path: routePaths.addFood,
        element: <LazyFoodEntryEditorPage />,
      },
      {
        path: routePaths.foodSelector,
        element: <LazyMealFoodSelectorPage />,
      },
      {
        path: routePaths.barcodeScanner,
        element: <LazyBarcodeScannerPage />,
      },
      {
        path: routePaths.editFoodEntry,
        element: <LazyFoodEntryEditorPage />,
      },
      {
        path: routePaths.foodProducts,
        element: <LazyFoodProductsPage />,
      },
      {
        path: routePaths.newFoodProduct,
        element: <LazyFoodProductEditorPage />,
      },
      {
        path: routePaths.editFoodProduct,
        element: <LazyFoodProductEditorPage />,
      },
      {
        path: routePaths.foodSearch,
        element: <LazyOpenFoodFactsSearchPage />,
      },
      {
        path: routePaths.favoriteMeals,
        element: <LazyFavoriteMealsPage />,
      },
      {
        path: routePaths.recipes,
        element: <LazyRecipesPage />,
      },
      {
        path: routePaths.newRecipe,
        element: <LazyRecipeEditorPage />,
      },
      {
        path: '/recipes/:recipeId/edit',
        element: <LazyRecipeEditorPage />,
      },
      {
        path: routePaths.addRecipeToJournal,
        element: <LazyRecipeEntryEditorPage />,
      },
      {
        path: routePaths.activities,
        element: <LazyActivityJournalPage />,
      },
      {
        path: routePaths.strengthExercises,
        element: <LazyStrengthExercisesPage />,
      },

      {
        path: routePaths.workoutSessions,
        element: <LazyWorkoutSessionsPage />,
      },
      {
        path: routePaths.workoutSession,
        element: <LazyWorkoutSessionPage />,
      },
      {
        path: routePaths.workoutTemplates,
        element: <LazyWorkoutTemplatesPage />,
      },
      {
        path: routePaths.newWorkoutTemplate,
        element: <LazyWorkoutTemplateEditorPage />,
      },
      {
        path: routePaths.editWorkoutTemplate,
        element: <LazyWorkoutTemplateEditorPage />,
      },
      {
        path: routePaths.newStrengthExercise,
        element: <LazyStrengthExerciseEditorPage />,
      },
      {
        path: routePaths.editStrengthExercise,
        element: <LazyStrengthExerciseEditorPage />,
      },
      {
        path: routePaths.strengthExerciseHistory,
        element: <LazyStrengthExerciseHistoryPage />,
      },
      {
        path: routePaths.addActivity,
        element: <LazyAddActivityPage />,
      },
      {
        path: routePaths.addRunningActivity,
        element: <LazyRunningActivityPage />,
      },
      {
        path: routePaths.addSwimmingActivity,
        element: <LazySwimmingActivityPage />,
      },
      {
        path: routePaths.addStrengthActivity,
        element: <LazyStrengthActivityPage />,
      },
      {
        path: routePaths.addOtherActivity,
        element: <LazyOtherActivityPage />,
      },
      {
        path: '/activities/:activityId/edit',
        element: <LazyEditActivityPage />,
      },
      {
        path: routePaths.weight,
        element: <LazyWeightPage />,
      },
      {
        path: routePaths.history,
        element: <LazyHistoryPage />,
      },
      {
        path: routePaths.analytics,
        element: <LazyAnalyticsPage />,
      },
      {
        path: routePaths.weeklyReview,
        element: <LazyWeeklyReviewPage />,
      },
      {
        path: routePaths.backup,
        element: <LazyBackupPage />,
      },
      {
        path: routePaths.calculationsInformation,
        element: <CalculationsInformationPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
