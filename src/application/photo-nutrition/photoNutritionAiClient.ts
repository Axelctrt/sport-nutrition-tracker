import { preparePhotoForNutritionAnalysis } from '@/application/photo-nutrition/photoNutritionImagePreparation';
import type {
  PhotoNutritionAnalysisPort,
  PhotoNutritionAnalysisResult,
  PhotoNutritionConfidence,
  PhotoNutritionEstimate,
} from '@/application/photo-nutrition/photoNutritionEstimationService';
import type { NutritionValues } from '@/domain/models/food';
import {
  resolveSocialCloudApiCredentials,
  type SocialCloudApiCredentialsProvider,
} from '@/infrastructure/sync-prototype/socialCloudApiCredentials';

export interface PhotoNutritionAiConfig {
  enabled: boolean;
  endpointUrl: string;
  timeoutMs: number;
}

export interface PhotoNutritionAiClientOptions {
  endpointUrl: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  credentialsProvider?: SocialCloudApiCredentialsProvider;
  preparePhoto?: (file: File) => Promise<File>;
}

export type PhotoNutritionAiErrorCode =
  | 'PHOTO_AI_CANCELLED'
  | 'PHOTO_AI_CLIENT_TIMEOUT'
  | 'PHOTO_AI_NETWORK_UNAVAILABLE'
  | 'PHOTO_AI_AUTH_REQUIRED'
  | 'PHOTO_AI_INVALID_RESPONSE'
  | 'PHOTO_AI_UNKNOWN';

export class PhotoNutritionAiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly diagnosticRef?: string;

  constructor(
    code: string,
    message: string,
    details: { status?: number; diagnosticRef?: string; cause?: unknown } = {},
  ) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = 'PhotoNutritionAiError';
    this.code = code;
    if (details.status !== undefined) this.status = details.status;
    if (details.diagnosticRef) this.diagnosticRef = details.diagnosticRef;
  }
}

interface RemotePhotoNutritionResponse {
  estimate?: unknown;
  confidence?: unknown;
  warnings?: unknown;
  code?: unknown;
  message?: unknown;
  diagnosticRef?: unknown;
}

type RemoteEstimatePayload = {
  name?: unknown;
  amount?: unknown;
  nutrition?: unknown;
};

const DEFAULT_ENDPOINT_URL = '/api/photo-nutrition/analyze';
const DEPRECATED_ENDPOINT_URL = '/api/photo-nutrition-ai';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_PREPARED_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const SENSITIVE_QUERY_KEYS = ['key', 'api_key', 'apikey', 'token', 'secret', 'client_secret', 'access_token'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function getEnvValue(env: Record<string, unknown>, key: string): string {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function parseTimeout(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 3_000 && parsed <= 30_000 ? parsed : DEFAULT_TIMEOUT_MS;
}

function normalizeEndpoint(endpointUrl: string): string {
  const endpoint = endpointUrl.trim();
  return endpoint === DEPRECATED_ENDPOINT_URL ? DEFAULT_ENDPOINT_URL : endpoint;
}

export function assertPhotoNutritionAiEndpoint(endpointUrl: string): void {
  const endpoint = endpointUrl.trim();
  if (!endpoint) throw new Error('Endpoint IA photo manquant.');

  const isRelative = endpoint.startsWith('/');
  const url = new URL(endpoint, isRelative ? 'https://sportpilot.local' : undefined);

  if (!isRelative && url.protocol !== 'https:') {
    throw new Error('Endpoint IA photo non sécurisé : utilise HTTPS ou une route relative du backend.');
  }

  for (const key of url.searchParams.keys()) {
    if (SENSITIVE_QUERY_KEYS.includes(key.toLowerCase())) {
      throw new Error('Endpoint IA photo non sécurisé : ne place aucune clé ou aucun token dans une URL VITE_*.');
    }
  }
}

export function readPhotoNutritionAiConfig(
  env: Record<string, unknown> = import.meta.env,
): PhotoNutritionAiConfig {
  const endpointUrl = normalizeEndpoint(
    getEnvValue(env, 'VITE_PHOTO_NUTRITION_AI_ENDPOINT') || DEFAULT_ENDPOINT_URL,
  );
  return {
    enabled: true,
    endpointUrl,
    timeoutMs: parseTimeout(getEnvValue(env, 'VITE_PHOTO_NUTRITION_AI_TIMEOUT_MS')),
  };
}

function createRequestSignal(timeoutMs: number, parentSignal?: AbortSignal): {
  signal: AbortSignal;
  didTimeout: () => boolean;
  cleanup: () => void;
} {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort();
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (parentSignal?.aborted) controller.abort();
  else parentSignal?.addEventListener('abort', abortFromParent, { once: true });

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      globalThis.clearTimeout(timeout);
      parentSignal?.removeEventListener('abort', abortFromParent);
    },
  };
}

