import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { PhotoNutritionAiConfig } from '@/application/photo-nutrition/photoNutritionAiClient';
import type { PhotoNutritionAnalysisPort, PhotoNutritionAnalysisResult, SavePhotoNutritionEstimateInput } from '@/application/photo-nutrition/photoNutritionEstimationService';
import { PhotoNutritionEstimatePage } from '@/features/photo-nutrition/pages/PhotoNutritionEstimatePage';
import type { FoodEntry, FoodProduct } from '@/domain/models/food';

const analysisResult: PhotoNutritionAnalysisResult = {
  estimate: {
    name: 'Repas photographié à vérifier',
    amount: 250,
    nutrition: { caloriesKcal: 450, proteinGrams: 22, carbohydratesGrams: 48, fatGrams: 16 },
  },
  mode: 'local-fallback',
  confidence: 'low',
  privacy: 'local-only',
  warnings: [
    'Estimation locale sans reconnaissance IA réelle branchée.',
    'Photo non conservée dans le journal alimentaire.',
  ],
};

const remoteAnalysisResult: PhotoNutritionAnalysisResult = {
  estimate: {
    name: 'Bol de pâtes IA',
    amount: 320,
    nutrition: { caloriesKcal: 720, proteinGrams: 42, carbohydratesGrams: 82, fatGrams: 20 },
  },
  mode: 'remote-ai',
  confidence: 'medium',
  privacy: 'external-consent-required',
  warnings: ['Analyse IA distante via proxy sécurisé : corrige les valeurs avant validation.'],
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

type AnalyzePhotoTestFn = (
  file: File,
  port?: PhotoNutritionAnalysisPort,
  signal?: AbortSignal,
) => Promise<PhotoNutritionAnalysisResult>;

function renderPage(
  analyzePhoto: AnalyzePhotoTestFn = vi.fn(async (_file: File) => analysisResult),
  saveEstimate = vi.fn(async (_input: SavePhotoNutritionEstimateInput) => ({ product, entry })),
  aiConfig: PhotoNutritionAiConfig = { enabled: false, endpointUrl: '', timeoutMs: 15000 },
  createRemoteAiPort: (config: { endpointUrl: string; timeoutMs?: number }) => PhotoNutritionAnalysisPort = vi.fn((_config: { endpointUrl: string; timeoutMs?: number }) => ({ analyze: vi.fn() } satisfies PhotoNutritionAnalysisPort)),
) {
  return {
    analyzePhoto,
    saveEstimate,
    ...render(
      <MemoryRouter initialEntries={['/food/photo-estimate?date=2026-07-04&slot=lunch']}>
        <Routes>
          <Route path="/food/photo-estimate" element={<PhotoNutritionEstimatePage analyzePhoto={analyzePhoto} saveEstimate={saveEstimate} aiConfig={aiConfig} createRemoteAiPort={createRemoteAiPort} />} />
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
    expect(screen.getByText('Autoriser l’analyse IA pour cette photo')).toBeInTheDocument();
    expect(screen.getByText('Le proxy distant est indisponible. L’analyse restera locale et aucune photo ne sera envoyée.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyser en local' })).toBeDisabled();

    await user.upload(screen.getByLabelText('Choisir une photo'), file);

    expect(screen.getByText('Photo sélectionnée')).toBeInTheDocument();
    expect(screen.getByText('repas.jpg')).toBeInTheDocument();
    expect(screen.getByText(/Photo prête/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimer la photo sélectionnée' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Analyser en local' }));

    expect(analyzePhoto).toHaveBeenCalledWith(file);
    expect(await screen.findByRole('heading', { name: '2. Corriger l’estimation' })).toBeInTheDocument();
    expect(screen.getByText('Analyse locale prudente')).toBeInTheDocument();
    expect(screen.getByText(/fallback local sans IA distante/i)).toBeInTheDocument();
    expect(screen.getByText('Photo non conservée dans le journal alimentaire.')).toBeInTheDocument();
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
    expect(screen.getByText('Autoriser l’analyse IA pour cette photo')).toBeInTheDocument();
    expect(screen.getByText('Le proxy distant est indisponible. L’analyse restera locale et aucune photo ne sera envoyée.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyser en local' })).toBeDisabled();
  });

  it('affiche clairement une photo illisible', async () => {
    const user = userEvent.setup();
    renderPage(vi.fn(async () => { throw new Error('Photo illisible.'); }));

    await user.upload(screen.getByLabelText('Choisir une photo'), new File([new Uint8Array(128)], 'repas.jpg', { type: 'image/jpeg' }));
    await user.click(screen.getByRole('button', { name: 'Analyser en local' }));

    expect(await screen.findByText('Photo illisible.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter au journal' })).not.toBeInTheDocument();
  });

  it('n’envoie la photo au proxy IA qu’après consentement explicite et remplit le formulaire avec la réponse IA distante', async () => {
    const user = userEvent.setup();
    const remotePort: PhotoNutritionAnalysisPort = { analyze: vi.fn() };
    const createRemoteAiPort = vi.fn((_config: { endpointUrl: string; timeoutMs?: number }) => remotePort);
    const analyzePhoto = vi.fn(async (_file: File, port?: PhotoNutritionAnalysisPort) => (port ? remoteAnalysisResult : analysisResult));
    const aiConfig: PhotoNutritionAiConfig = {
      enabled: true,
      endpointUrl: '/api/photo-nutrition/analyze',
      timeoutMs: 12000,
    };
    renderPage(analyzePhoto, undefined, aiConfig, createRemoteAiPort);
    const file = new File([new Uint8Array(128)], 'repas.jpg', { type: 'image/jpeg' });

    await user.upload(screen.getByLabelText('Choisir une photo'), file);
    expect(screen.getByText('La photo sera envoyée une seule fois au proxy sécurisé, uniquement après activation de cet interrupteur.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyser en local' })).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: /Autoriser l’analyse IA distante/i }));
    await user.click(screen.getByRole('button', { name: 'Analyser avec l’IA' }));

    expect(createRemoteAiPort).toHaveBeenCalledWith({ endpointUrl: '/api/photo-nutrition/analyze', timeoutMs: 12000 });
    expect(analyzePhoto).toHaveBeenCalledWith(file, remotePort);
    expect(await screen.findByText('Analyse IA à vérifier')).toBeInTheDocument();
    expect(screen.getByText(/analyse distante via proxy avec consentement/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bol de pâtes IA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('720')).toBeInTheDocument();
  });

  it('bascule automatiquement sur le fallback local si le proxy IA échoue', async () => {
    const user = userEvent.setup();
    const remotePort: PhotoNutritionAnalysisPort = { analyze: vi.fn() };
    const createRemoteAiPort = vi.fn((_config: { endpointUrl: string; timeoutMs?: number }) => remotePort);
    const analyzePhoto = vi.fn(async (_file: File, port?: PhotoNutritionAnalysisPort) => {
      if (port) throw new Error('Analyse IA indisponible (503) : fallback local conseillé.');
      return analysisResult;
    });
    const aiConfig: PhotoNutritionAiConfig = {
      enabled: true,
      endpointUrl: '/api/photo-nutrition/analyze',
      timeoutMs: 12000,
    };
    renderPage(analyzePhoto, undefined, aiConfig, createRemoteAiPort);
    const file = new File([new Uint8Array(128)], 'repas.jpg', { type: 'image/jpeg' });

    await user.upload(screen.getByLabelText('Choisir une photo'), file);
    await user.click(screen.getByRole('switch', { name: /Autoriser l’analyse IA distante/i }));
    await user.click(screen.getByRole('button', { name: 'Analyser avec l’IA' }));

    expect(await screen.findByText('IA indisponible, fallback local utilisé')).toBeInTheDocument();
    expect(screen.getAllByText(/Fallback local appliqué automatiquement/i)).toHaveLength(2);
    expect(screen.getByText('Analyse locale prudente')).toBeInTheDocument();
    expect(screen.getByText(/IA distante indisponible : Analyse IA indisponible/i)).toBeInTheDocument();
    expect(analyzePhoto).toHaveBeenNthCalledWith(1, file, remotePort);
    expect(analyzePhoto).toHaveBeenNthCalledWith(2, file);
  });

});
