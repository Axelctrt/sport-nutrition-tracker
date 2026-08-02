import { createHashRouter, type RouteObject } from 'react-router-dom';
import {
  LazyAddActivityPage,
  LazyAdvancedSettingsPage,
  LazySettingsCategoryPage,
  LazySettingsHomePage,
  LazyAccountDevicesPage,
  LazyRoutineRemindersPage,
  LazyActivityJournalPage,
  LazyAnalyticsPage,
  LazyTrashPage,
  LazyBackupPage,
  LazyBarcodeScannerPage,
  LazyPhotoNutritionEstimatePage,
  LazyDashboardPage,
  LazyGlobalSearchPage,
  LazyDashboardCustomizationPage,
  LazyEditActivityPage,
  LazyEnduranceTemplatesPage,
  LazyFavoriteMealsPage,
  LazyFriendsPrivacyPage,
  LazyFoodEntryEditorPage,
  LazyFoodJournalPage,
  LazyFoodProductEditorPage,
  LazyFoodProductsPage,
  LazyHistoryPage,
  LazyMealFoodSelectorPage,
  LazyOnboardingPage,
  LazyOpenFoodFactsSearchPage,
  LazyOtherActivityPage,
  LazyProfilePage,
  LazyProgressReportsPage,
  LazyGoalsPage,
  LazyPrivacyPage,
  LazyRecipeEditorPage,
  LazyRecipeEntryEditorPage,
  LazyRecipesPage,
  LazyRunningActivityPage,
  LazyStrengthActivityPage,
  LazyStrengthExerciseEditorPage,
  LazyStrengthExerciseHistoryPage,
  LazyStrengthExercisesPage,
  LazySwimmingActivityPage,
  LazyWeeklyPlanningPage,
  LazyRewardsCenterPage,
  LazyWeeklyReviewPage,
  LazyWeightPage,
  LazyWorkoutSessionPage,
  LazyWorkoutSessionsPage,
  LazyWorkoutTemplateEditorPage,
  LazyWorkoutTemplatesPage,
} from '@/app/LazyRoutePages';
import { AppRouteErrorPage } from '@/app/errors/AppRouteErrorPage';
import { OnboardingGuard } from '@/app/guards/OnboardingGuard';
import { OnboardingRoute } from '@/app/guards/OnboardingRoute';
import { AppLayout } from '@/app/layouts/AppLayout';
import { routePaths } from '@/app/routePaths';
import { getSyncPrototypeRoutes } from '@/app/syncPrototypeRoutes';
import { NotFoundPage } from '@/features/foundation/pages/NotFoundPage';
import {
  LazyProgressionWithPhotosPage,
  LazyProgressPhotoComparePage,
  LazyProgressPhotosPage,
} from '@/features/progress-photos/ProgressPhotoRoutes';
import { CalculationsInformationPage } from '@/features/information/pages/CalculationsInformationPage';
import { OfflinePage } from '@/pwa/OfflinePage';

