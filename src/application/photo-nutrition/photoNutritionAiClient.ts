import type {
  PhotoNutritionAnalysisPort,
  PhotoNutritionAnalysisResult,
  PhotoNutritionConfidence,
  PhotoNutritionEstimate,
} from '@/application/photo-nutrition/photoNutritionEstimationService';
import type { NutritionValues } from '@/domain/models/food';

export interface PhotoNutritionAiConfig {
  enabled: boolean;
  endpointUrl: string;
  timeoutMs: number;
}

export interface PhotoNutritionAiClientOptions {
  endpointUrl: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

interface RemotePhotoNutritionResponse {
  estimate?: Partial<PhotoNutritionEstimate> & {
    nutrition?: Partial<NutritionValues>;
  };
  confidence?: PhotoNutritionConfidence;
  warnings?: string[];
}

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const SENSITIVE_QUERY_KEYS = ['key', 'api_key', 'apikey', 'token', 'secret', 'client_secret', 'access_token'];

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
  const endpointUrl = getEnvValue(env, 'VITE_PHOTO_NUTRITION_AI_ENDPOINT');
  return {
    enabled: endpointUrl.length > 0,
    endpointUrl,
    timeoutMs: parseTimeout(getEnvValue(env, 'VITE_PHOTO_NUTRITION_AI_TIMEOUT_MS')),
  };
}

function mergeSignals(timeoutMs: number, parentSignal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();

  parentSignal?.addEventListener('abort', abort, { once: true });
  controller.signal.addEventListener('abort', () => {
    window.clearTimeout(timeout);
    parentSignal?.removeEventListener('abort', abort);
  }, { once: true });

  return controller.signal;
}

function normalizeEstimate(payload: RemotePhotoNutritionResponse): PhotoNutritionEstimate {
  const estimate = payload.estimate ?? {};
  const nutrition = (estimate.nutrition ?? {}) as Partial<NutritionValues>;
  const amount = toNumber(estimate.amount, 250);

  if (!(amount > 0)) throw new Error('Réponse IA invalide : quantité manquante.');

  return {
    name: typeof estimate.name === 'string' && estimate.name.trim() ? estimate.name.trim() : 'Repas IA à vérifier',
    amount,
    nutrition: {
      caloriesKcal: toNumber(nutrition.caloriesKcal),
      proteinGrams: toNumber(nutrition.proteinGrams),
      carbohydratesGrams: toNumber(nutrition.carbohydratesGrams),
      fatGrams: toNumber(nutrition.fatGrams),
    },
  };
}

function normalizeConfidence(value: unknown): PhotoNutritionConfidence {
  return value === 'medium' || value === 'high' ? value : 'low';
}

function normalizeWarnings(payload: RemotePhotoNutritionResponse): string[] {
  const remoteWarnings = Array.isArray(payload.warnings)
    ? payload.warnings.filter((warning): warning is string => typeof warning === 'string' && warning.trim().length > 0)
    : [];

  return [
    'Analyse IA distante via proxy sécurisé : corrige les valeurs avant validation.',
    'Photo envoyée uniquement après consentement explicite et non conservée dans le journal alimentaire.',
    ...remoteWarnings,
  ];
}

export function createRemotePhotoNutritionAnalysisPort({
  endpointUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetcher = fetch,
}: PhotoNutritionAiClientOptions): PhotoNutritionAnalysisPort {
  assertPhotoNutritionAiEndpoint(endpointUrl);

  return {
    async analyze(file, signal) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        throw new Error('Photo trop volumineuse : limite 8 Mo pour l’analyse IA.');
      }

      // Le navigateur calcule l’en-tête multipart/form-data avec sa boundary.
      const formData = new FormData();
      formData.append('photo', file, file.name || 'repas.jpg');
      formData.append('contractVersion', 'sportpilot-photo-nutrition-v1');

      let response: Response;
      try {
        response = await fetcher(endpointUrl, {
          method: 'POST',
          body: formData,
          signal: mergeSignals(timeoutMs, signal),
        });
      } catch (error) {
        if (signal?.aborted) throw new Error('Analyse IA annulée.');
        if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Analyse IA trop longue : réessaie ou utilise le fallback local.');
        if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('Réseau indisponible.');
        throw new Error('Analyse IA indisponible : fallback local conseillé.');
      }

      if (!response.ok) {
        throw new Error(`Analyse IA indisponible (${response.status}) : fallback local conseillé.`);
      }

      const payload = await response.json() as RemotePhotoNutritionResponse;
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
