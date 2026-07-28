import { Buffer } from 'node:buffer';
import { socialActivitySnapshotsInternals } from './socialActivitySnapshots.js';

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const DEFAULT_PROVIDER_TIMEOUT_MS = 22_000;
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_MULTIPART_SIZE_BYTES = MAX_IMAGE_SIZE_BYTES + 512 * 1024;
const PHOTO_ANALYSIS_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

class PhotoNutritionAiProxyError extends Error {
  constructor(status, code, message, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'PhotoNutritionAiProxyError';
    this.status = status;
    this.code = code;
  }
}

function isProxyError(error) {
  return Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error);
}

function jsonResponse(status, payload, diagnosticRef, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-sportpilot-request-id': diagnosticRef,
      ...extraHeaders,
    },
  });
}

function readEnv(env, key) {
  const value = env?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function parseProviderTimeout(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 5_000 && parsed <= 25_000
    ? parsed
    : DEFAULT_PROVIDER_TIMEOUT_MS;
}

function getGeminiConfig(env = {}) {
  return {
    apiKey: readEnv(env, 'PHOTO_NUTRITION_AI_API_KEY') || readEnv(env, 'GEMINI_API_KEY'),
    model: readEnv(env, 'PHOTO_NUTRITION_AI_MODEL') || readEnv(env, 'GEMINI_MODEL') || DEFAULT_MODEL,
    timeoutMs: parseProviderTimeout(readEnv(env, 'PHOTO_NUTRITION_AI_TIMEOUT_MS')),
  };
}

function defaultDiagnosticRef() {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replaceAll('-', '').slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `PA-${randomPart.toUpperCase()}`;
}

function createDiagnostics(options) {
  const clock = options.clock ?? (() => performance.now());
  const startedAt = clock();
  return {
    ref: options.createDiagnosticRef?.() ?? defaultDiagnosticRef(),
    timings: {},
    clock,
    startedAt,
  };
}

async function measure(diagnostics, name, operation) {
  const startedAt = diagnostics.clock();
  try {
    return await operation();
  } finally {
    diagnostics.timings[name] = Math.max(0, Math.round(diagnostics.clock() - startedAt));
  }
}

function completeDiagnostics(diagnostics) {
  diagnostics.timings.total = Math.max(0, Math.round(diagnostics.clock() - diagnostics.startedAt));
}

function writeDiagnosticLog(logger, level, diagnostics, outcome) {
  const log = logger?.[level];
  if (typeof log !== 'function') return;
  log.call(logger, {
    event: 'photo_nutrition_analysis',
    diagnosticRef: diagnostics.ref,
    ...outcome,
    timingsMs: diagnostics.timings,
  });
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
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_SIZE_BYTES) {
    throw new PhotoNutritionAiProxyError(
      413,
      'PHOTO_AI_IMAGE_TOO_LARGE',
      'Photo trop volumineuse : limite 8 Mo.',
    );
  }

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
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    throw new PhotoNutritionAiProxyError(
      400,
      'PHOTO_AI_INVALID_IMAGE',
      'Format non pris en charge. Utilise une image JPEG, PNG ou WebP.',
    );
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
    byteLength: photo.size,
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
  if (!raw) {
    throw new PhotoNutritionAiProxyError(
      502,
      'PHOTO_AI_INVALID_RESPONSE',
      'Réponse du service d’analyse vide.',
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new PhotoNutritionAiProxyError(
        502,
        'PHOTO_AI_INVALID_RESPONSE',
        'Réponse du service d’analyse non exploitable.',
      );
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      throw new PhotoNutritionAiProxyError(
        502,
        'PHOTO_AI_INVALID_RESPONSE',
        'Réponse du service d’analyse invalide.',
      );
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
    throw new PhotoNutritionAiProxyError(
      502,
      'PHOTO_AI_INVALID_RESPONSE',
      'Résultat nutritionnel incomplet.',
    );
  }

  const estimate = payload.estimate;
  const nutrition = estimate.nutrition;
  const amount = toNumber(estimate.amount);
  const caloriesKcal = toNumber(nutrition.caloriesKcal);

  if (!(amount > 0) || !(caloriesKcal >= 0)) {
    throw new PhotoNutritionAiProxyError(
      502,
      'PHOTO_AI_INVALID_RESPONSE',
      'Quantité ou calories invalides.',
    );
  }

  const confidence = payload.confidence === 'high' || payload.confidence === 'medium'
    ? payload.confidence
    : 'low';
  const remoteWarnings = Array.isArray(payload.warnings)
    ? payload.warnings
        .filter((warning) => typeof warning === 'string' && warning.trim())
        .map((warning) => warning.trim())
    : [];

  return {
    estimate: {
      name: typeof estimate.name === 'string' && estimate.name.trim()
        ? estimate.name.trim()
        : 'Repas à vérifier',
      amount,
      nutrition: {
        caloriesKcal,
        proteinGrams: Math.max(0, toNumber(nutrition.proteinGrams, 0)),
        carbohydratesGrams: Math.max(0, toNumber(nutrition.carbohydratesGrams, 0)),
        fatGrams: Math.max(0, toNumber(nutrition.fatGrams, 0)),
      },
    },
    confidence,
    warnings: remoteWarnings,
  };
}

function providerErrorForStatus(status) {
  if (status === 429) {
    return new PhotoNutritionAiProxyError(
      429,
      'PHOTO_AI_PROVIDER_QUOTA',
      'Limite temporaire du service d’analyse atteinte.',
    );
  }
  if (status >= 500) {
    return new PhotoNutritionAiProxyError(
      503,
      'PHOTO_AI_PROVIDER_UNAVAILABLE',
      'Service d’analyse temporairement indisponible.',
    );
  }
  return new PhotoNutritionAiProxyError(
    502,
    'PHOTO_AI_PROVIDER_ERROR',
    'Le service d’analyse a refusé la requête.',
  );
}

async function fetchGeminiPayload({
  image,
  apiKey,
  model,
  timeoutMs,
  fetcher = fetch,
}) {
  const endpoint = `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(buildGeminiPayload(image)),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new PhotoNutritionAiProxyError(
        504,
        'PHOTO_AI_PROVIDER_TIMEOUT',
        'Le service d’analyse a dépassé le délai prévu.',
        error,
      );
    }
    throw new PhotoNutritionAiProxyError(
      503,
      'PHOTO_AI_PROVIDER_UNAVAILABLE',
      'Impossible de joindre le service d’analyse.',
      error,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw providerErrorForStatus(response.status);

  try {
    return await response.json();
  } catch (error) {
    throw new PhotoNutritionAiProxyError(
      502,
      'PHOTO_AI_INVALID_RESPONSE',
      'Réponse du service d’analyse illisible.',
      error,
    );
  }
}

async function limitPhotoAnalysisWithD1(database, subject, now) {
  if (!database || typeof database.prepare !== 'function') return undefined;

  await database
    .prepare('DELETE FROM photo_nutrition_rate_limits WHERE expires_at <= ?')
    .bind(now)
    .run();

  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  const bucketKey = `${windowStart}:${subject}`;
  const row = await database
    .prepare(`
      INSERT INTO photo_nutrition_rate_limits (
        bucket_key,
        request_count,
        expires_at
      )
      VALUES (?, 1, ?)
      ON CONFLICT(bucket_key) DO UPDATE SET
        request_count = request_count + 1
      RETURNING request_count
    `)
    .bind(bucketKey, windowStart + (RATE_LIMIT_WINDOW_MS * 2))
    .first();
  const requestCount = Number(row?.request_count);

  if (!Number.isFinite(requestCount)) {
    throw new PhotoNutritionAiProxyError(
      503,
      'PHOTO_AI_RATE_LIMIT_NOT_CONFIGURED',
      'Analyse temporairement indisponible.',
    );
  }

  return requestCount <= PHOTO_ANALYSIS_LIMIT_PER_MINUTE;
}

async function authenticateActor(request, env, options) {
  const authenticateRequest = options.authenticateRequest
    ?? socialActivitySnapshotsInternals.authenticateRequest;
  return authenticateRequest(request, env, options.authFetcher ?? fetch);
}

async function rateLimitActor(actor, env, options) {
  const limiter = env?.PHOTO_NUTRITION_RATE_LIMITER;
  const limitSucceeded = limiter && typeof limiter.limit === 'function'
    ? (await limiter.limit({ key: actor.subject }))?.success
    : await limitPhotoAnalysisWithD1(
        env?.SOCIAL_DIRECTORY_DB,
        actor.subject,
        options.now?.() ?? Date.now(),
      );

  if (limitSucceeded === undefined) {
    throw new PhotoNutritionAiProxyError(
      503,
      'PHOTO_AI_RATE_LIMIT_NOT_CONFIGURED',
      'Analyse temporairement indisponible.',
    );
  }
  if (!limitSucceeded) {
    throw new PhotoNutritionAiProxyError(
      429,
      'PHOTO_AI_RATE_LIMITED',
      'Trop d’analyses rapprochées. Réessaie dans une minute.',
    );
  }
}

export async function handlePhotoNutritionAiProxyRequest(request, env = {}, options = {}) {
  const diagnostics = createDiagnostics(options);
  const logger = options.logger ?? console;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'cache-control': 'no-store',
        'x-sportpilot-request-id': diagnostics.ref,
      },
    });
  }

  if (request.method !== 'POST') {
    completeDiagnostics(diagnostics);
    writeDiagnosticLog(logger, 'warn', diagnostics, {
      outcome: 'rejected',
      status: 405,
      code: 'PHOTO_AI_METHOD_NOT_ALLOWED',
    });
    return jsonResponse(405, {
      code: 'PHOTO_AI_METHOD_NOT_ALLOWED',
      message: 'Méthode non autorisée.',
      diagnosticRef: diagnostics.ref,
    }, diagnostics.ref);
  }

  try {
    const config = getGeminiConfig(env);
    if (!config.apiKey) {
      throw new PhotoNutritionAiProxyError(
        503,
        'PHOTO_AI_NOT_CONFIGURED',
        'Service d’analyse non configuré.',
      );
    }

    const actor = await measure(diagnostics, 'authentication', () =>
      authenticateActor(request, env, options));
    await measure(diagnostics, 'rateLimit', () => rateLimitActor(actor, env, options));
    const image = await measure(diagnostics, 'imageRead', () => readImageFromRequest(request));
    const providerPayload = await measure(diagnostics, 'provider', () => fetchGeminiPayload({
      image,
      apiKey: config.apiKey,
      model: config.model,
      timeoutMs: options.providerTimeoutMs ?? config.timeoutMs,
      fetcher: options.fetcher,
    }));
    const payload = await measure(diagnostics, 'validation', async () =>
      normalizeGeminiContract(parseJsonFromGemini(providerPayload)));

    completeDiagnostics(diagnostics);
    writeDiagnosticLog(logger, 'info', diagnostics, {
      outcome: 'success',
      status: 200,
      model: config.model,
      imageBytes: image.byteLength,
    });
    return jsonResponse(200, { ...payload, diagnosticRef: diagnostics.ref }, diagnostics.ref);
  } catch (error) {
    completeDiagnostics(diagnostics);
    const status = isProxyError(error) ? error.status : 502;
    const code = isProxyError(error) ? error.code : 'PHOTO_AI_PROXY_ERROR';
    writeDiagnosticLog(logger, 'error', diagnostics, {
      outcome: 'error',
      status,
      code,
    });

    if (isProxyError(error)) {
      return jsonResponse(error.status, {
        code: error.code,
        message: error.message,
        diagnosticRef: diagnostics.ref,
      }, diagnostics.ref);
    }

    return jsonResponse(502, {
      code: 'PHOTO_AI_PROXY_ERROR',
      message: 'Service d’analyse indisponible.',
      diagnosticRef: diagnostics.ref,
    }, diagnostics.ref);
  }
}

export const photoNutritionAiProxyInternals = {
  buildGeminiPayload,
  getGeminiConfig,
  normalizeGeminiContract,
  parseJsonFromGemini,
  providerErrorForStatus,
};
