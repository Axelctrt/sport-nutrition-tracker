import { Buffer } from 'node:buffer';
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

class PhotoNutritionAiProxyError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'PhotoNutritionAiProxyError';
    this.status = status;
    this.code = code;
  }
}

function isProxyError(error) {
  return Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error);
}

function jsonResponse(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

function readEnv(env, key) {
  const value = env?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getGeminiConfig(env = {}) {
  return {
    apiKey: readEnv(env, 'PHOTO_NUTRITION_AI_API_KEY') || readEnv(env, 'GEMINI_API_KEY'),
    model: readEnv(env, 'PHOTO_NUTRITION_AI_MODEL') || readEnv(env, 'GEMINI_MODEL') || DEFAULT_MODEL,
  };
}

function isFileLike(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof value.arrayBuffer === 'function'
    && typeof value.type === 'string'
    && typeof value.size === 'number'
  );
}

async function readImageFromRequest(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    throw new PhotoNutritionAiProxyError(400, 'PHOTO_AI_INVALID_FORM', 'Formulaire photo invalide.');
  }

  const photo = formData.get('photo');
  if (!isFileLike(photo)) {
    throw new PhotoNutritionAiProxyError(400, 'PHOTO_AI_INVALID_IMAGE', 'Photo absente ou invalide.');
  }

  const mimeType = photo.type.trim().toLowerCase();
  if (!mimeType.startsWith('image/')) {
    throw new PhotoNutritionAiProxyError(400, 'PHOTO_AI_INVALID_IMAGE', 'Le fichier fourni n’est pas une image.');
  }

  if (photo.size <= 0) {
    throw new PhotoNutritionAiProxyError(400, 'PHOTO_AI_INVALID_IMAGE', 'La photo est vide.');
  }

  if (photo.size > MAX_IMAGE_SIZE_BYTES) {
    throw new PhotoNutritionAiProxyError(413, 'PHOTO_AI_IMAGE_TOO_LARGE', 'Photo trop volumineuse : limite 8 Mo.');
  }

  const buffer = await photo.arrayBuffer();
  return {
    mimeType,
    base64: Buffer.from(buffer).toString('base64'),
  };
}

const NUTRITION_PROMPT = `Tu analyses une photo de repas pour SportPilot.
Réponds uniquement en JSON strict, sans Markdown, avec ce contrat :
{
  "estimate": {
    "name": "nom court du plat ou repas",
    "amount": 250,
    "nutrition": {
      "caloriesKcal": 500,
      "proteinGrams": 25,
      "carbohydratesGrams": 55,
      "fatGrams": 18
    }
  },
  "confidence": "low|medium|high",
  "warnings": ["portion approximative", "corriger avant validation"]
}
Règles :
- estime une portion plausible en grammes ;
- reste prudent si la photo est ambiguë ;
- n’invente pas une précision excessive ;
- valeurs nutritionnelles en grammes sauf caloriesKcal ;
- aucun texte hors JSON.`;

function buildGeminiPayload({ mimeType, base64 }) {
  return {
    contents: [
      {
        role: 'user',
        parts: [
          { text: NUTRITION_PROMPT },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };
}

function firstTextPart(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  const textPart = parts.find((part) => typeof part?.text === 'string');
  return typeof textPart?.text === 'string' ? textPart.text : '';
}

function parseJsonFromGemini(payload) {
  const raw = firstTextPart(payload).trim();
  if (!raw) throw new PhotoNutritionAiProxyError(502, 'PHOTO_AI_INVALID_RESPONSE', 'Réponse Gemini vide ou inexploitable.');

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new PhotoNutritionAiProxyError(502, 'PHOTO_AI_INVALID_RESPONSE', 'Réponse Gemini non JSON.');
    try {
      return JSON.parse(match[0]);
    } catch {
      throw new PhotoNutritionAiProxyError(502, 'PHOTO_AI_INVALID_RESPONSE', 'Réponse Gemini JSON invalide.');
    }
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value, fallback = Number.NaN) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeGeminiContract(payload) {
  if (!isRecord(payload) || !isRecord(payload.estimate) || !isRecord(payload.estimate.nutrition)) {
    throw new PhotoNutritionAiProxyError(502, 'PHOTO_AI_INVALID_RESPONSE', 'Contrat nutrition IA incomplet.');
  }

  const estimate = payload.estimate;
  const nutrition = estimate.nutrition;
  const amount = toNumber(estimate.amount);
  const caloriesKcal = toNumber(nutrition.caloriesKcal);

  if (!(amount > 0) || !(caloriesKcal >= 0)) {
    throw new PhotoNutritionAiProxyError(502, 'PHOTO_AI_INVALID_RESPONSE', 'Quantité ou calories IA invalides.');
  }

  const confidence = payload.confidence === 'high' || payload.confidence === 'medium' ? payload.confidence : 'low';
  const remoteWarnings = Array.isArray(payload.warnings)
    ? payload.warnings.filter((warning) => typeof warning === 'string' && warning.trim()).map((warning) => warning.trim())
    : [];

  return {
    estimate: {
      name: typeof estimate.name === 'string' && estimate.name.trim() ? estimate.name.trim() : 'Repas IA Gemini à vérifier',
      amount,
      nutrition: {
        caloriesKcal,
        proteinGrams: Math.max(0, toNumber(nutrition.proteinGrams, 0)),
        carbohydratesGrams: Math.max(0, toNumber(nutrition.carbohydratesGrams, 0)),
        fatGrams: Math.max(0, toNumber(nutrition.fatGrams, 0)),
      },
    },
    confidence,
    warnings: [
      'Analyse IA Gemini Free Tier : estimation expérimentale à corriger avant validation.',
      'Photo transmise à Google Gemini après consentement explicite ; ne pas utiliser avec des photos sensibles.',
      ...remoteWarnings,
    ],
  };
}

async function callGemini({ image, apiKey, model, fetcher = fetch }) {
  const endpoint = `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(buildGeminiPayload(image)),
  });

  if (!response.ok) {
    throw new PhotoNutritionAiProxyError(response.status === 429 ? 429 : 502, 'PHOTO_AI_PROVIDER_ERROR', `Gemini indisponible (${response.status}).`);
  }

  const geminiPayload = await response.json();
  return normalizeGeminiContract(parseJsonFromGemini(geminiPayload));
}

export async function handlePhotoNutritionAiProxyRequest(request, env = {}, options = {}) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { code: 'PHOTO_AI_METHOD_NOT_ALLOWED', message: 'Méthode non autorisée.' });
  }

  try {
    const config = getGeminiConfig(env);
    if (!config.apiKey) {
      throw new PhotoNutritionAiProxyError(503, 'PHOTO_AI_NOT_CONFIGURED', 'Proxy IA Gemini non configuré : clé serveur manquante.');
    }

    const image = await readImageFromRequest(request);
    const payload = await callGemini({ image, apiKey: config.apiKey, model: config.model, fetcher: options.fetcher });
    return jsonResponse(200, payload);
  } catch (error) {
    if (isProxyError(error)) {
      return jsonResponse(error.status, { code: error.code, message: error.message });
    }

    const message = error instanceof Error ? error.message : 'Erreur inconnue.';
    return jsonResponse(502, { code: 'PHOTO_AI_PROXY_ERROR', message: `Proxy IA Gemini indisponible : ${message}` });
  }
}

export const photoNutritionAiProxyInternals = {
  buildGeminiPayload,
  normalizeGeminiContract,
  parseJsonFromGemini,
};
