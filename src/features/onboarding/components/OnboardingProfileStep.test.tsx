import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { OnboardingProfileStep } from '@/features/onboarding/components/OnboardingProfileStep';
import { PROFILE_ONBOARDING_STEP_IDS } from '@/features/onboarding/profile/profileOnboardingSteps';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';

afterEach(cleanup);

describe('OnboardingProfileStep', () => {
  it('présente le sexe sous forme de grandes cartes tactiles', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <OnboardingProfileStep
        stepId={PROFILE_ONBOARDING_STEP_IDS.sex}
        values={DEFAULT_PROFILE_FORM_VALUES}
        errors={{}}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('radio', { name: /Masculin/ })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /Féminin/ }));
    expect(onChange).toHaveBeenCalledWith({ sexForEnergyEquation: 'female' });
  });

  it('réutilise la variation métier suggérée quand l’objectif change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <OnboardingProfileStep
        stepId={PROFILE_ONBOARDING_STEP_IDS.goal}
        values={DEFAULT_PROFILE_FORM_VALUES}
        errors={{}}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('radio', { name: /Perdre du poids/ }));
    expect(onChange).toHaveBeenCalledWith({
      goal: 'loss',
      targetWeeklyWeightChangePercent: -0.5,
    });
  });

  it('propose les valeurs rapides de pas et une saisie précise mobile', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <OnboardingProfileStep
        stepId={PROFILE_ONBOARDING_STEP_IDS.steps}
        values={DEFAULT_PROFILE_FORM_VALUES}
        errors={{}}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /10\s000/ }));
    expect(onChange).toHaveBeenCalledWith({ dailyStepGoal: 10_000 });
    expect(screen.getByLabelText(/Objectif précis/)).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText(/Objectif précis/)).toHaveAttribute('enterkeyhint', 'done');
  });

  it('affiche une erreur de taille sous le champ précis', () => {
    render(
      <OnboardingProfileStep
        stepId={PROFILE_ONBOARDING_STEP_IDS.height}
        values={{ ...DEFAULT_PROFILE_FORM_VALUES, heightCm: 80 }}
        errors={{ heightCm: 'Taille invalide' }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Taille invalide');
    expect(screen.getByLabelText(/Saisie précise en centimètres/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
