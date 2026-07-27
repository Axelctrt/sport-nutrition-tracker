import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProgressionHubPage } from '@/features/progression/pages/ProgressionHubPage';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createEntity } from '@/shared/utils/entities';

const profile = createEntity(createProfileInput());

vi.mock('@/app/providers/profile/useProfile', () => ({
  useProfile: () => ({ profile }),
}));

vi.mock('@/features/progression/hooks/useProgressionHubSummary', () => ({
  useProgressionHubSummary: () => ({
    status: 'ready',
    data: {
      activity: { sessionCount: 0, totalMinutes: 0, recordedStepDays: 0 },
      weight: { state: 'empty' },
      goal: { state: 'empty' },
      review: { state: 'empty' },
    },
    refresh: vi.fn(),
  }),
}));

it('hiérarchise évolution, bilan et objectifs sans mettre les récompenses au premier niveau', () => {
  render(
    <MemoryRouter>
      <ProgressionHubPage />
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', { name: 'Progression' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Mon évolution' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Ajouter une pesée/ })).toHaveAttribute('href', '/weight');
  expect(screen.getByRole('link', { name: /Voir les tendances/ })).toHaveAttribute('href', '/analytics');
  expect(screen.getByRole('link', { name: /Ouvrir le bilan/ })).toHaveAttribute('href', '/weekly-review');
  expect(screen.getByRole('link', { name: /Voir mes objectifs/ })).toHaveAttribute('href', '/goals');
  expect(screen.queryByRole('link', { name: 'Récompenses' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Plus d’outils de progression' }));
  expect(screen.getByRole('link', { name: 'Rapports' })).toHaveAttribute('href', '/reports');
  expect(screen.getByRole('link', { name: 'Historique détaillé' })).toHaveAttribute('href', '/history');
  expect(screen.getByRole('link', { name: 'Récompenses' })).toHaveAttribute('href', '/rewards');
});
