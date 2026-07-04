import {
  assertPhotoNutritionAiEndpoint,
  createRemotePhotoNutritionAnalysisPort,
  readPhotoNutritionAiConfig,
} from '@/application/photo-nutrition/photoNutritionAiClient';

function imageFile(name = 'repas.jpg', size = 128): File {
  return new File([new Uint8Array(size)], name, { type: 'image/jpeg' });
}

describe('photoNutritionAiClient', () => {
  it('lit une configuration IA photo sans activer de clé côté front', () => {
    const config = readPhotoNutritionAiConfig({
      VITE_PHOTO_NUTRITION_AI_ENDPOINT: ' /api/photo-nutrition/analyze ',
      VITE_PHOTO_NUTRITION_AI_TIMEOUT_MS: '12000',
    });

    expect(config).toEqual({
      enabled: true,
      endpointUrl: '/api/photo-nutrition/analyze',
      timeoutMs: 12000,
    });
  });

  it('reste désactivé tant que le proxy IA n’est pas configuré', () => {
    expect(readPhotoNutritionAiConfig({}).enabled).toBe(false);
  });

  it('refuse un endpoint HTTP public', () => {
    expect(() => assertPhotoNutritionAiEndpoint('http://example.com/analyze')).toThrow('HTTPS');
  });

  it('refuse une clé ou un token dans l’URL exposée au bundle', () => {
    expect(() => assertPhotoNutritionAiEndpoint('https://example.com/analyze?api_key=secret')).toThrow('aucune clé');
  });

  it('envoie la photo au proxy et normalise le contrat IA', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      estimate: {
        name: 'Pâtes au poulet',
        amount: 320,
        nutrition: { caloriesKcal: 720, proteinGrams: 42, carbohydratesGrams: 82, fatGrams: 20 },
      },
      confidence: 'medium',
      warnings: ['Portion estimée à partir de la photo.'],
    }), { status: 200 }));

    const port = createRemotePhotoNutritionAnalysisPort({
      endpointUrl: '/api/photo-nutrition/analyze',
      fetcher,
    });

    const result = await port.analyze(imageFile());

    expect(fetcher).toHaveBeenCalledWith('/api/photo-nutrition/analyze', expect.objectContaining({
      method: 'POST',
      body: expect.any(FormData),
    }));
    expect(result.mode).toBe('remote-ai');
    expect(result.privacy).toBe('external-consent-required');
    expect(result.confidence).toBe('medium');
    expect(result.estimate.name).toBe('Pâtes au poulet');
    expect(result.estimate.nutrition.caloriesKcal).toBe(720);
    expect(result.warnings).toEqual(expect.arrayContaining([
      'Analyse IA distante via proxy sécurisé : corrige les valeurs avant validation.',
      'Photo envoyée uniquement après consentement explicite et non conservée dans le journal alimentaire.',
    ]));
  });

  it('convertit une erreur HTTP en message de fallback local exploitable', async () => {
    const port = createRemotePhotoNutritionAnalysisPort({
      endpointUrl: '/api/photo-nutrition/analyze',
      fetcher: vi.fn(async () => new Response('{}', { status: 503 })),
    });

    await expect(port.analyze(imageFile())).rejects.toThrow('fallback local conseillé');
  });

  it('bloque les photos trop volumineuses avant l’appel réseau', async () => {
    const fetcher = vi.fn();
    const port = createRemotePhotoNutritionAnalysisPort({
      endpointUrl: '/api/photo-nutrition/analyze',
      fetcher,
    });

    await expect(port.analyze(imageFile('gros-repas.jpg', 8 * 1024 * 1024 + 1))).rejects.toThrow('Photo trop volumineuse');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
