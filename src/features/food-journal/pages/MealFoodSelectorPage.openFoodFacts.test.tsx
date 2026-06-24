import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import { openFoodFactsClient } from '@/infrastructure/open-food-facts/OpenFoodFactsClient';
import { OpenFoodFactsError } from '@/infrastructure/open-food-facts/OpenFoodFactsError';
import { MealFoodSelectorPage } from '@/features/food-journal/pages/MealFoodSelectorPage';
import { appDatabase } from '@/infrastructure/database/database';
import { repositories } from '@/infrastructure/repositories/repositories';

const candidate: OpenFoodFactsProductCandidate = {
  barcode: '3017620422003',
  name: 'Pâte à tartiner noisettes',
  brand: 'Exemple',
  basisUnit: 'g',
  servingSize: 15,
  nutritionPer100: {
    caloriesKcal: 539,
    proteinGrams: 6.3,
    carbohydratesGrams: 57.5,
    fatGrams: 30.9,
  },
  isNutritionComplete: true,
  missingNutritionFields: [],
  fetchedAt: '2026-06-24T12:00:00.000Z',
};

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

beforeEach(async () => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
  appDatabase.close();
  await appDatabase.delete();
  await appDatabase.open();
});

afterEach(async () => {
  cleanup();
  appDatabase.close();
  await appDatabase.delete();
});

function renderSelector() {
  render(
    <MemoryRouter initialEntries={['/food/select?date=2026-06-24&slot=lunch']}>
      <Routes>
        <Route path="/food/select" element={<MealFoodSelectorPage />} />
        <Route path="/food" element={<p>Retour au journal réussi</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MealFoodSelectorPage — Open Food Facts intégré', () => {
  it('recherche, enregistre puis ajoute un produit directement au repas présélectionné', async () => {
    const user = userEvent.setup();
    vi.spyOn(openFoodFactsClient, 'searchProducts').mockResolvedValue({
      products: [candidate],
      totalCount: 1,
    });
    renderSelector();

    await user.click(await screen.findByRole('button', { name: 'Open Food Facts' }));
    await user.type(screen.getByLabelText('Rechercher dans Open Food Facts'), 'pâte noisettes');
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(await screen.findByText('1 correspondance, 12 maximum affichées')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer et choisir' }));

    const localProduct = await waitFor(async () => {
      const product = await repositories.food.findProductByBarcode(candidate.barcode);
      expect(product).toBeDefined();
      return product;
    });
    expect(localProduct?.source.type).toBe('openFoodFacts');

    const mealSelect = await waitFor(() => document.querySelector<HTMLSelectElement>('#meal-selector-slot'));
    const quantity = document.querySelector<HTMLInputElement>('#meal-selector-quantity');
    expect(mealSelect).toHaveValue('lunch');
    expect(quantity).not.toBeNull();

    await user.clear(quantity!);
    await user.type(quantity!, '20');
    await user.click(screen.getByRole('button', { name: 'Ajouter au déjeuner' }));

    expect(await screen.findByText('Retour au journal réussi')).toBeInTheDocument();
    const entries = await repositories.food.listEntriesByDate('2026-06-24');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      mealSlot: 'lunch',
      reference: {
        sourceType: 'product',
        productId: localProduct?.id,
        inputQuantity: 20,
        normalizedAmount: 20,
      },
    });
  });

  it('explique que la recherche externe est indisponible hors connexion', async () => {
    const user = userEvent.setup();
    const searchSpy = vi.spyOn(openFoodFactsClient, 'searchProducts');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    renderSelector();

    await user.click(await screen.findByRole('button', { name: 'Open Food Facts' }));
    await user.type(screen.getByLabelText('Rechercher dans Open Food Facts'), 'yaourt');
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(await screen.findByText(/nécessite une connexion Internet/i)).toBeInTheDocument();
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('affiche l’erreur externe sans masquer les sources locales', async () => {
    const user = userEvent.setup();
    vi.spyOn(openFoodFactsClient, 'searchProducts').mockRejectedValue(
      new OpenFoodFactsError('Open Food Facts est temporairement indisponible.', 'unavailable'),
    );
    renderSelector();

    await user.click(await screen.findByRole('button', { name: 'Open Food Facts' }));
    await user.type(screen.getByLabelText('Rechercher dans Open Food Facts'), 'yaourt');
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(await screen.findByText('Open Food Facts est temporairement indisponible.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tous (0)' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Créer un aliment manuel' })).toBeInTheDocument();
  });
});
