import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { selectFoodPath } from '@/app/routePaths';
import { FoodJournalPage } from '@/features/food-journal/pages/FoodJournalPage';
import { appDatabase } from '@/infrastructure/database/database';
import { ToastProvider } from '@/shared/toast/ToastProvider';

beforeEach(async () => {
  appDatabase.close();
  await appDatabase.delete();
  await appDatabase.open();
});

afterEach(async () => {
  cleanup();
  appDatabase.close();
  await appDatabase.delete();
});

describe('FoodJournalPage — accès au sélecteur', () => {
  it.each([
    ['petit-déjeuner', 'breakfast'],
    ['déjeuner', 'lunch'],
    ['dîner', 'dinner'],
    ['collations', 'snacks'],
  ] as const)('ouvre le sélecteur depuis le %s avec le bon repas', async (label, slot) => {
    render(
      <ToastProvider>
      <MemoryRouter initialEntries={['/food?date=2026-06-24']}>
        <FoodJournalPage />
      </MemoryRouter>
      </ToastProvider>,
    );

    const accessibleName = slot === 'snacks' ? 'Ajouter un aliment aux collations' : `Ajouter un aliment au ${label}`;
    const link = await screen.findByRole('link', { name: accessibleName });
    expect(link).toHaveAttribute('href', selectFoodPath('2026-06-24', slot));
  });
});
