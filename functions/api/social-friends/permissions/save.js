import { handleSocialFriendsPermissionSaveRequest } from '../../../_shared/socialFriends.js';

export async function onRequest(context) {
  return handleSocialFriendsPermissionSaveRequest(context.request, context.env);
}
