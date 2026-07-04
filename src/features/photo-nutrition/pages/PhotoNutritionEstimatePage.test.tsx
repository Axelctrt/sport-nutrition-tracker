import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { PhotoNutritionAnalysisResult, SavePhotoNutritionEstimateInput } from '@/application/photo-nutrition/photoNutritionEstimationService';
import { PhotoNutritionEstimatePage } from '@/features/photo-nutrition/pages/PhotoNutritionEstimatePage';
import type { FoodEntry, FoodProduct } from '@/domain/models/food';

const analysisResult: PhotoNutritionAnalysisResult = {
  estimate: {
    name: 'Repas photographié à vérifier',
    amount: 250,
    nutrition: { caloriesKcal: 450, proteinGrams: 22, carbohydratesGrams: 48, fatGrams: 16 },
  },
};

const product: FoodProduct = {
  id: 'product-1',
  createdAt: '2026-07-04T12:00:00.000Z',
  updatedAt: '2026-07-04T12:00:00.000Z',
  name: 'Repas photographié à vérifier',
  brand: 'Estimation photo',
  basisUnit: 'g',
  nutritionPer100: { caloriesKcal: 180, proteinGrams: 8.8, carbohydratesGrams: 19.2, fatGrams: 6.4 },
  source: { type: 'manual' },
  isNutritionComplete: false,
  isFavorite: false,
  isArchived: false,
};

const entry: FoodEntry = {
  id: 'entry-1',
  createdAt: '2026-07-04T12:00:00.000Z',
  updatedAt: '2026-07-04T12:00:00.000Z',
  date: '2026-07-04',
  mealId: 'meal-1',
  mealSlot: 'lunch',
  sourceType: 'product',
  reference: {
    sourceType: 'product',
    productId: 'product-1',
    inputMode: 'amount',
    inputQuantity: 250,
    normalizedAmount: 250,
    normalizedUnit: 'g',
    nutritionPer100Snapshot: product.nutritionPer100,
  },
};

function renderPage(
  analyzePhoto = vi.fn(async () => analysisResult),
  saveEstimate = vi.fn(async (_input: SavePhotoNutritionEstimateInput) => ({ product, entry })),
) {
  return {
    analyzePhoto,
    saveEstimate,
    ...render(
      <MemoryRouter initialEntries={['/food/photo-estimate?date=2026-07-04&slot=lunch']}>
        <Routes>
          <Route path="/food/photo-estimate" element={<PhotoNutritionEstimatePage analyzePhoto={analyzePhoto} saveEstimate={saveEstimate} />} />
          <Route path="/food" element={<p>Retour au journal réussi</p>} />
        </Routes>
      </MemoryRouter>,
    ),
  };
}

describe('PhotoNutritionEstimatePage', () => {
  it('affiche le choix photo unique, confirme la sélection, analyse puis ajoute au journal', async () => {
    const user = userEvent.setup();
    const { analyzePhoto, saveEstimate } = renderPage();
    const file = new File([new Uint8Array(128)], 'repas.jpg', { type: 'image/jpeg' });

    expect(screen.getByText('Choisir une photo')).toBeInTheDocument();
    expect(screen.getByLabelText('Choisir une photo')).not.toHaveAttribute('capture');
    expect(screen.getByText('Aucune photo sélectionnée pour le moment.')).toBeInTheDocument();

    await user.upload(screen.getByLabelText('Choisir une photo'), file);

    expect(screen.getByText('Photo sélectionnée')).toBeInTheDocument();
    expect(screen.getByText('repas.jpg')).toBeInTheDocument();
    expect(screen.getByText(/Photo prête/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimer la photo sélectionnée' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Analyser la photo' }));

    expect(analyzePhoto).toHaveBeenCalledWith(file);
    expect(await screen.findByRole('heading', { name: '2. Corriger l’estimation' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Repas photographié à vérifier')).toBeInTheDocument();

    const calories = screen.getByLabelText(/Calories approximatives/i);
    await user.clear(calories);
    await user.type(calories, '600');
    await user.click(screen.getByRole('button', { name: 'Ajouter au journal' }));

    await waitFor(() => {
      expect(saveEstimate).toHaveBeenCalledWith(expect.objectContaining({
        date: '2026-07-04',
        mealSlot: 'lunch',
        estimate: expect.objectContaining({
          amount: 250,
          nutrition: expect.objectContaining({ caloriesKcal: 600 }),
        }),
      }));
    });
    expect(await screen.findByText('Retour au journal réussi')).toBeInTheDocument();
  });

  it('remplace puis supprime la photo sélectionnée', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.upload(screen.getByLabelText('Choisir une photo'), new File([new Uint8Array(128)], 'ancien-repas.jpg', { type: 'image/jpeg' }));
    expect(screen.getByText('ancien-repas.jpg')).toBeInTheDocument();

    await user.upload(screen.getByLabelText('Choisir une photo'), new File([new Uint8Array(128)], 'nouveau-repas.jpg', { type: 'image/jpeg' }));
    expect(screen.getByText('nouveau-repas.jpg')).toBeInTheDocument();
    expect(screen.queryByText('ancien-repas.jpg')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Supprimer la photo sélectionnée' }));
    expect(screen.queryByText('nouveau-repas.jpg')).not.toBeInTheDocument();
    expect(screen.getByText('Aucune photo sélectionnée pour le moment.')).toBeInTheDocument();
  });

  it('affiche clairement une photo illisible', async () => {
    const user = userEvent.setup();
    renderPage(vi.fn(async () => { throw new Error('Photo illisible.'); }));

    await user.upload(screen.getByLabelText('Choisir une photo'), new File([new Uint8Array(128)], 'repas.jpg', { type: 'image/jpeg' }));
    await user.click(screen.getByRole('button', { name: 'Analyser la photo' }));

    expect(await screen.findByText('Photo illisible.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter au journal' })).not.toBeInTheDocument();
  });
});
