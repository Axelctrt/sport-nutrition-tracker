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
    formData: vi.fn(async () => formData),
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
      formData: vi.fn(async () => formData),
    }, { PHOTO_NUTRITION_AI_API_KEY: 'server-secret' });

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

    const response = await handlePhotoNutritionAiProxyRequest(requestWithPhoto(), {
      PHOTO_NUTRITION_AI_API_KEY: 'server-secret',
      PHOTO_NUTRITION_AI_MODEL: 'gemini-2.5-flash-lite',
    }, { fetcher });

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=server-secret',
      expect.objectContaining({ method: 'POST', headers: { 'content-type': 'application/json' } }),
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
    expect(body.warnings).toEqual(expect.arrayContaining([
      'Analyse IA Gemini Free Tier : estimation expérimentale à corriger avant validation.',
      'Photo transmise à Google Gemini après consentement explicite ; ne pas utiliser avec des photos sensibles.',
    ]));
  });

  it('convertit une erreur Gemini en erreur proxy exploitable par le fallback local', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'quota' } }), { status: 429 }));

    const response = await handlePhotoNutritionAiProxyRequest(requestWithPhoto(), {
      PHOTO_NUTRITION_AI_API_KEY: 'server-secret',
    }, { fetcher });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ code: 'PHOTO_AI_PROVIDER_ERROR' });
  });
});
