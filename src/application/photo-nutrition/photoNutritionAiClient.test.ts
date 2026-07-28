import {
  assertPhotoNutritionAiEndpoint,
  createRemotePhotoNutritionAnalysisPort,
  readPhotoNutritionAiConfig,
} from '@/application/photo-nutrition/photoNutritionAiClient';

function imageFile(name = 'repas.jpg', size = 128): File {
  return new File([new Uint8Array(size)], name, { type: 'image/jpeg' });
}

const credentialsProvider = () => ({
  userId: 'user-123',
  accessToken: 'secret-token',
});

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

  it('utilise la route Pages Function et 30 secondes par défaut', () => {
    expect(readPhotoNutritionAiConfig({})).toEqual({
      enabled: true,
      endpointUrl: '/api/photo-nutrition/analyze',
      timeoutMs: 30000,
    });
  });

  it('corrige automatiquement l’ancienne route qui renvoyait le HTML de la PWA', () => {
    expect(readPhotoNutritionAiConfig({
      VITE_PHOTO_NUTRITION_AI_ENDPOINT: '/api/photo-nutrition-ai',
    }).endpointUrl).toBe('/api/photo-nutrition/analyze');
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
      credentialsProvider,
      preparePhoto: async (file) => file,
    });

    const result = await port.analyze(imageFile());

    expect(fetcher).toHaveBeenCalledWith('/api/photo-nutrition/analyze', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        authorization: 'Bearer secret-token',
      }),
      body: expect.any(FormData),
    }));
    expect(result.mode).toBe('remote-ai');
    expect(result.privacy).toBe('external-consent-required');
    expect(result.confidence).toBe('medium');
    expect(result.estimate.name).toBe('Pâtes au poulet');
    expect(result.estimate.nutrition.caloriesKcal).toBe(720);
    expect(result.warnings).toEqual(expect.arrayContaining([
      'Estimation à vérifier avant de l’ajouter au repas.',
    ]));
  });



  it('refuse une réponse IA distante sans estimation exploitable', async () => {
    const port = createRemotePhotoNutritionAnalysisPort({
      endpointUrl: '/api/photo-nutrition/analyze',
      credentialsProvider,
      preparePhoto: async (file) => file,
      fetcher: vi.fn(async () => new Response(JSON.stringify({ estimate: { amount: 250 } }), { status: 200 })),
    });

    await expect(port.analyze(imageFile())).rejects.toThrow('valeurs nutritionnelles');
  });

  it('convertit une erreur proxy en message clair et conserve la référence', async () => {
    const port = createRemotePhotoNutritionAnalysisPort({
      endpointUrl: '/api/photo-nutrition/analyze',
      credentialsProvider,
      preparePhoto: async (file) => file,
      fetcher: vi.fn(async () => new Response(JSON.stringify({
        code: 'PHOTO_AI_PROVIDER_TIMEOUT',
        diagnosticRef: 'PA-TEST1234',
      }), { status: 504 })),
    });

    await expect(port.analyze(imageFile())).rejects.toMatchObject({
      code: 'PHOTO_AI_PROVIDER_TIMEOUT',
      diagnosticRef: 'PA-TEST1234',
      message: expect.stringContaining('pris trop de temps'),
    });
  });

  it('bloque les photos trop volumineuses avant l’appel réseau', async () => {
    const fetcher = vi.fn();
    const port = createRemotePhotoNutritionAnalysisPort({
      endpointUrl: '/api/photo-nutrition/analyze',
      fetcher,
      credentialsProvider,
      preparePhoto: async (file) => file,
    });

    await expect(port.analyze(imageFile('gros-repas.jpg', 8 * 1024 * 1024 + 1))).rejects.toThrow('trop volumineuse');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('explique clairement qu’un compte SportPilot est requis', async () => {
    const fetcher = vi.fn();
    const port = createRemotePhotoNutritionAnalysisPort({
      endpointUrl: '/api/photo-nutrition/analyze',
      fetcher,
      credentialsProvider: () => undefined,
      preparePhoto: async (file) => file,
    });

    await expect(port.analyze(imageFile())).rejects.toMatchObject({
      code: 'PHOTO_AI_AUTH_REQUIRED',
      message: 'Connecte ton compte SportPilot pour utiliser l’analyse photo.',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('distingue un token expiré d’une indisponibilité Gemini', async () => {
    const port = createRemotePhotoNutritionAnalysisPort({
      endpointUrl: '/api/photo-nutrition/analyze',
      credentialsProvider,
      preparePhoto: async (file) => file,
      fetcher: vi.fn(async () => new Response(JSON.stringify({
        code: 'AUTH_TOKEN_EXPIRED',
        diagnosticRef: 'PA-AUTH0001',
      }), { status: 401 })),
    });

    await expect(port.analyze(imageFile())).rejects.toMatchObject({
      status: 401,
      diagnosticRef: 'PA-AUTH0001',
      message: expect.stringContaining('expiré'),
    });
  });

  it('distingue le hors-ligne d’une erreur fournisseur', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const port = createRemotePhotoNutritionAnalysisPort({
      endpointUrl: '/api/photo-nutrition/analyze',
      credentialsProvider,
      preparePhoto: async (file) => file,
      fetcher: vi.fn(async () => { throw new TypeError('fetch failed'); }),
    });

    try {
      await expect(port.analyze(imageFile())).rejects.toMatchObject({
        code: 'PHOTO_AI_NETWORK_UNAVAILABLE',
      });
    } finally {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    }
  });

  it('interrompt le client après son délai sans laisser la requête ouverte', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }));
    const port = createRemotePhotoNutritionAnalysisPort({
      endpointUrl: '/api/photo-nutrition/analyze',
      timeoutMs: 3000,
      credentialsProvider,
      preparePhoto: async (file) => file,
      fetcher,
    });

    try {
      const analysis = port.analyze(imageFile());
      const assertion = expect(analysis).rejects.toMatchObject({
        code: 'PHOTO_AI_CLIENT_TIMEOUT',
      });
      await vi.advanceTimersByTimeAsync(3000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
