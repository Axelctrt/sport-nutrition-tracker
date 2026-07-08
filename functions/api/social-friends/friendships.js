import { handleSocialFriendsFriendshipsRequest } from '../../_shared/socialFriends.js';

export async function onRequest(context) {
  return handleSocialFriendsFriendshipsRequest(context.request, context.env, context);
}
