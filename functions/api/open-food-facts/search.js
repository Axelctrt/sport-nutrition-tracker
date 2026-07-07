import { handleOpenFoodFactsProxyRequest } from '../../_shared/openFoodFactsProxy.js';

const SEARCH_API_URL = 'https://search.openfoodfacts.org/search';

export async function onRequest(context) {
  return handleOpenFoodFactsProxyRequest(
    context.request,
    SEARCH_API_URL,
  );
}
