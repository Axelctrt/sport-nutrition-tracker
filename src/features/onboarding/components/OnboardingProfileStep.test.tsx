import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { OnboardingProfileStep } from '@/features/onboarding/components/OnboardingProfileStep';
import { PROFILE_ONBOARDING_STEP_IDS } from '@/features/onboarding/profile/profileOnboardingSteps';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';

afterEach(cleanup);

describe('OnboardingProfileStep', () => {
  it('présente le sexe sous forme de cartes tactiles compactes', async () => {
    const onChange = vi.fn();
    render(<OnboardingProfileStep stepId={PROFILE_ONBOARDING_STEP_IDS.sex} values={DEFAULT_PROFILE_FORM_VALUES} errors={{}} onChange={onChange} />);
    const masculine = screen.getByRole('radio', { name: /Masculin/ });
    expect(masculine).toBeChecked();
    expect(masculine.closest('label')?.parentElement).toHaveClass('grid-cols-1');
    await userEvent.click(screen.getByRole('radio', { name: /Féminin/ }));
    expect(onChange).toHaveBeenCalledWith({ sexForEnergyEquation: 'female' });
  });

  it('réutilise la variation métier suggérée quand l’objectif change', async () => {
    const onChange = vi.fn();
    render(<OnboardingProfileStep stepId={PROFILE_ONBOARDING_STEP_IDS.goal} values={DEFAULT_PROFILE_FORM_VALUES} errors={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /Perdre/ }));
    expect(onChange).toHaveBeenCalledWith({ goal: 'loss', targetWeeklyWeightChangePercent: -0.5 });
  });

  it('utilise trois rouleaux horizontaux pour la date sans saisie manuelle', () => {
    render(<OnboardingProfileStep stepId={PROFILE_ONBOARDING_STEP_IDS.birthDate} values={{ ...DEFAULT_PROFILE_FORM_VALUES, ageMode: 'birthDate', birthDate: '2000-07-12' }} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByRole('listbox', { name: 'JJ' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'MM' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'AAAA' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'JJ' }).getAttribute('style')).toContain('--wheel-picker-height: 156px');
    expect(screen.queryByDisplayValue('2000-07-12')).not.toBeInTheDocument();
  });

  it('utilise un rouleau pour l’âge, la taille, le poids et les pas', () => {
    const { rerender } = render(<OnboardingProfileStep stepId={PROFILE_ONBOARDING_STEP_IDS.birthDate} values={DEFAULT_PROFILE_FORM_VALUES} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByRole('listbox', { name: 'Âge' })).toBeInTheDocument();

    rerender(<OnboardingProfileStep stepId={PROFILE_ONBOARDING_STEP_IDS.height} values={DEFAULT_PROFILE_FORM_VALUES} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByRole('listbox', { name: 'Taille' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Taille' })).toHaveAttribute('data-scroll-sensitivity', '1.15');

    rerender(<OnboardingProfileStep stepId={PROFILE_ONBOARDING_STEP_IDS.weight} values={DEFAULT_PROFILE_FORM_VALUES} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByRole('listbox', { name: 'Poids' })).toBeInTheDocument();

    rerender(<OnboardingProfileStep stepId={PROFILE_ONBOARDING_STEP_IDS.steps} values={DEFAULT_PROFILE_FORM_VALUES} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByRole('listbox', { name: 'Pas par jour' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /^8.?500 pas$/ })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('présente les aides comme des informations sans libellé Pourquoi', () => {
    render(<OnboardingProfileStep stepId={PROFILE_ONBOARDING_STEP_IDS.name} values={DEFAULT_PROFILE_FORM_VALUES} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByText(/Vous pourrez modifier ce nom plus tard/)).toBeInTheDocument();
    expect(screen.queryByText(/Pourquoi/)).not.toBeInTheDocument();
  });

  it('affiche les objectifs et activités sur des lignes pleine largeur', () => {
    const { rerender } = render(<OnboardingProfileStep stepId={PROFILE_ONBOARDING_STEP_IDS.goal} values={DEFAULT_PROFILE_FORM_VALUES} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Maintenir' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Variation par semaine' }).getAttribute('style')).toContain('--wheel-picker-height: 120px');
    expect(screen.getByRole('listbox', { name: 'Variation par semaine' })).toHaveAttribute('data-scroll-sensitivity', '1');
    expect(screen.getByRole('radio', { name: 'Maintenir' }).closest('label')?.querySelector('span')).toHaveClass('min-h-11');

    rerender(<OnboardingProfileStep stepId={PROFILE_ONBOARDING_STEP_IDS.activity} values={DEFAULT_PROFILE_FORM_VALUES} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /Faible/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Élevée/ })).toBeInTheDocument();
  });

  it('associe une erreur de taille au rouleau', () => {
    render(<OnboardingProfileStep stepId={PROFILE_ONBOARDING_STEP_IDS.height} values={{ ...DEFAULT_PROFILE_FORM_VALUES, heightCm: 80 }} errors={{ heightCm: 'Taille invalide' }} onChange={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Taille invalide');
    expect(screen.getByRole('listbox', { name: 'Taille' })).toHaveAttribute('aria-invalid', 'true');
  });
});
