import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { OnboardingProfileSummary } from '@/features/onboarding/components/OnboardingProfileSummary';
import { PROFILE_ONBOARDING_STEP_IDS } from '@/features/onboarding/profile/profileOnboardingSteps';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';

afterEach(cleanup);

describe('OnboardingProfileSummary', () => {
  it('récapitule le mode local et toutes les informations du profil', () => {
    render(
      <OnboardingProfileSummary
        values={{
          ...DEFAULT_PROFILE_FORM_VALUES,
          firstName: 'Axel',
          dailyStepGoal: 10_000,
        }}
        dataSpaceKind="guest"
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText('Mode local')).toBeInTheDocument();
    expect(screen.getByText('Axel')).toBeInTheDocument();
    expect(screen.getByText('70 kg')).toBeInTheDocument();
    expect(screen.getByText('10 000 pas')).toBeInTheDocument();
    expect(screen.getByLabelText('Informations du profil')).toHaveClass('grid-cols-1');
    expect(screen.getByText('Axel')).not.toHaveClass('truncate');
  });

  it('affiche le pseudonyme du compte et ouvre l’étape demandée', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <OnboardingProfileSummary
        values={DEFAULT_PROFILE_FORM_VALUES}
        dataSpaceKind="account"
        socialHandle="@axel.run"
        onEdit={onEdit}
      />,
    );

    expect(screen.getByText('Compte · @axel.run')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Modifier le poids' }));
    expect(onEdit).toHaveBeenCalledWith(PROFILE_ONBOARDING_STEP_IDS.weight);
  });
});
