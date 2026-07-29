import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const user = userEvent.setup();
    render(
      <ToastProvider>
      <MemoryRouter initialEntries={['/food?date=2026-06-24']}>
        <FoodJournalPage />
      </MemoryRouter>
      </ToastProvider>,
    );

    const accessibleName = slot === 'snacks' ? 'Ajouter un aliment aux collations' : `Ajouter un aliment au ${label}`;
    const mealToggle = await screen.findByRole('button', {
      name: new RegExp(`^${slot === 'snacks' ? 'Collations' : label}`, 'i'),
    });
    if (mealToggle.getAttribute('aria-expanded') !== 'true') await user.click(mealToggle);
    await user.click(screen.getByRole('button', { name: accessibleName }));

    const dialog = await screen.findByRole('dialog', { name: 'Ajouter un repas' });
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter un élément' }));
    await user.click(within(dialog).getByRole('button', { name: /Rechercher un aliment/ }));
    const link = within(dialog).getByRole('link', { name: /Mes aliments/ });
    expect(link).toHaveAttribute('href', selectFoodPath('2026-06-24', slot, undefined, 'all'));
  });
});
