import { handleSocialActivityFeedRequest } from '../../_shared/socialActivitySnapshots.js';

export function onRequest(context) {
  return handleSocialActivityFeedRequest(context.request, context.env);
}
