import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RewardsCenterPage } from '@/features/rewards/pages/RewardsCenterPage';

vi.mock(
  '@/features/dashboard/components/DashboardWeeklyMissions',
  () => ({
    DashboardWeeklyMissions: () => <section>Missions de la semaine</section>,
  }),
);

vi.mock('@/features/settings/components/ConsistencyStreakPanel', () => ({
  ConsistencyStreakPanel: () => <section>Séries de régularité</section>,
}));

vi.mock('@/features/settings/components/AchievementsPanel', () => ({
  AchievementsPanel: () => <section>Accomplissements</section>,
}));

vi.mock('@/features/settings/components/RewardThemesPanel', () => ({
  RewardThemesPanel: () => <section>Thèmes récompenses</section>,
}));

describe('RewardsCenterPage', () => {
  it('regroupe toutes les briques existantes du centre de récompenses', () => {
    render(<RewardsCenterPage />);

    expect(
      screen.getByRole('heading', { name: 'Centre de récompenses' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Missions de la semaine')).toBeInTheDocument();
    expect(screen.getByText('Séries de régularité')).toBeInTheDocument();
    expect(screen.getByText('Accomplissements')).toBeInTheDocument();
    expect(screen.getByText('Thèmes récompenses')).toBeInTheDocument();
  });
});
