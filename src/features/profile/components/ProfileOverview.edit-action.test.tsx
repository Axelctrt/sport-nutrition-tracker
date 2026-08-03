import { render, screen, within } from '@testing-library/react';

import type { CurrentWeightResolution } from '@/application/weight/currentWeightService';
import { ProfileOverview } from '@/features/profile/components/ProfileOverview';
import { createProfileInput } from '@/test/factories/profileFactory';

const profile = {
  ...createProfileInput(),
  id: 'profile-1',
  createdAt: '2026-07-10T08:00:00.000Z',
  updatedAt: '2026-07-10T08:00:00.000Z',
};

const currentWeight = {
  source: 'entry',
  weightKg: 59.8,
  measuredAt: '2026-07-10',
  entry: {
    id: 'weight:2026-07-10',
    date: '2026-07-10',
    weightKg: 59.8,
    createdAt: '2026-07-10T08:00:00.000Z',
    updatedAt: '2026-07-10T08:00:00.000Z',
  },
} as CurrentWeightResolution;

describe('ProfileOverview action d’édition', () => {
  it('place le crayon accessible dans l’en-tête supérieur droit de la carte Profil', () => {
    render(
      <ProfileOverview
        profile={profile}
        currentWeight={currentWeight}
        action={(
          <button type="button" aria-label="Modifier le profil">
            <svg aria-hidden="true" />
          </button>
        )}
      />,
    );

    const card = screen.getByLabelText('Résumé du profil');
    const cardHeader = card.firstElementChild;
    const editButton = within(card).getByRole('button', { name: 'Modifier le profil' });

    expect(cardHeader).toHaveClass('justify-between');
    expect(cardHeader).toContainElement(editButton);
    expect(editButton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
