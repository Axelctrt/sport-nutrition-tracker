import { OpenFoodFactsClient } from '@/infrastructure/open-food-facts/OpenFoodFactsClient';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const clientUrls = {
  searchApiUrl: 'https://search.openfoodfacts.org/search',
  legacySearchApiUrl: 'https://world.openfoodfacts.org/cgi/search.pl',
  productApiUrl: 'https://world.openfoodfacts.org/api/v3.6/product',
};

describe('OpenFoodFactsClient', () => {

  it('appelle le fetch natif avec son contexte global', async () => {
    const nativeFetch = vi.fn(function (this: unknown) {
      expect(this).toBe(globalThis);
      return Promise.resolve(jsonResponse({ count: 0, hits: [] }));
    });
    vi.stubGlobal('fetch', nativeFetch);

    try {
      const client = new OpenFoodFactsClient();
      await client.searchProducts('yaourt');
      expect(nativeFetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('utilise toujours le proxy local quand l’application tourne sur localhost', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ count: 0, hits: [] }));
    const client = new OpenFoodFactsClient({ fetcher });

    await client.searchProducts('yaourt');

    expect(String(fetcher.mock.calls[0]?.[0])).toMatch(/^\/api\/open-food-facts\/search\?/);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      cache: 'no-store',
      credentials: 'same-origin',
    });
  });

  it('effectue une recherche textuelle explicite et mappe les produits', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      count: 1,
      hits: [
        {
          code: '12345678',
          product_name: 'Yaourt',
          nutriments: {
            'energy-kcal_100g': 90,
            proteins_100g: 8,
            carbohydrates_100g: 5,
            fat_100g: 4,
          },
        },
      ],
    }));
    const client = new OpenFoodFactsClient({
      fetcher,
      now: () => new Date('2026-06-23T12:00:00.000Z'),
      ...clientUrls,
    });

    const result = await client.searchProducts('yaourt grec');

    expect(result.totalCount).toBe(1);
    expect(result.products[0]).toMatchObject({ name: 'Yaourt', barcode: '12345678' });
    const requestedUrl = String(fetcher.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain('https://search.openfoodfacts.org/search?');
    expect(requestedUrl).toContain('q=yaourt+grec');
    expect(requestedUrl).toContain('langs=fr%2Cen');
    expect(requestedUrl).toContain('page_size=12');
    expect(requestedUrl).toContain('boost_phrase=true');
    expect(requestedUrl).not.toContain('fields=');
  });


  it('accepte les résultats projetés de type Elasticsearch', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      count: 1,
      page: 1,
      page_size: 12,
      page_count: 1,
      took: 4,
      timed_out: false,
      is_count_exact: true,
      hits: [
        {
          _id: '3017620422003',
          fields: {
            product_name: ['Pâte à tartiner'],
            brands: ['Ferrero'],
            'nutriments.energy-kcal_100g': ['539'],
            'nutriments.proteins_100g': [6.3],
            'nutriments.carbohydrates_100g': [57.5],
            'nutriments.fat_100g': [30.9],
          },
        },
      ],
    }));
    const client = new OpenFoodFactsClient({ fetcher, ...clientUrls });

    const result = await client.searchProducts('pâte à tartiner');

    expect(result.products[0]).toMatchObject({
      barcode: '3017620422003',
      name: 'Pâte à tartiner',
      brand: 'Ferrero',
      isNutritionComplete: true,
      nutritionPer100: {
        caloriesKcal: 539,
        proteinGrams: 6.3,
        carbohydratesGrams: 57.5,
        fatGrams: 30.9,
      },
    });
  });

  it('accepte les champs localisés et les nombres encodés en texte', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      count: 1,
      hits: [
        {
          _source: {
            code: 1234567890123,
            product_name: { fr: 'Yaourt grec', en: 'Greek yogurt' },
            brands: ['Marque test'],
            nutriments: {
              'energy-kcal_100g': '97,5',
              proteins_100g: '8.2',
              carbohydrates_100g: '4.1',
              fat_100g: '5',
            },
          },
        },
      ],
    }));
    const client = new OpenFoodFactsClient({ fetcher, ...clientUrls });

    const result = await client.searchProducts('yaourt grec');

    expect(result.products[0]).toMatchObject({
      barcode: '1234567890123',
      name: 'Yaourt grec',
      brand: 'Marque test',
      isNutritionComplete: true,
    });
    expect(result.products[0]?.nutritionPer100.caloriesKcal).toBe(97.5);
  });

  it('ne transforme pas une réponse d’erreur HTTP 200 en liste vide', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      debug: {},
      errors: [
        {
          title: 'QueryCheckError',
          description: 'Recherche invalide',
          status: 400,
        },
      ],
    }));
    const client = new OpenFoodFactsClient({ fetcher, ...clientUrls });

    await expect(client.searchProducts('test')).rejects.toMatchObject({
      code: 'invalid-response',
      message: expect.stringContaining('Recherche invalide'),
    });
  });

  it('utilise le service historique en secours si le moteur principal est inaccessible', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({
        count: 1,
        products: [
          {
            code: '12345678',
            product_name: 'Yaourt de secours',
            nutriments: {
              'energy-kcal_100g': 90,
              proteins_100g: 8,
              carbohydrates_100g: 5,
              fat_100g: 4,
            },
          },
        ],
      }));
    const client = new OpenFoodFactsClient({ fetcher, ...clientUrls });

    const result = await client.searchProducts('yaourt');

    expect(result.products[0]?.name).toBe('Yaourt de secours');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[1]?.[0])).toContain('/cgi/search.pl?');
    expect(String(fetcher.mock.calls[1]?.[0])).toContain('search_terms=yaourt');
  });

  it('retourne un diagnostic consolidé si les deux recherches échouent', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({}, 503));
    const client = new OpenFoodFactsClient({ fetcher, ...clientUrls });

    await expect(client.searchProducts('yaourt')).rejects.toMatchObject({
      code: 'unavailable',
      message: expect.stringContaining('Les deux services de recherche Open Food Facts ont échoué'),
    });
  });

  it('récupère un produit par code-barres via l’API v3.6', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      code: '3017624010701',
      status: 1,
      product: {
        product_name: 'Produit code-barres',
        nutriments: {
          'energy-kcal_100g': 100,
          proteins_100g: 1,
          carbohydrates_100g: 2,
          fat_100g: 3,
        },
      },
    }));
    const client = new OpenFoodFactsClient({ fetcher, ...clientUrls });

    const result = await client.getProductByBarcode('3017624010701');

    expect(result?.name).toBe('Produit code-barres');
    const requestedUrl = String(fetcher.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain('/api/v3.6/product/3017624010701.json?');
    expect(requestedUrl).toContain('app_name=SportPilot');
    expect(requestedUrl).toContain(`app_version=${__APP_VERSION__}`);
  });

  it('retourne undefined pour un produit absent', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      code: '12345678',
      status: 0,
      status_verbose: 'product not found',
    }));
    const client = new OpenFoodFactsClient({ fetcher, ...clientUrls });

    await expect(client.getProductByBarcode('12345678')).resolves.toBeUndefined();
  });

  it('signale clairement une limitation de débit sans utiliser le secours', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 429));
    const client = new OpenFoodFactsClient({ fetcher, ...clientUrls });

    await expect(client.searchProducts('test')).rejects.toMatchObject({
      code: 'rate-limit',
      status: 429,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('signale une réponse invalide', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ hits: 'invalid' }));
    const client = new OpenFoodFactsClient({ fetcher, ...clientUrls });

    await expect(client.searchProducts('test')).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });

  it('convertit une double erreur réseau en indisponibilité diagnostiquée', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    const client = new OpenFoodFactsClient({ fetcher, ...clientUrls });

    await expect(client.searchProducts('test')).rejects.toMatchObject({
      code: 'unavailable',
    });
  });
});
