import { describe, expect, it, vi } from 'vitest';
import { handleOpenFoodFactsProxyRequest } from './openFoodFactsProxy.js';

describe('openFoodFactsProxy', () => {
  it('refuse les methodes autres que GET', async () => {
    const request = new Request(
      'https://sportpilot-pages.pages.dev/api/open-food-facts/search',
      { method: 'POST' },
    );

    const response = await handleOpenFoodFactsProxyRequest(
      request,
      'https://search.openfoodfacts.org/search',
      vi.fn(),
    );

    expect(response.status).toBe(405);
  });

  it('transmet la recherche et renvoie le JSON Open Food Facts', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          count: 1,
          hits: [{ code: '12345678', product_name: 'Yaourt grec' }],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const request = new Request(
      'https://sportpilot-pages.pages.dev/api/open-food-facts/search?q=yaourt+grec&page_size=12',
    );

    const response = await handleOpenFoodFactsProxyRequest(
      request,
      'https://search.openfoodfacts.org/search',
      fetcher,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      count: 1,
      hits: [{ code: '12345678' }],
    });

    expect(fetcher).toHaveBeenCalledTimes(1);

    const [requestedUrl, options] = fetcher.mock.calls[0];

    expect(requestedUrl).toBe(
      'https://search.openfoodfacts.org/search?q=yaourt+grec&page_size=12',
    );

    expect(options).toMatchObject({
      method: 'GET',
      redirect: 'follow',
    });

    expect(
      new Headers(options.headers).get('user-agent'),
    ).toContain('SportPilot/');
  });

  it('convertit une erreur reseau en erreur 502', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));

    const request = new Request(
      'https://sportpilot-pages.pages.dev/api/open-food-facts/search?q=test',
    );

    const response = await handleOpenFoodFactsProxyRequest(
      request,
      'https://search.openfoodfacts.org/search',
      fetcher,
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      code: 'OPEN_FOOD_FACTS_PROXY_UNAVAILABLE',
    });
  });
});
