import { describe, expect, it } from 'vitest';

import dashboardCustomizationSource from '@/features/dashboard-customization/pages/DashboardCustomizationPage.tsx?raw';
import dailyInputsSource from '@/features/dashboard/components/DailyInputsPanel.tsx?raw';
import dashboardQuickActionsSource from '@/features/dashboard/components/DashboardQuickActions.tsx?raw';
import goalQuickEntrySource from '@/features/dashboard/components/GoalQuickEntryOverlay.tsx?raw';
import onboardingSource from '@/features/onboarding/pages/OnboardingPage.tsx?raw';
import actionToastSource from '@/shared/toast/useActionToast.ts?raw';

describe('feedback Dashboard et onboarding', () => {
  it.each([
    ['personnalisation du Dashboard', dashboardCustomizationSource, 'setFeedback'],
    ['saisies quotidiennes', dailyInputsSource, 'setWeightFeedback'],
    ['actions rapides du Dashboard', dashboardQuickActionsSource, 'setFeedback'],
  ])('garde un feedback local unique pour %s', (_label, source, localMarker) => {
    expect(source).not.toContain('useActionToast');
    expect(source).not.toContain('actionToast.');
    expect(source).toContain(localMarker);
    expect(source).toContain('InlineNotice');
  });

  it('réserve les toasts Objectifs aux succès qui ferment la surface', () => {
    expect(goalQuickEntrySource).toContain('useActionToast');
    expect(goalQuickEntrySource.match(/actionToast\.success/g)).toHaveLength(2);
    expect(goalQuickEntrySource).not.toContain('actionToast.error');
    expect(goalQuickEntrySource).toContain('setErrorMessage');
    expect(goalQuickEntrySource).toContain('InlineNotice');
    expect(goalQuickEntrySource).toContain('close();');
  });

  it('garde l’erreur finale onboarding locale et la révélation dédiée après navigation', () => {
    expect(onboardingSource).toContain('actionToast.success');
    expect(onboardingSource).not.toContain('actionToast.error');
    expect(onboardingSource.match(/actionToast\./g)).toHaveLength(1);
    expect(onboardingSource).toContain('setSaveError');
    expect(onboardingSource).toContain('InlineNotice');
    expect(onboardingSource).toContain('saveProfileOnboardingCompletion');
    expect(onboardingSource).toContain('navigate(routePaths.dashboard');
    expect(actionToastSource).toContain("'onboarding-profile-create'");
  });
});
