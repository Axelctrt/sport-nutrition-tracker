import { OpenFoodFactsError } from '@/infrastructure/open-food-facts/OpenFoodFactsError';
import { mapOpenFoodFactsProduct, type OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import {
  openFoodFactsBarcodeResponseSchema,
  openFoodFactsLegacySearchResponseSchema,
  openFoodFactsRawProductSchema,
  openFoodFactsSearchErrorResponseSchema,
  openFoodFactsSearchResponseSchema,
  type OpenFoodFactsRawProduct,
} from '@/infrastructure/open-food-facts/OpenFoodFactsSchemas';
import { normalizeOpenFoodFactsBarcode } from '@/infrastructure/open-food-facts/barcode';

const PRODUCT_API_ORIGIN = 'https://world.openfoodfacts.org';
const SEARCH_API_URL = 'https://search.openfoodfacts.org/search';
const LEGACY_SEARCH_API_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const DEV_SEARCH_PROXY_URL = '/api/open-food-facts/search';
const DEV_LEGACY_SEARCH_PROXY_URL = '/api/open-food-facts/legacy-search';
const DEV_PRODUCT_PROXY_URL = '/api/open-food-facts/product';
const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'product_name_fr',
  'generic_name',
  'generic_name_fr',
  'brands',
  'serving_size',
  'serving_quantity',
  'serving_quantity_unit',
  'nutrition_data_per',
  'product_quantity_unit',
  'nutriments',
].join(',');
const REQUEST_TIMEOUT_MS = 15_000;
const LOCAL_DEVELOPMENT_HOSTS = new Set(['127.0.0.1', 'localhost']);

export interface OpenFoodFactsSearchResult {
  products: OpenFoodFactsProductCandidate[];
  totalCount?: number;
}

interface OpenFoodFactsClientOptions {
  fetcher?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
  searchApiUrl?: string;
  legacySearchApiUrl?: string;
  productApiUrl?: string;
}

function isLocalApplicationOrigin(): boolean {
  const locationValue = globalThis.location;
  return locationValue !== undefined
    && LOCAL_DEVELOPMENT_HOSTS.has(locationValue.hostname);
}

function defaultSearchApiUrl(): string {
  return isLocalApplicationOrigin() ? DEV_SEARCH_PROXY_URL : SEARCH_API_URL;
}

function defaultLegacySearchApiUrl(): string {
  return isLocalApplicationOrigin() ? DEV_LEGACY_SEARCH_PROXY_URL : LEGACY_SEARCH_API_URL;
}

function defaultProductApiUrl(): string {
  return isLocalApplicationOrigin()
    ? DEV_PRODUCT_PROXY_URL
    : `${PRODUCT_API_ORIGIN}/api/v3.6/product`;
}

function mergeAbortSignals(signal: AbortSignal | undefined, timeoutMs: number): {
  signal: AbortSignal;
  didTimeout: () => boolean;
  cleanup: () => void;
} {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromParent = () => controller.abort();
  signal?.addEventListener('abort', abortFromParent, { once: true });

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      globalThis.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortFromParent);
    },
  };
}

function buildCommonParameters(): URLSearchParams {
  return new URLSearchParams({
    app_name: 'SportPilot',
    app_version: '0.13.0',
    app_platform: 'Web',
    lc: 'fr',
    fields: PRODUCT_FIELDS,
  });
}

function mapHttpError(status: number): OpenFoodFactsError {
  if (status === 404) {
    return new OpenFoodFactsError('Produit introuvable dans Open Food Facts.', 'not-found', status);
  }
  if (status === 429) {
    return new OpenFoodFactsError(
      'Trop de recherches ont été envoyées. Réessaie dans quelques instants.',
      'rate-limit',
      status,
    );
  }
  if (status === 502 || status === 503 || status === 504) {
    return new OpenFoodFactsError(
      `Open Food Facts est temporairement indisponible (HTTP ${status}).`,
      'unavailable',
      status,
    );
  }
  return new OpenFoodFactsError(
    `Open Food Facts a répondu avec l’erreur HTTP ${status}.`,
    'http',
    status,
  );
}

function canTryLegacyFallback(error: unknown): boolean {
  return error instanceof OpenFoodFactsError
    && ['network', 'timeout', 'unavailable'].includes(error.code);
}

