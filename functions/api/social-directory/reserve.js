import { handleSocialDirectoryReserveRequest } from '../../_shared/socialDirectory.js';

export async function onRequest(context) {
  return handleSocialDirectoryReserveRequest(context.request, context.env);
}
