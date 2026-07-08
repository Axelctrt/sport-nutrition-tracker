import { handleSocialFriendsRemoveRequest } from '../../_shared/socialFriends.js';

export async function onRequest(context) {
  return handleSocialFriendsRemoveRequest(context.request, context.env, context);
}
