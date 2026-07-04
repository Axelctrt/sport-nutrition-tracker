import { handlePhotoNutritionAiProxyRequest } from '../../_shared/photoNutritionAiProxy.js';

export async function onRequest(context) {
  return handlePhotoNutritionAiProxyRequest(context.request, context.env);
}
