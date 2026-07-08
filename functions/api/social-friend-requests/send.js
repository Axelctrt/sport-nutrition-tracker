import { handleSocialFriendRequestSendRequest } from '../../_shared/socialFriendRequests.js';

export async function onRequest(context) {
  return handleSocialFriendRequestSendRequest(context.request, context.env, context);
}
