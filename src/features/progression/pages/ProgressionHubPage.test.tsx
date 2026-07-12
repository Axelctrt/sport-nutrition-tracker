import { render, screen } from '@testing-library/react';
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
    },
    refresh: vi.fn(),
  }),
}));

it('hiérarchise la synthèse, les décisions et les accès historiques sans modifier les routes', () => {
  render(
    <MemoryRouter>
      <ProgressionHubPage />
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', { name: 'Progression' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'À retenir cette semaine' })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /Ajouter une pesée/ })[0]).toHaveAttribute('href', '/weight');
  expect(screen.getAllByRole('link', { name: /Analyses/ })[0]).toHaveAttribute('href', '/analytics');
  expect(screen.getByRole('link', { name: /Rapports/ })).toHaveAttribute('href', '/reports');
  expect(screen.getByRole('link', { name: /Bilan hebdomadaire/ })).toHaveAttribute('href', '/weekly-review');
  expect(screen.getAllByRole('link', { name: /Objectifs et jalons/ })[0]).toHaveAttribute('href', '/goals');
});
