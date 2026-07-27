import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  barcodeScannerPath,
  favoriteMealsForMealPath,
  newFoodProductForMealPath,
  photoNutritionEstimatePath,
  recipesForMealPath,
  selectFoodPath,
} from '@/app/routePaths';
import { FoodJournalAddSheet } from '@/features/food-journal/components/FoodJournalAddSheet';

const navigationStates = new Map();

describe('FoodJournalAddSheet', () => {
  it('présélectionne le dîner le soir puis propose chaque parcours canonique', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FoodJournalAddSheet
          open
          date="2026-07-10"
          currentHour={20}
          entryCounts={{ breakfast: 0, lunch: 2, dinner: 0, snacks: 0 }}
          navigationStates={navigationStates}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('radio', { name: /Dîner/ })).toBeChecked();
    expect(screen.queryByRole('link', { name: /Scanner un produit/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    const expectedLinks = [
      ['Rechercher un aliment', selectFoodPath('2026-07-10', 'dinner')],
      ['Scanner un produit', barcodeScannerPath('2026-07-10', 'dinner')],
      ['Utiliser un aliment récent', selectFoodPath('2026-07-10', 'dinner', undefined, 'recent')],
      ['Utiliser un repas favori', favoriteMealsForMealPath('2026-07-10', 'dinner')],
      ['Utiliser une recette', recipesForMealPath('2026-07-10', 'dinner')],
      ['Photo du repas', photoNutritionEstimatePath('2026-07-10', 'dinner')],
      ['Saisie manuelle', newFoodProductForMealPath('2026-07-10', 'dinner')],
    ] as const;
    for (const [label, path] of expectedLinks) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toHaveAttribute('href', path);
    }
  });

  it('respecte le choix manuel d’un autre repas et permet de revenir à la première étape', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FoodJournalAddSheet
          open
          date="2026-07-10"
          currentHour={20}
          navigationStates={navigationStates}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('radio', { name: /Petit-déjeuner/ }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('link', { name: /Rechercher un aliment/ })).toHaveAttribute(
      'href',
      selectFoodPath('2026-07-10', 'breakfast'),
    );

    await user.click(screen.getByRole('button', { name: 'Choisir un autre repas' }));
    expect(screen.getByRole('radio', { name: /Petit-déjeuner/ })).toBeChecked();
  });
});
