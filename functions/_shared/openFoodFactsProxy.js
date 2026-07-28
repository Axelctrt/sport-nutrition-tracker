const USER_AGENT =
  'SportPilot/0.33.2 (Cloudflare Pages; Open Food Facts integration)';

function createCorsHeaders(contentType = 'application/json; charset=utf-8') {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
  });
}

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: createCorsHeaders(),
  });
}

export async function handleOpenFoodFactsProxyRequest(
  request,
  upstreamUrl,
  fetcher = globalThis.fetch.bind(globalThis),
) {
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders(),
    });
  }

  if (method !== 'GET') {
    const response = jsonResponse(
      {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only GET requests are accepted.',
      },
      405,
    );

    response.headers.set('Allow', 'GET, OPTIONS');
    return response;
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(upstreamUrl);
  targetUrl.search = incomingUrl.search;

  try {
    const upstreamResponse = await fetcher(targetUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'fr,en;q=0.8',
        'User-Agent': USER_AGENT,
      },
      redirect: 'follow',
    });

    const contentType =
      upstreamResponse.headers.get('content-type') ??
      'application/json; charset=utf-8';

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: createCorsHeaders(contentType),
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : 'Unknown network error';

    return jsonResponse(
      {
        code: 'OPEN_FOOD_FACTS_PROXY_UNAVAILABLE',
        message: 'Open Food Facts proxy unavailable: ' + detail,
      },
      502,
    );
  }
}
