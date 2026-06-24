import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MealFoodSelectorPage } from '@/features/food-journal/pages/MealFoodSelectorPage';
import { appDatabase } from '@/infrastructure/database/database';
import { repositories } from '@/infrastructure/repositories/repositories';

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

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

describe('MealFoodSelectorPage', () => {
  it('présélectionne le repas d’origine et ajoute un aliment sans détour', async () => {
    const user = userEvent.setup();
    const product = await repositories.food.createProduct({
      name: 'Yaourt grec',
      brand: 'SportPilot',
      basisUnit: 'g',
      servingSize: 125,
      nutritionPer100: {
        caloriesKcal: 120,
        proteinGrams: 9,
        carbohydratesGrams: 4,
        fatGrams: 7,
      },
      source: { type: 'manual' },
      isNutritionComplete: true,
      isFavorite: true,
      isArchived: false,
    });
    const previousMeal = await repositories.food.getOrCreateMeal('2026-06-23', 'breakfast');
    await repositories.food.createEntry({
      date: '2026-06-23',
      mealId: previousMeal.id,
      mealSlot: 'breakfast',
      sourceType: 'product',
      reference: {
        sourceType: 'product',
        productId: product.id,
        inputMode: 'amount',
        inputQuantity: 125,
        normalizedAmount: 125,
        normalizedUnit: 'g',
        nutritionPer100Snapshot: product.nutritionPer100,
      },
    });

    render(
      <MemoryRouter initialEntries={['/food/select?date=2026-06-24&slot=breakfast']}>
        <Routes>
          <Route path="/food/select" element={<MealFoodSelectorPage />} />
          <Route path="/food" element={<p>Retour au journal réussi</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Ajouter un aliment' })).toBeInTheDocument();
    expect(screen.getByText(/Petit-déjeuner ·/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Récents (1)' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Choisir cet aliment' }));

    await waitFor(() => {
      expect(document.querySelector('#meal-selector-slot')).not.toBeNull();
      expect(document.querySelector('#meal-selector-quantity')).not.toBeNull();
    });

    const mealSelect = document.querySelector<HTMLSelectElement>('#meal-selector-slot');
    const quantity = document.querySelector<HTMLInputElement>('#meal-selector-quantity');
    expect(mealSelect).toHaveValue('breakfast');
    expect(quantity).not.toBeNull();
    await user.clear(quantity!);
    await user.type(quantity!, '80');
    await user.click(screen.getByRole('button', { name: 'Ajouter au petit-déjeuner' }));

    expect(await screen.findByText('Retour au journal réussi')).toBeInTheDocument();
    const entries = await repositories.food.listEntriesByDate('2026-06-24');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      mealSlot: 'breakfast',
      reference: {
        sourceType: 'product',
        productId: product.id,
        inputMode: 'amount',
        inputQuantity: 80,
        normalizedAmount: 80,
      },
    });
  });

  it('recherche dans tous les aliments locaux même depuis l’onglet des récents', async () => {
    const user = userEvent.setup();
    await repositories.food.createProduct({
      name: 'Riz complet',
      basisUnit: 'g',
      nutritionPer100: {
        caloriesKcal: 130,
        proteinGrams: 3,
        carbohydratesGrams: 28,
        fatGrams: 1,
      },
      source: { type: 'manual' },
      isNutritionComplete: true,
      isFavorite: false,
      isArchived: false,
    });

    render(
      <MemoryRouter initialEntries={['/food/select?date=2026-06-24&slot=lunch']}>
        <Routes>
          <Route path="/food/select" element={<MealFoodSelectorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const search = await screen.findByLabelText('Rechercher dans les aliments locaux');
    await user.type(search, 'riz');

    expect(await screen.findByRole('heading', { name: 'Riz complet' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Résultats locaux' })).toBeInTheDocument();
  });

  it('ouvre directement la recherche Open Food Facts après un échec de scan', async () => {
    render(
      <MemoryRouter initialEntries={['/food/select?date=2026-06-24&slot=lunch&source=openFoodFacts']}>
        <Routes>
          <Route path="/food/select" element={<MealFoodSelectorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Open Food Facts' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Rechercher dans Open Food Facts')).toBeInTheDocument();
  });

});
