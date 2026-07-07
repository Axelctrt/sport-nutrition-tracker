import { handleSocialActivitySnapshotSyncRequest } from '../../_shared/socialActivitySnapshots.js';

export function onRequest(context) {
  return handleSocialActivitySnapshotSyncRequest(context.request, context.env);
}
