import { describe, expect, it, vi } from 'vitest';

import { handlePhotoNutritionAiProxyRequest } from './photoNutritionAiProxy.js';

function imageFile(name = 'repas.jpg', type = 'image/jpeg', size = 128) {
  return new File([new Uint8Array(size)], name, { type });
}

function requestWithPhoto(photo = imageFile()) {
  const formData = new FormData();
  formData.append('photo', photo);
  return {
    method: 'POST',
    headers: new Headers(),
    formData: vi.fn(async () => formData),
  };
}

const authenticated = {
  authenticateRequest: vi.fn(async () => ({ subject: 'user-123' })),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
};

function configuredEnv(overrides = {}) {
  return {
    PHOTO_NUTRITION_AI_API_KEY: 'server-secret',
    PHOTO_NUTRITION_RATE_LIMITER: {
      limit: vi.fn(async () => ({ success: true })),
    },
    ...overrides,
  };
}

function d1RateLimiter(requestCount) {
  const cleanupRun = vi.fn(async () => ({ success: true }));
  const incrementFirst = vi.fn(async () => ({ request_count: requestCount }));
  const prepare = vi.fn((query) => ({
    bind: vi.fn(() => query.includes('DELETE FROM')
      ? { run: cleanupRun }
      : { first: incrementFirst }),
  }));

  return {
    database: { prepare },
    cleanupRun,
    incrementFirst,
  };
}

function geminiResponseFromContract(contract) {
  return {
    candidates: [
      {
        content: {
          parts: [
            { text: JSON.stringify(contract) },
          ],
        },
      },
    ],
  };
}

