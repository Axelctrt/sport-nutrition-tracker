import { handleSocialFriendRequestIncomingRequest } from '../../_shared/socialFriendRequests.js';

export async function onRequest(context) {
  return handleSocialFriendRequestIncomingRequest(context.request, context.env, context);
}
