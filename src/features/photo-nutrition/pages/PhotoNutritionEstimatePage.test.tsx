import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import {
  PhotoNutritionAiError,
  type PhotoNutritionAiConfig,
} from '@/application/photo-nutrition/photoNutritionAiClient';
import type {
  PhotoNutritionAnalysisPort,
  PhotoNutritionAnalysisResult,
  SavePhotoNutritionEstimateInput,
} from '@/application/photo-nutrition/photoNutritionEstimationService';
import type { FoodEntry, FoodProduct } from '@/domain/models/food';
import { PhotoNutritionEstimatePage } from '@/features/photo-nutrition/pages/PhotoNutritionEstimatePage';

const remoteAnalysisResult: PhotoNutritionAnalysisResult = {
  estimate: {
    name: 'Bol de pâtes IA',
    amount: 320,
    nutrition: {
      caloriesKcal: 720,
      proteinGrams: 42,
      carbohydratesGrams: 82,
      fatGrams: 20,
    },
  },
  mode: 'remote-ai',
  confidence: 'medium',
  privacy: 'external-consent-required',
  warnings: [],
};

const product: FoodProduct = {
  id: 'product-1',
  createdAt: '2026-07-04T12:00:00.000Z',
  updatedAt: '2026-07-04T12:00:00.000Z',
  name: 'Bol de pâtes IA',
  brand: 'Estimation photo',
  basisUnit: 'g',
  nutritionPer100: {
    caloriesKcal: 225,
    proteinGrams: 13.1,
    carbohydratesGrams: 25.6,
    fatGrams: 6.3,
  },
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
    inputQuantity: 320,
    normalizedAmount: 320,
    normalizedUnit: 'g',
    nutritionPer100Snapshot: product.nutritionPer100,
  },
};

const enabledAiConfig: PhotoNutritionAiConfig = {
  enabled: true,
  endpointUrl: '/api/photo-nutrition/analyze',
  timeoutMs: 30000,
};

function renderPage(
  analyzePhoto: (
    file: File,
    port: PhotoNutritionAnalysisPort,
    signal?: AbortSignal,
  ) => Promise<PhotoNutritionAnalysisResult> = vi.fn(async () => remoteAnalysisResult),
  saveEstimate: (
    input: SavePhotoNutritionEstimateInput,
  ) => Promise<{ product: FoodProduct; entry: FoodEntry }> = vi.fn(async () => ({ product, entry })),
  createRemoteAiPort: (
    config: { endpointUrl: string; timeoutMs?: number },
  ) => PhotoNutritionAnalysisPort = vi.fn(() => ({ analyze: vi.fn() } satisfies PhotoNutritionAnalysisPort)),
) {
  return {
    analyzePhoto,
    saveEstimate,
    createRemoteAiPort,
    ...render(
      <MemoryRouter initialEntries={['/food/photo-estimate?date=2026-07-04&slot=lunch']}>
        <Routes>
          <Route
            path="/food/photo-estimate"
            element={(
              <PhotoNutritionEstimatePage
                analyzePhoto={analyzePhoto}
                saveEstimate={saveEstimate}
                aiConfig={enabledAiConfig}
                createRemoteAiPort={createRemoteAiPort}
              />
            )}
          />
          <Route path="/food" element={<p>Retour au journal réussi</p>} />
        </Routes>
      </MemoryRouter>,
    ),
  };
}

async function selectPhoto(user: ReturnType<typeof userEvent.setup>) {
  const file = new File([new Uint8Array(128)], 'repas.jpg', { type: 'image/jpeg' });
  await user.upload(screen.getByLabelText('Choisir une photo'), file);
  return file;
}

