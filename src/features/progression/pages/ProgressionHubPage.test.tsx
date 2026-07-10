import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProgressionHubPage } from '@/features/progression/pages/ProgressionHubPage';

it('regroupe les accès de progression sans modifier leurs routes historiques', () => {
  render(
    <MemoryRouter>
      <ProgressionHubPage />
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', { name: 'Progression' })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /Ajouter une pesée/ })[0]).toHaveAttribute('href', '/weight');
  expect(screen.getByRole('link', { name: /Analyses/ })).toHaveAttribute('href', '/analytics');
  expect(screen.getByRole('link', { name: /Objectifs et jalons/ })).toHaveAttribute('href', '/goals');
  expect(screen.getByRole('link', { name: /Rapports/ })).toHaveAttribute('href', '/reports');
  expect(screen.getByRole('link', { name: /Bilan hebdomadaire/ })).toHaveAttribute('href', '/weekly-review');
});