function mapSearchProducts(
  rawProducts: OpenFoodFactsRawProduct[],
  fetchedAt: string,
): OpenFoodFactsProductCandidate[] {
  const seenBarcodes = new Set<string>();

  return rawProducts
    .map((product) => mapOpenFoodFactsProduct(product, undefined, fetchedAt))
    .filter((product): product is OpenFoodFactsProductCandidate => product !== undefined)
    .filter((product) => {
      const normalized = normalizeOpenFoodFactsBarcode(product.barcode);
      if (seenBarcodes.has(normalized)) return false;
      seenBarcodes.add(normalized);
      return true;
    });
}


function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function firstValue(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.find((item) => item !== null && item !== undefined && item !== '');
}

function mergeSearchHitRecord(hit: unknown): Record<string, unknown> | undefined {
  const outer = asRecord(hit);
  if (!outer) return undefined;

  const nested = ['_source', 'source', 'document', 'product']
    .map((key) => asRecord(outer[key]))
    .find((candidate) => candidate !== undefined);
  const projectedFields = asRecord(outer.fields);
  const merged: Record<string, unknown> = {
    ...outer,
    ...(nested ?? {}),
    ...(projectedFields ?? {}),
  };

  for (const [key, value] of Object.entries(merged)) {
    merged[key] = firstValue(value);
  }

  if (merged.code === undefined || merged.code === null || merged.code === '') {
    merged.code = firstValue(
      outer._id
      ?? outer.id
      ?? outer.barcode
      ?? nested?.code
      ?? nested?._id
      ?? nested?.id
      ?? projectedFields?.code,
    );
  }

  if (!asRecord(merged.nutriments)) {
    const nutriments: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(merged)) {
      if (!key.startsWith('nutriments.')) continue;
      nutriments[key.slice('nutriments.'.length)] = firstValue(value);
    }
    if (Object.keys(nutriments).length > 0) merged.nutriments = nutriments;
  }

  return merged;
}

function parseSearchHit(hit: unknown): OpenFoodFactsRawProduct | undefined {
  const candidate = mergeSearchHitRecord(hit);
  if (!candidate) return undefined;

  const parsed = openFoodFactsRawProductSchema.safeParse(candidate);
  if (!parsed.success || !parsed.data.code) return undefined;
  return parsed.data;
}

export class OpenFoodFactsClient {
  private readonly fetcher: typeof fetch;
  private readonly now: () => Date;
  private readonly timeoutMs: number;
  private readonly searchApiUrl: string;
  private readonly legacySearchApiUrl: string;
  private readonly productApiUrl: string;

  constructor(options: OpenFoodFactsClientOptions = {}) {
    this.fetcher = options.fetcher ?? ((input, init) => globalThis.fetch(input, init));
    this.now = options.now ?? (() => new Date());
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
    this.searchApiUrl = options.searchApiUrl ?? defaultSearchApiUrl();
    this.legacySearchApiUrl = options.legacySearchApiUrl ?? defaultLegacySearchApiUrl();
    this.productApiUrl = options.productApiUrl ?? defaultProductApiUrl();
  }

  async searchProducts(
    query: string,
    signal?: AbortSignal,
  ): Promise<OpenFoodFactsSearchResult> {
    const normalizedQuery = query.trim();

    try {
      return await this.searchWithSearchALicious(normalizedQuery, signal);
    } catch (primaryError) {
      if (signal?.aborted || !canTryLegacyFallback(primaryError)) throw primaryError;

      try {
        return await this.searchWithLegacyEndpoint(normalizedQuery, signal);
      } catch (fallbackError) {
        if (signal?.aborted) throw fallbackError;

        const primaryMessage = primaryError instanceof Error ? primaryError.message : 'erreur inconnue';
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'erreur inconnue';
        throw new OpenFoodFactsError(
          `Les deux services de recherche Open Food Facts ont échoué. Service principal : ${primaryMessage} Service de secours : ${fallbackMessage}`,
          'unavailable',
        );
      }
    }
  }

  async getProductByBarcode(
    barcode: string,
    signal?: AbortSignal,
  ): Promise<OpenFoodFactsProductCandidate | undefined> {
    const normalizedBarcode = normalizeOpenFoodFactsBarcode(barcode);
    const parameters = buildCommonParameters();
    const payload = await this.requestJson(
      `${this.productApiUrl}/${encodeURIComponent(normalizedBarcode)}.json?${parameters.toString()}`,
      signal,
      true,
    );

    if (payload === undefined) return undefined;

    const parsed = openFoodFactsBarcodeResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new OpenFoodFactsError(
        'La réponse produit Open Food Facts est invalide.',
        'invalid-response',
      );
    }

    const notFound = parsed.data.status === 0
      || parsed.data.status === '0'
      || parsed.data.result?.id === 'product_not_found'
      || parsed.data.result?.status === 0
      || parsed.data.result?.status === '0';

