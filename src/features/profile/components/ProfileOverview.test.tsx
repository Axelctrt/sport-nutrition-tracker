import { render, screen, within } from '@testing-library/react';
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

const currentWeight = {
  source: 'entry' as const,
  weightKg: 59.8,
  measuredAt: '2026-07-10',
  entry: {
    id: 'weight:2026-07-10',
    date: '2026-07-10',
    weightKg: 59.8,
    createdAt: '2026-07-10T08:00:00.000Z',
    updatedAt: '2026-07-10T08:00:00.000Z',
  },
};

describe('ProfileOverview', () => {
  it('regroupe les indicateurs principaux du profil', () => {
    render(
      <ProfileOverview
        profile={profile}
        currentWeight={currentWeight}
      />,
    );

    expect(screen.getByLabelText('Résumé du profil')).toBeInTheDocument();
    expect(screen.getByText('Prise de poids')).toBeInTheDocument();
    expect(screen.getByText(/59,8 kg/)).toBeInTheDocument();
    expect(screen.getByText('Pesée du 10/07/2026')).toBeInTheDocument();
    expect(screen.getByText(/12[\s ]000/)).toBeInTheDocument();
    expect(screen.getByText(/1,9 g\/kg prot/)).toBeInTheDocument();
  });

  it('place l’action Modifier le profil dans l’angle supérieur droit de la carte', () => {
    render(
      <ProfileOverview
        profile={profile}
        currentWeight={currentWeight}
        action={<button type="button" aria-label="Modifier le profil" />}
      />,
    );

    const card = screen.getByLabelText('Résumé du profil');
    const heading = within(card).getByRole('heading', { name: 'Profil', level: 2 });
    const editButton = within(card).getByRole('button', { name: 'Modifier le profil' });
    const actionRow = heading.parentElement;

    expect(actionRow).toHaveClass('items-start', 'justify-between');
    expect(editButton.parentElement).toHaveClass('shrink-0');
    expect(actionRow).toContainElement(editButton);
  });
});