describe('photoNutritionAiProxy Gemini', () => {
  it('refuse les méthodes autres que POST', async () => {
    const response = await handlePhotoNutritionAiProxyRequest({ method: 'GET' });

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toMatchObject({ code: 'PHOTO_AI_METHOD_NOT_ALLOWED' });
  });

  it('signale explicitement un proxy Gemini non configuré sans clé serveur', async () => {
    const response = await handlePhotoNutritionAiProxyRequest(requestWithPhoto());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: 'PHOTO_AI_NOT_CONFIGURED' });
  });

  it('refuse une image absente ou invalide', async () => {
    const formData = new FormData();
    formData.append('photo', new File([new Uint8Array(8)], 'note.txt', { type: 'text/plain' }));
    const response = await handlePhotoNutritionAiProxyRequest({
      method: 'POST',
      headers: new Headers(),
      formData: vi.fn(async () => formData),
    }, configuredEnv(), authenticated);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'PHOTO_AI_INVALID_IMAGE' });
  });

  it('appelle Gemini côté serveur et renvoie le contrat attendu par la PWA', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(geminiResponseFromContract({
      estimate: {
        name: 'Assiette de riz et poulet',
        amount: 350,
        nutrition: { caloriesKcal: 690, proteinGrams: 44, carbohydratesGrams: 78, fatGrams: 18 },
      },
      confidence: 'medium',
      warnings: ['Portion estimée à partir de la photo.'],
    })), { status: 200 }));

    const response = await handlePhotoNutritionAiProxyRequest(requestWithPhoto(), configuredEnv({
      PHOTO_NUTRITION_AI_MODEL: 'gemini-2.5-flash-lite',
    }), { ...authenticated, fetcher });

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': 'server-secret',
        },
      }),
    );
    const body = await response.json();
    expect(body).toMatchObject({
      estimate: {
        name: 'Assiette de riz et poulet',
        amount: 350,
        nutrition: { caloriesKcal: 690, proteinGrams: 44, carbohydratesGrams: 78, fatGrams: 18 },
      },
      confidence: 'medium',
    });
    expect(body.warnings).toEqual(['Portion estimée à partir de la photo.']);
    expect(body.diagnosticRef).toMatch(/^PA-[A-Z0-9]{8}$/);
    expect(response.headers.get('x-sportpilot-request-id')).toBe(body.diagnosticRef);
  });

  it('conserve le statut et le code d’une authentification refusée', async () => {
    const response = await handlePhotoNutritionAiProxyRequest(
      requestWithPhoto(),
      configuredEnv(),
      {
        ...authenticated,
        authenticateRequest: vi.fn(async () => {
          throw { status: 401, code: 'AUTH_TOKEN_EXPIRED', message: 'Session expirée.' };
        }),
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: 'AUTH_TOKEN_EXPIRED',
      diagnosticRef: expect.stringMatching(/^PA-/),
    });
  });

  it('distingue la limite fournisseur et renvoie une référence exploitable', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'quota' } }), { status: 429 }));

    const response = await handlePhotoNutritionAiProxyRequest(
      requestWithPhoto(),
      configuredEnv(),
      { ...authenticated, fetcher },
    );

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toMatchObject({
      code: 'PHOTO_AI_PROVIDER_QUOTA',
      diagnosticRef: expect.stringMatching(/^PA-[A-Z0-9]{8}$/),
    });
    expect(response.headers.get('x-sportpilot-request-id')).toBe(body.diagnosticRef);
  });

  it('interrompt explicitement Gemini lorsque le délai fournisseur est dépassé', async () => {
    const fetcher = vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }));

    const response = await handlePhotoNutritionAiProxyRequest(
      requestWithPhoto(),
      configuredEnv(),
      { ...authenticated, fetcher, providerTimeoutMs: 5 },
    );

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toMatchObject({
      code: 'PHOTO_AI_PROVIDER_TIMEOUT',
      diagnosticRef: expect.stringMatching(/^PA-/),
    });
  });

  it('journalise uniquement les métadonnées de diagnostic', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const fetcher = vi.fn(async () => new Response('not-json', { status: 200 }));

    const response = await handlePhotoNutritionAiProxyRequest(
      requestWithPhoto(),
      configuredEnv(),
      { ...authenticated, fetcher, logger, createDiagnosticRef: () => 'PA-LOGTEST1' },
    );

    expect(response.status).toBe(502);
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({
      event: 'photo_nutrition_analysis',
      diagnosticRef: 'PA-LOGTEST1',
      code: 'PHOTO_AI_INVALID_RESPONSE',
      timingsMs: expect.objectContaining({
        authentication: expect.any(Number),
        rateLimit: expect.any(Number),
        imageRead: expect.any(Number),
        provider: expect.any(Number),
        total: expect.any(Number),
      }),
    }));
    const logged = JSON.stringify(logger.error.mock.calls);
    expect(logged).not.toContain('server-secret');
    expect(logged).not.toContain('secret-token');
    expect(logged).not.toContain('base64');
  });

  it('bloque la requête avant parsing lorsque la taille multipart dépasse la limite', async () => {
    const request = requestWithPhoto();
    request.headers.set('content-length', String(9 * 1024 * 1024));

    const response = await handlePhotoNutritionAiProxyRequest(
      request,
      configuredEnv(),
      authenticated,
    );

    expect(response.status).toBe(413);
    expect(request.formData).not.toHaveBeenCalled();
  });

  it('applique le quota au sujet authentifié avant l’appel fournisseur', async () => {
    const limiter = { limit: vi.fn(async () => ({ success: false })) };
    const fetcher = vi.fn();

    const response = await handlePhotoNutritionAiProxyRequest(
      requestWithPhoto(),
      configuredEnv({ PHOTO_NUTRITION_RATE_LIMITER: limiter }),
      { ...authenticated, fetcher },
    );

    expect(response.status).toBe(429);
    expect(limiter.limit).toHaveBeenCalledWith({ key: 'user-123' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('utilise D1 pour limiter une Pages Function sans binding Workers', async () => {
    const d1 = d1RateLimiter(1);
    const fetcher = vi.fn(async () => new Response(JSON.stringify(geminiResponseFromContract({
      estimate: {
        name: 'Repas D1',
        amount: 250,
        nutrition: {
          caloriesKcal: 500,
          proteinGrams: 25,
          carbohydratesGrams: 55,
          fatGrams: 18,
        },
      },
      confidence: 'medium',
      warnings: [],
    })), { status: 200 }));

    const response = await handlePhotoNutritionAiProxyRequest(
      requestWithPhoto(),
      configuredEnv({
        PHOTO_NUTRITION_RATE_LIMITER: undefined,
        SOCIAL_DIRECTORY_DB: d1.database,
      }),
      { ...authenticated, fetcher, now: () => 60_000 },
    );

    expect(response.status).toBe(200);
    expect(d1.cleanupRun).toHaveBeenCalledOnce();
    expect(d1.incrementFirst).toHaveBeenCalledOnce();
  });

  it('refuse la onzieme analyse de la minute comptee dans D1', async () => {
    const d1 = d1RateLimiter(11);
    const fetcher = vi.fn();

    const response = await handlePhotoNutritionAiProxyRequest(
      requestWithPhoto(),
      configuredEnv({
        PHOTO_NUTRITION_RATE_LIMITER: undefined,
        SOCIAL_DIRECTORY_DB: d1.database,
      }),
      { ...authenticated, fetcher, now: () => 60_000 },
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      code: 'PHOTO_AI_RATE_LIMITED',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
