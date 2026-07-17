import { render, screen } from '@testing-library/react';
import { OnboardingProgress } from '@/features/onboarding/components/OnboardingProgress';

describe('OnboardingProgress', () => {
  it('annonce la position courante dans un format compact', () => {
    render(<OnboardingProgress currentStep={2} totalSteps={5} />);
    expect(screen.getByText('2/5')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '5');
  });
});