describe('PhotoNutritionEstimatePage', () => {
  it('ne fabrique aucune estimation lorsque l’IA est désactivée', async () => {
    const user = userEvent.setup();
    const { analyzePhoto } = renderPage();

    expect(screen.getByText('Choisis une photo du repas.')).toBeInTheDocument();
    expect(screen.getByText('Désactivée')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saisir manuellement' })).toBeDisabled();

    await selectPhoto(user);
    await user.click(screen.getByRole('button', { name: 'Saisir manuellement' }));

    expect(analyzePhoto).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Saisir le repas' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nom du repas')).toHaveValue('');
    expect(screen.getByLabelText('Quantité en g/ml')).toHaveValue(null);
    expect(screen.getByLabelText('Calories approximatives')).toHaveValue(null);
  });

  it('envoie la photo au proxy uniquement après activation explicite', async () => {
    const user = userEvent.setup();
    const remotePort: PhotoNutritionAnalysisPort = { analyze: vi.fn() };
    const createRemoteAiPort = vi.fn(() => remotePort);
    const analyzePhoto = vi.fn(async () => remoteAnalysisResult);
    const { analyzePhoto: analyze } = renderPage(analyzePhoto, undefined, createRemoteAiPort);
    const file = await selectPhoto(user);

    await user.click(screen.getByRole('switch', { name: 'Activer l’analyse IA pour cette photo' }));
    expect(screen.getByText('Activée')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Analyser avec l’IA' }));

    expect(createRemoteAiPort).toHaveBeenCalledWith({
      endpointUrl: '/api/photo-nutrition/analyze',
      timeoutMs: 30000,
    });
    expect(analyze).toHaveBeenCalledWith(file, remotePort);
    expect(await screen.findByRole('heading', { name: 'Corriger l’estimation' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bol de pâtes IA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('720')).toBeInTheDocument();
  });

  it('affiche une progression honnête et stable pendant l’analyse', async () => {
    const user = userEvent.setup();
    let resolveAnalysis:
      | ((value: PhotoNutritionAnalysisResult) => void)
      | undefined;
    const analyzePhoto = vi.fn(() => new Promise<PhotoNutritionAnalysisResult>((resolve) => {
      resolveAnalysis = resolve;
    }));
    renderPage(analyzePhoto);
    await selectPhoto(user);
    await user.click(screen.getByRole('switch', { name: 'Activer l’analyse IA pour cette photo' }));
    await user.click(screen.getByRole('button', { name: 'Analyser avec l’IA' }));

    expect(screen.getByRole('button', { name: 'Analyse en cours…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    const loader = screen.getByLabelText('Étapes de l’analyse photo');
    expect(loader).toBeInTheDocument();
    expect(loader.getElementsByTagName('li')[1]).toHaveAttribute(
      'aria-current',
      'step',
    );

    resolveAnalysis?.(remoteAnalysisResult);
    expect(await screen.findByRole('button', { name: 'Analyse terminée' })).toBeInTheDocument();
  });

  it('affiche une erreur traçable sans fallback automatique et propose la saisie vide', async () => {
    const user = userEvent.setup();
    const analyzePhoto = vi.fn(async () => {
      throw new PhotoNutritionAiError(
        'PHOTO_AI_PROVIDER_TIMEOUT',
        'L’analyse du repas a pris trop de temps.',
        { diagnosticRef: 'PA-TEST1234' },
      );
    });
    renderPage(analyzePhoto);
    await selectPhoto(user);
    await user.click(screen.getByRole('switch', { name: 'Activer l’analyse IA pour cette photo' }));
    await user.click(screen.getByRole('button', { name: 'Analyser avec l’IA' }));

    expect(await screen.findByText('Analyse indisponible')).toBeInTheDocument();
    expect(screen.getByText('Référence : PA-TEST1234')).toBeInTheDocument();
    expect(analyzePhoto).toHaveBeenCalledOnce();
    expect(screen.queryByRole('heading', { name: 'Corriger l’estimation' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Saisir manuellement' }));
    expect(screen.getByLabelText('Nom du repas')).toHaveValue('');
    expect(analyzePhoto).toHaveBeenCalledOnce();
  });

  it('permet de corriger puis enregistrer le résultat réel', async () => {
    const user = userEvent.setup();
    const { saveEstimate } = renderPage();
    await selectPhoto(user);
    await user.click(screen.getByRole('switch', { name: 'Activer l’analyse IA pour cette photo' }));
    await user.click(screen.getByRole('button', { name: 'Analyser avec l’IA' }));

    const calories = await screen.findByLabelText('Calories approximatives');
    await user.clear(calories);
    await user.type(calories, '690');
    await user.click(screen.getByRole('button', { name: 'Ajouter au journal' }));

    await waitFor(() => {
      expect(saveEstimate).toHaveBeenCalledWith(expect.objectContaining({
        date: '2026-07-04',
        mealSlot: 'lunch',
        estimate: expect.objectContaining({
          amount: 320,
          nutrition: expect.objectContaining({ caloriesKcal: 690 }),
        }),
      }));
    });
    expect(await screen.findByText('Retour au journal réussi')).toBeInTheDocument();
  });

  it('peut relancer une analyse après une erreur sans double résultat', async () => {
    const user = userEvent.setup();
    const analyzePhoto = vi.fn()
      .mockRejectedValueOnce(new Error('La photo n’a pas pu être analysée.'))
      .mockResolvedValueOnce(remoteAnalysisResult);
    renderPage(analyzePhoto);
    await selectPhoto(user);
    await user.click(screen.getByRole('switch', { name: 'Activer l’analyse IA pour cette photo' }));
    await user.click(screen.getByRole('button', { name: 'Analyser avec l’IA' }));
    await screen.findByText('Analyse indisponible');

    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByRole('heading', { name: 'Corriger l’estimation' })).toBeInTheDocument();
    expect(screen.queryByText('Analyse indisponible')).not.toBeInTheDocument();
    expect(analyzePhoto).toHaveBeenCalledTimes(2);
  });
});
