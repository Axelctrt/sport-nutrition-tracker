import { handleAccountDataDeletionRequest } from '../../_shared/accountDataDeletion.js';

export async function onRequest(context) {
  return handleAccountDataDeletionRequest(
    context.request,
    context.env,
    context,
  );
}
