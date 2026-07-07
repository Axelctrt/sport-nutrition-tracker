import { handleSocialActivitySnapshotDetailRequest } from '../../_shared/socialActivitySnapshots.js';

export function onRequest(context) {
  return handleSocialActivitySnapshotDetailRequest(context.request, context.env);
}
