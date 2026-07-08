import { handleSocialFriendRequestUpdateStatusRequest } from '../../_shared/socialFriendRequests.js';

export async function onRequest(context) {
  return handleSocialFriendRequestUpdateStatusRequest(context.request, context.env, context);
}