    if (notFound || !parsed.data.product) return undefined;

    return mapOpenFoodFactsProduct(
      parsed.data.product,
      parsed.data.code ?? normalizedBarcode,
      this.now().toISOString(),
    );
  }

  private async searchWithSearchALicious(
    query: string,
    signal?: AbortSignal,
  ): Promise<OpenFoodFactsSearchResult> {
    const parameters = new URLSearchParams({
      q: query,
      langs: 'fr,en',
      page_size: '12',
      page: '1',
      boost_phrase: 'true',
    });
    const payload = await this.requestJson(
      `${this.searchApiUrl}?${parameters.toString()}`,
      signal,
    );
    const errorResponse = openFoodFactsSearchErrorResponseSchema.safeParse(payload);
    if (errorResponse.success) {
      const detail = errorResponse.data.errors
        .map((error) => error.description ?? error.title ?? 'erreur non détaillée')
        .join(' ; ');
      throw new OpenFoodFactsError(
        `Search-a-licious a refusé la recherche : ${detail}`,
        'invalid-response',
      );
    }

    const parsed = openFoodFactsSearchResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new OpenFoodFactsError(
        'La réponse du moteur Search-a-licious est invalide.',
        'invalid-response',
      );
    }

    const rawProducts = parsed.data.hits.flatMap((hit) => {
      const product = parseSearchHit(hit);
      return product ? [product] : [];
    });

    if (parsed.data.hits.length > 0 && rawProducts.length === 0) {
      throw new OpenFoodFactsError(
        'Search-a-licious a renvoyé des résultats dans un format non pris en charge.',
        'invalid-response',
      );
    }

    const products = mapSearchProducts(rawProducts, this.now().toISOString());

    if ((parsed.data.count ?? parsed.data.hits.length) > 0 && products.length === 0) {
      throw new OpenFoodFactsError(
        'Open Food Facts a trouvé des produits, mais aucun code-barres exploitable n’a été reçu.',
        'invalid-response',
      );
    }

    return {
      products,
      ...(parsed.data.count === undefined ? {} : { totalCount: parsed.data.count }),
    };
  }

  private async searchWithLegacyEndpoint(
    query: string,
    signal?: AbortSignal,
  ): Promise<OpenFoodFactsSearchResult> {
    const parameters = new URLSearchParams({
      action: 'process',
      search_simple: '1',
      json: '1',
      page_size: '12',
      page: '1',
      search_terms: query,
      fields: PRODUCT_FIELDS,
    });
    const payload = await this.requestJson(
      `${this.legacySearchApiUrl}?${parameters.toString()}`,
      signal,
    );
    const parsed = openFoodFactsLegacySearchResponseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new OpenFoodFactsError(
        'La réponse du service de recherche de secours est invalide.',
        'invalid-response',
      );
    }

    return {
      products: mapSearchProducts(parsed.data.products, this.now().toISOString()),
      ...(parsed.data.count === undefined ? {} : { totalCount: parsed.data.count }),
    };
  }

  private async requestJson(
    url: string,
    signal?: AbortSignal,
    allowNotFound = false,
  ): Promise<unknown | undefined> {
    const abort = mergeAbortSignals(signal, this.timeoutMs);

    try {
      const response = await this.fetcher(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        signal: abort.signal,
      });

      if (allowNotFound && response.status === 404) return undefined;
      if (!response.ok) throw mapHttpError(response.status);

      try {
        return await response.json();
      } catch {
        throw new OpenFoodFactsError(
          'Open Food Facts a renvoyé une réponse illisible.',
          'invalid-response',
        );
      }
    } catch (error) {
      if (error instanceof OpenFoodFactsError) throw error;
      if (abort.signal.aborted) {
        if (signal?.aborted) {
          throw new OpenFoodFactsError('La recherche a été annulée.', 'aborted');
        }
        if (abort.didTimeout()) {
          throw new OpenFoodFactsError(
            'Open Food Facts ne répond pas dans le délai prévu.',
            'timeout',
          );
        }
      }
      const technicalMessage = error instanceof Error ? error.message : String(error);
      console.error('[Open Food Facts] Échec de requête', { url, technicalMessage });
      throw new OpenFoodFactsError(
        `Impossible de joindre Open Food Facts depuis ${globalThis.location?.origin ?? 'cette origine'}. Détail technique : ${technicalMessage}`,
        'network',
      );
    } finally {
      abort.cleanup();
    }
  }
}

export const openFoodFactsClient = new OpenFoodFactsClient();
