import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { MealJournalSnapshot } from '@/application/food/foodJournalService';
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

const dinnerWithFood = [{
  slot: 'dinner',
  meal: undefined,
  totals: {
    caloriesKcal: 132,
    proteinGrams: 12,
    carbohydratesGrams: 9,
    fatGrams: 5,
    entryCount: 1,
  },
  entries: [{
    entry: {
      id: 'entry-yogurt',
      date: '2026-07-10',
      mealSlot: 'dinner',
      reference: {
        sourceType: 'product',
        productId: 'product-yogurt',
        inputMode: 'amount',
        inputQuantity: 150,
        normalizedAmount: 150,
        normalizedUnit: 'g',
      },
    },
    product: { name: 'Yaourt grec' },
    recipe: undefined,
    nutrition: {
      caloriesKcal: 132,
      proteinGrams: 12,
      carbohydratesGrams: 9,
      fatGrams: 5,
    },
  }],
}] as unknown as readonly MealJournalSnapshot[];

describe('FoodJournalAddSheet', () => {
  it('ouvre le contenu du repas puis propose toutes les methodes d ajout', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FoodJournalAddSheet
          open
          date="2026-07-10"
          currentHour={20}
          entryCounts={{ breakfast: 0, lunch: 2, dinner: 0, snacks: 0 }}
          meals={[]}
          navigationStates={navigationStates}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    const dinner = screen.getByRole('radio', { name: /Dîner/ });
    expect(dinner).toBeChecked();
    await user.click(dinner);

    expect(screen.getByRole('button', { name: 'Terminer le repas' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ajouter un élément' }));

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

  it('affiche les elements deja ajoutes et laisse l utilisateur terminer', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <MemoryRouter>
        <FoodJournalAddSheet
          open
          date="2026-07-10"
          initialSlot="dinner"
          initialStep="overview"
          meals={dinnerWithFood}
          navigationStates={navigationStates}
          onFinish={onFinish}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Yaourt grec')).toBeInTheDocument();
    expect(screen.getByText('150 g')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter un autre élément' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Terminer le repas' }));
    expect(onFinish).toHaveBeenCalledWith('dinner');
  });

  it('synchronise overview, methodes et retour au repas', async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    render(
      <MemoryRouter>
        <FoodJournalAddSheet
          open
          date="2026-07-10"
          initialSlot="dinner"
          initialStep="method"
          meals={[]}
          navigationStates={navigationStates}
          onStepChange={onStepChange}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Scanner un produit/ })).toHaveAttribute(
      'href',
      barcodeScannerPath('2026-07-10', 'dinner'),
    );

    await user.click(screen.getByRole('button', { name: 'Retour au repas' }));
    expect(onStepChange).toHaveBeenCalledWith('overview', 'dinner');
    expect(screen.getByRole('button', { name: 'Terminer le repas' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Choisir un autre repas' }));
    expect(onStepChange).toHaveBeenLastCalledWith('meal', 'dinner');
    expect(screen.getByRole('radio', { name: /Dîner/ })).toBeChecked();
  });
});
