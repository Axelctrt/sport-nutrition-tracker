import { render, screen } from '@testing-library/react';
import { ProfileOverview } from '@/features/profile/components/ProfileOverview';
import { createProfileInput } from '@/test/factories/profileFactory';

const profile = {
  ...createProfileInput({
    goal: 'gain',
    initialWeightKg: 60.5,
    dailyStepGoal: 12_000,
    proteinGramsPerKg: 1.9,
    fatGramsPerKg: 0.8,
  }),
  id: 'profile-1',
  createdAt: '2026-06-25T08:00:00.000Z',
  updatedAt: '2026-06-25T08:00:00.000Z',
};

describe('ProfileOverview', () => {
  it('regroupe les indicateurs principaux du profil', () => {
    render(<ProfileOverview profile={profile} />);

    expect(screen.getByLabelText('Résumé du profil')).toBeInTheDocument();
    expect(screen.getByText('Prise de poids')).toBeInTheDocument();
    expect(screen.getByText(/60,5 kg/)).toBeInTheDocument();
    expect(screen.getByText(/12[\s ]000/)).toBeInTheDocument();
    expect(screen.getByText(/1,9 g\/kg prot/)).toBeInTheDocument();
  });
});
