import { handleSocialActivitySnapshotReadinessRequest } from '../../_shared/socialActivitySnapshots.js';

export function onRequest(context) {
  return handleSocialActivitySnapshotReadinessRequest(context.request, context.env);
}