function readRemoteEstimate(payload: RemotePhotoNutritionResponse): RemoteEstimatePayload {
  if (!isRecord(payload.estimate)) {
    throw new PhotoNutritionAiError(
      'PHOTO_AI_INVALID_RESPONSE',
      'L’analyse a répondu avec un résultat incomplet. Réessaie avec une autre photo.',
    );
  }
  return payload.estimate;
}

function readRemoteNutrition(estimate: RemoteEstimatePayload): Record<keyof NutritionValues, unknown> {
  if (!isRecord(estimate.nutrition)) {
    throw new PhotoNutritionAiError(
      'PHOTO_AI_INVALID_RESPONSE',
      'L’analyse n’a pas pu estimer les valeurs nutritionnelles.',
    );
  }

  return estimate.nutrition as Record<keyof NutritionValues, unknown>;
}

function normalizeEstimate(payload: RemotePhotoNutritionResponse): PhotoNutritionEstimate {
  const estimate = readRemoteEstimate(payload);
  const nutrition = readRemoteNutrition(estimate);
  const amount = toNumber(estimate.amount, Number.NaN);
  const caloriesKcal = toNumber(nutrition.caloriesKcal, Number.NaN);

  if (!(amount > 0) || !(caloriesKcal >= 0)) {
    throw new PhotoNutritionAiError(
      'PHOTO_AI_INVALID_RESPONSE',
      'L’analyse a produit une estimation incomplète. Réessaie ou saisis le repas manuellement.',
    );
  }

  return {
    name: typeof estimate.name === 'string' && estimate.name.trim() ? estimate.name.trim() : 'Repas à vérifier',
    amount,
    nutrition: {
      caloriesKcal,
      proteinGrams: Math.max(0, toNumber(nutrition.proteinGrams)),
      carbohydratesGrams: Math.max(0, toNumber(nutrition.carbohydratesGrams)),
      fatGrams: Math.max(0, toNumber(nutrition.fatGrams)),
    },
  };
}

function normalizeConfidence(value: unknown): PhotoNutritionConfidence {
  return value === 'medium' || value === 'high' ? value : 'low';
}

