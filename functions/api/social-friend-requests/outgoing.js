import { handleSocialFriendRequestOutgoingRequest } from '../../_shared/socialFriendRequests.js';

export async function onRequest(context) {
  return handleSocialFriendRequestOutgoingRequest(context.request, context.env);
}
