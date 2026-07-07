import { handleOpenFoodFactsProxyRequest } from '../../_shared/openFoodFactsProxy.js';

const LEGACY_SEARCH_API_URL =
  'https://world.openfoodfacts.org/cgi/search.pl';

export async function onRequest(context) {
  return handleOpenFoodFactsProxyRequest(
    context.request,
    LEGACY_SEARCH_API_URL,
  );
}
