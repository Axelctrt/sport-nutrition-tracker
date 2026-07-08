import { handleSocialIdentityReconciliationRequest } from '../../_shared/socialIdentityReconciliation.js';

export async function onRequest(context) {
  return handleSocialIdentityReconciliationRequest(
    context.request,
    context.env,
    context,
  );
}
