import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileImpactHistory } from '@/features/profile/components/ProfileImpactHistory';

afterEach(cleanup);

describe('ProfileImpactHistory', () => {
  it('reste absent sans historique et affiche une entrée récente', () => {
    const { rerender } = render(<ProfileImpactHistory entries={[]} />);
    expect(screen.queryByRole('heading', { name: 'Changements récents du profil' })).not.toBeInTheDocument();

    rerender(
      <ProfileImpactHistory
        entries={[{
          id: 'impact-1',
          changedAt: '2026-07-10T09:00:00.000Z',
          effectiveDate: '2026-07-10',
          changedFields: ['goal'],
          summary: 'La modification a changé les objectifs nutritionnels calculés pour la journée.',
          beforeTargetCaloriesKcal: 2400,
          afterTargetCaloriesKcal: 2180,
          beforeMacros: { proteinGrams: 108, carbohydratesGrams: 322, fatGrams: 54 },
          afterMacros: { proteinGrams: 108, carbohydratesGrams: 267, fatGrams: 54 },
        }]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Changements récents du profil' })).toBeInTheDocument();
    expect(screen.getByText(/2 400 → 2 180 kcal/)).toBeInTheDocument();
  });
});
