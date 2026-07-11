import { render, screen } from '@testing-library/react';
import { OnboardingProgress } from '@/features/onboarding/components/OnboardingProgress';

describe('OnboardingProgress', () => {
  it('annonce la position courante sans dépendre uniquement de la couleur', () => {
    render(<OnboardingProgress currentStep={2} totalSteps={5} />);

    expect(screen.getByText('Étape 2 sur 5')).toBeInTheDocument();
    expect(screen.getByText('40 %')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '5');
  });
});
