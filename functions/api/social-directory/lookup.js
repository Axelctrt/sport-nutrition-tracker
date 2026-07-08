import { handleSocialDirectoryLookupRequest } from '../../_shared/socialDirectory.js';

export async function onRequest(context) {
  return handleSocialDirectoryLookupRequest(context.request, context.env, context);
}
