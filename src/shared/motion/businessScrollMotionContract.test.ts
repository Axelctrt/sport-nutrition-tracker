import { describe, expect, it } from 'vitest';

import activityJournalSource from '@/features/activities/pages/ActivityJournalPage.tsx?raw';
import dailyCheckInSource from '@/features/dashboard/components/DailyCheckInSheet.tsx?raw';
import dailyContextFlagsSource from '@/features/dashboard/components/DailyContextFlagsField.tsx?raw';
import enduranceTemplatesSource from '@/features/endurance-templates/pages/EnduranceTemplatesPage.tsx?raw';
import foodJournalSource from '@/features/food-journal/pages/FoodJournalPage.tsx?raw';
import onboardingSource from '@/features/onboarding/pages/OnboardingPage.tsx?raw';
import foodProductsSource from '@/features/products/pages/FoodProductsPage.tsx?raw';
import profileSource from '@/features/profile/pages/ProfilePage.tsx?raw';
import recipesSource from '@/features/recipes/pages/RecipesPage.tsx?raw';
import unifiedSyncCenterSource from '@/features/settings/components/unifiedSyncCenterModel.ts?raw';
import advancedSettingsSource from '@/features/settings/pages/AdvancedSettingsPage.tsx?raw';
import settingsNavigationSource from '@/features/settings/settingsSectionNavigation.ts?raw';
import strengthExercisesSource from '@/features/strength-exercises/pages/StrengthExercisesPage.tsx?raw';
import weeklyPlanningSource from '@/features/strength-planning/pages/WeeklyPlanningPage.tsx?raw';
import workoutTemplateSource from '@/features/strength-templates/components/WorkoutTemplateForm.tsx?raw';
import syncPrototypeSource from '@/features/sync-prototype/pages/SyncPrototypePage.tsx?raw';
import weightSource from '@/features/weight/pages/WeightPage.tsx?raw';
import bottomSheetSource from '@/shared/ui/BottomSheet.tsx?raw';
import collapsibleSectionSource from '@/shared/ui/CollapsibleSection.tsx?raw';
import animatedTabsSource from '@/shared/ui/SportPilotAnimatedTabs.tsx?raw';
import wheelPickerSource from '@/shared/ui/WheelPicker.tsx?raw';

const DIRECT_FORCED_SMOOTH = /behavior\s*:\s*['"]smooth['"]/;

const elementContexts = [
  ['journal d’activité', activityJournalSource, 'activity-entry-${highlightedActivityId}', "block: 'nearest'"],
  ['aliment surligné', foodProductsSource, 'food-product-${highlightedProductId}', "block: 'nearest'"],
  ['recette surlignée', recipesSource, 'recipe-${highlightedRecipeId}', "block: 'nearest'"],
  ['détail de synchronisation', unifiedSyncCenterSource, 'document.getElementById(detailId)', "block: 'start'"],
  ['exercice de force', strengthExercisesSource, 'strength-exercise-${highlightedExerciseId}', "block: 'center'"],
  ['séance du planning', weeklyPlanningSource, 'planning-session-${requestedSessionId}', "block: 'center'"],
  ['section à venir du planning', weeklyPlanningSource, 'weekly-planning-upcoming', "block: 'start'"],
  ['exercice du modèle', workoutTemplateSource, 'workout-template-exercise-card-${highlightedExerciseId}', "block: 'center'"],
  ['éditeur de pesée prototype', syncPrototypeSource, 'weightEditorRef.current', "block: 'start'"],
  ['formulaire de poids', weightSource, 'weight-entry-panel', "block: 'start'"],
] as const;

const alreadyMotionAwareSources = [
  ['check-in quotidien', dailyCheckInSource],
  ['drapeaux de contexte quotidien', dailyContextFlagsSource],
  ['journal alimentaire', foodJournalSource],
  ['onboarding', onboardingSource],
  ['profil', profileSource],
  ['réglages avancés', advancedSettingsSource],
  ['navigation des réglages', settingsNavigationSource],
  ['bottom sheet', bottomSheetSource],
  ['section repliable', collapsibleSectionSource],
  ['onglets animés', animatedTabsSource],
  ['sélecteur à roue', wheelPickerSource],
] as const;

describe('contrat de mouvement réduit des scrolls métier', () => {
  it.each(elementContexts)(
    'délègue le contexte %s à revealElement sans perdre sa destination',
    (_label, source, targetToken, blockToken) => {
      expect(source).toContain("from '@/shared/motion/revealElement'");
      expect(source).toContain(targetToken);
      expect(source).toContain(blockToken);
      expect(source).not.toMatch(DIRECT_FORCED_SMOOTH);
    },
  );

  it('conserve le scroll fenêtre d’Endurance en haut de page', () => {
    expect(enduranceTemplatesSource).toContain('getMotionSafeScrollBehavior');
    expect(enduranceTemplatesSource).toContain(
      'window.scrollTo({ top: 0, behavior: getMotionSafeScrollBehavior() })',
    );
    expect(enduranceTemplatesSource).not.toMatch(DIRECT_FORCED_SMOOTH);
  });

  it('préserve l’ordre scroll puis focus des deux parcours qui le requièrent', () => {
    expect(syncPrototypeSource.indexOf('revealElement(weightEditorRef.current'))
      .toBeLessThan(syncPrototypeSource.indexOf('weightInputRef.current?.focus'));
    const upcomingSection = weeklyPlanningSource.slice(
      weeklyPlanningSource.indexOf("document.getElementById('weekly-planning-upcoming')"),
    );
    expect(upcomingSection.indexOf("revealElement(target, { block: 'start' })"))
      .toBeLessThan(upcomingSection.indexOf('target.focus({ preventScroll: true })'));
  });

  it.each(alreadyMotionAwareSources)(
    'laisse le contexte déjà conforme %s sensible à prefers-reduced-motion',
    (_label, source) => {
      expect(source).toContain('prefers-reduced-motion: reduce');
    },
  );
});