function normalizeWarnings(payload: RemotePhotoNutritionResponse): string[] {
  const remoteWarnings = Array.isArray(payload.warnings)
    ? payload.warnings
        .filter((warning): warning is string => typeof warning === 'string' && warning.trim().length > 0)
        .map((warning) => warning.trim())
    : [];

  return ['Estimation à vérifier avant de l’ajouter au repas.', ...remoteWarnings];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function readResponsePayload(response: Response): Promise<RemotePhotoNutritionResponse | undefined> {
  try {
    const payload: unknown = await response.json();
    return isRecord(payload) ? payload : undefined;
  } catch {
    return undefined;
  }
}

function messageForProxyError(code: string | undefined, status: number): string {
  switch (code) {
    case 'PHOTO_AI_RATE_LIMITED':
      return 'Trop d’analyses ont été demandées. Réessaie dans une minute.';
    case 'PHOTO_AI_PROVIDER_QUOTA':
      return 'Le service d’analyse a atteint sa limite temporaire. Réessaie un peu plus tard.';
    case 'PHOTO_AI_PROVIDER_TIMEOUT':
      return 'L’analyse du repas a pris trop de temps. Réessaie avec une photo plus nette.';
    case 'PHOTO_AI_PROVIDER_UNAVAILABLE':
    case 'PHOTO_AI_NOT_CONFIGURED':
      return 'Le service d’analyse est temporairement indisponible.';
    case 'PHOTO_AI_INVALID_IMAGE':
    case 'PHOTO_AI_INVALID_FORM':
      return 'La photo n’a pas pu être envoyée. Choisis-en une autre puis réessaie.';
    case 'PHOTO_AI_IMAGE_TOO_LARGE':
      return 'La photo est encore trop volumineuse pour être analysée.';
    case 'PHOTO_AI_INVALID_RESPONSE':
      return 'L’analyse n’a pas renvoyé de résultat exploitable.';
    default:
      if (status === 401 || status === 403) {
        return 'Ta connexion SportPilot a expiré. Reconnecte-toi puis réessaie.';
      }
      return 'L’analyse est indisponible pour le moment.';
  }
}

export function createRemotePhotoNutritionAnalysisPort({
  endpointUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetcher = fetch,
  credentialsProvider,
  preparePhoto = preparePhotoForNutritionAnalysis,
}: PhotoNutritionAiClientOptions): PhotoNutritionAnalysisPort {
  const normalizedEndpoint = normalizeEndpoint(endpointUrl);
  assertPhotoNutritionAiEndpoint(normalizedEndpoint);

  return {
    async analyze(file, signal) {
      const credentials = await resolveSocialCloudApiCredentials(credentialsProvider);
      if (!credentials) {
        throw new PhotoNutritionAiError(
          'PHOTO_AI_AUTH_REQUIRED',
          'Connecte ton compte SportPilot pour utiliser l’analyse photo.',
        );
      }

      const preparedPhoto = await preparePhoto(file);
      if (preparedPhoto.size > MAX_PREPARED_IMAGE_SIZE_BYTES) {
        throw new PhotoNutritionAiError(
          'PHOTO_AI_IMAGE_TOO_LARGE',
          'La photo est encore trop volumineuse pour être analysée.',
        );
      }

      const formData = new FormData();
      formData.append('photo', preparedPhoto, preparedPhoto.name || 'repas.jpg');
      formData.append('contractVersion', 'sportpilot-photo-nutrition-v1');
      const requestSignal = createRequestSignal(timeoutMs, signal);

      let response: Response;
      try {
        response = await fetcher(normalizedEndpoint, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${credentials.accessToken}`,
          },
          body: formData,
          signal: requestSignal.signal,
        });
      } catch (error) {
        if (signal?.aborted) {
          throw new PhotoNutritionAiError('PHOTO_AI_CANCELLED', 'Analyse annulée.', { cause: error });
        }
        if (requestSignal.didTimeout()) {
          throw new PhotoNutritionAiError(
            'PHOTO_AI_CLIENT_TIMEOUT',
            'L’envoi ou l’analyse a pris trop de temps. Réessaie avec une connexion stable.',
            { cause: error },
          );
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new PhotoNutritionAiError(
            'PHOTO_AI_NETWORK_UNAVAILABLE',
            'Aucune connexion réseau. Vérifie ta connexion puis réessaie.',
            { cause: error },
          );
        }
        throw new PhotoNutritionAiError(
          'PHOTO_AI_UNKNOWN',
          'Impossible de joindre le service d’analyse.',
          { cause: error },
        );
      } finally {
        requestSignal.cleanup();
      }

      const payload = await readResponsePayload(response);
      const diagnosticRef = stringValue(payload?.diagnosticRef)
        ?? stringValue(response.headers.get('x-sportpilot-request-id'));

      if (!response.ok) {
        const code = stringValue(payload?.code);
        throw new PhotoNutritionAiError(
          code ?? 'PHOTO_AI_UNKNOWN',
          messageForProxyError(code, response.status),
          {
            status: response.status,
            ...(diagnosticRef ? { diagnosticRef } : {}),
          },
        );
      }

      if (!payload) {
        throw new PhotoNutritionAiError(
          'PHOTO_AI_INVALID_RESPONSE',
          'Le service d’analyse a renvoyé une réponse illisible.',
          {
            status: response.status,
            ...(diagnosticRef ? { diagnosticRef } : {}),
          },
        );
      }

      return {
        estimate: normalizeEstimate(payload),
        mode: 'remote-ai',
        confidence: normalizeConfidence(payload.confidence),
        privacy: 'external-consent-required',
        warnings: normalizeWarnings(payload),
      } satisfies PhotoNutritionAnalysisResult;
    },
  };
}

export const photoNutritionAiClientInternals = {
  DEFAULT_ENDPOINT_URL,
  DEFAULT_TIMEOUT_MS,
  normalizeEndpoint,
};
