import { handleSocialFriendsPermissionsRequest } from '../../_shared/socialFriends.js';

export async function onRequest(context) {
  return handleSocialFriendsPermissionsRequest(context.request, context.env);
}