export const appShellRoutes: RouteObject[] = [
  { path: routePaths.dashboard, element: <LazyDashboardPage /> },
  {
    path: routePaths.search,
    element: <LazyGlobalSearchPage />,
  },
  { path: routePaths.profile, element: <LazyProfilePage /> },
  { path: routePaths.settings, element: <LazySettingsHomePage /> },
  { path: routePaths.settingsProfileObjectives, element: <LazySettingsCategoryPage /> },
  { path: routePaths.settingsAccountSync, element: <LazySettingsCategoryPage /> },
  { path: routePaths.settingsPrivacyFriends, element: <LazySettingsCategoryPage /> },
  { path: routePaths.settingsAppearanceAccessibility, element: <LazySettingsCategoryPage /> },
  { path: routePaths.settingsNotificationsRoutines, element: <LazySettingsCategoryPage /> },
  { path: routePaths.settingsNutritionCalculations, element: <LazySettingsCategoryPage /> },
  { path: routePaths.settingsAiPermissions, element: <LazySettingsCategoryPage /> },
  { path: routePaths.settingsDataBackup, element: <LazySettingsCategoryPage /> },
  { path: routePaths.settingsAbout, element: <LazySettingsCategoryPage /> },
  { path: routePaths.settingsAdvanced, element: <LazyAdvancedSettingsPage /> },
  { path: routePaths.reminders, element: <LazyRoutineRemindersPage /> },
  { path: routePaths.dashboardCustomization, element: <LazyDashboardCustomizationPage /> },
  ...getSyncPrototypeRoutes(),
  { path: routePaths.accountDevices, element: <LazyAccountDevicesPage /> },
  { path: routePaths.food, element: <LazyFoodJournalPage /> },
  { path: routePaths.addFood, element: <LazyFoodEntryEditorPage /> },
  { path: routePaths.foodSelector, element: <LazyMealFoodSelectorPage /> },
  { path: routePaths.barcodeScanner, element: <LazyBarcodeScannerPage /> },
  { path: routePaths.photoNutritionEstimate, element: <LazyPhotoNutritionEstimatePage /> },
  { path: routePaths.editFoodEntry, element: <LazyFoodEntryEditorPage /> },
  { path: routePaths.foodProducts, element: <LazyFoodProductsPage /> },
  { path: routePaths.newFoodProduct, element: <LazyFoodProductEditorPage /> },
  { path: routePaths.editFoodProduct, element: <LazyFoodProductEditorPage /> },
  { path: routePaths.foodSearch, element: <LazyOpenFoodFactsSearchPage /> },
  { path: routePaths.favoriteMeals, element: <LazyFavoriteMealsPage /> },
  { path: routePaths.recipes, element: <LazyRecipesPage /> },
  { path: routePaths.newRecipe, element: <LazyRecipeEditorPage /> },
  { path: routePaths.editRecipe, element: <LazyRecipeEditorPage /> },
  { path: routePaths.addRecipeToJournal, element: <LazyRecipeEntryEditorPage /> },
  { path: routePaths.activities, element: <LazyActivityJournalPage /> },
  { path: routePaths.enduranceTemplates, element: <LazyEnduranceTemplatesPage /> },
  { path: routePaths.strengthExercises, element: <LazyStrengthExercisesPage /> },
  { path: routePaths.workoutSessions, element: <LazyWorkoutSessionsPage /> },
  { path: routePaths.weeklyPlanning, element: <LazyWeeklyPlanningPage /> },
  { path: routePaths.workoutSession, element: <LazyWorkoutSessionPage /> },
  { path: routePaths.workoutTemplates, element: <LazyWorkoutTemplatesPage /> },
  { path: routePaths.newWorkoutTemplate, element: <LazyWorkoutTemplateEditorPage /> },
  { path: routePaths.editWorkoutTemplate, element: <LazyWorkoutTemplateEditorPage /> },
  { path: routePaths.newStrengthExercise, element: <LazyStrengthExerciseEditorPage /> },
  { path: routePaths.editStrengthExercise, element: <LazyStrengthExerciseEditorPage /> },
  { path: routePaths.strengthExerciseHistory, element: <LazyStrengthExerciseHistoryPage /> },
  { path: routePaths.addActivity, element: <LazyAddActivityPage /> },
  { path: routePaths.addRunningActivity, element: <LazyRunningActivityPage /> },
  { path: routePaths.addSwimmingActivity, element: <LazySwimmingActivityPage /> },
  { path: routePaths.addStrengthActivity, element: <LazyStrengthActivityPage /> },
  { path: routePaths.addOtherActivity, element: <LazyOtherActivityPage /> },
  { path: routePaths.editActivity, element: <LazyEditActivityPage /> },
  { path: routePaths.progression, element: <LazyProgressionWithPhotosPage /> },
  { path: routePaths.progressPhotos, element: <LazyProgressPhotosPage /> },
  { path: routePaths.progressPhotoCompare, element: <LazyProgressPhotoComparePage /> },
  { path: routePaths.weight, element: <LazyWeightPage /> },
  { path: routePaths.history, element: <LazyHistoryPage /> },
  { path: routePaths.analytics, element: <LazyAnalyticsPage /> },
  { path: routePaths.reports, element: <LazyProgressReportsPage /> },
  { path: routePaths.weeklyReview, element: <LazyWeeklyReviewPage /> },
  { path: routePaths.rewards, element: <LazyRewardsCenterPage /> },
  { path: routePaths.friends, element: <LazyFriendsPrivacyPage /> },
  { path: routePaths.backup, element: <LazyBackupPage /> },
  { path: routePaths.trash, element: <LazyTrashPage /> },
  { path: routePaths.calculationsInformation, element: <CalculationsInformationPage /> },
  {
    path: routePaths.goals,
    element: <LazyGoalsPage />,
  },
];

const routeErrorElement = <AppRouteErrorPage />;

export const router = createHashRouter([
  {
    path: routePaths.onboarding,
    errorElement: routeErrorElement,
    element: (
      <OnboardingRoute>
        <LazyOnboardingPage />
      </OnboardingRoute>
    ),
  },
  {
    path: routePaths.privacy,
    errorElement: routeErrorElement,
    element: <LazyPrivacyPage />,
  },
  {
    path: routePaths.offline,
    errorElement: routeErrorElement,
    element: <OfflinePage />,
  },
  {
    errorElement: routeErrorElement,
    element: (
      <OnboardingGuard>
        <AppLayout />
      </OnboardingGuard>
    ),
    children: appShellRoutes,
  },
  {
    path: '*',
    errorElement: routeErrorElement,
    element: <NotFoundPage />,
  },
]);
