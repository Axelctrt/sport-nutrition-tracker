import type { Activity } from '@/domain/models/activity';
import {
  createSocialActivitySnapshotsForFriends,
  type SocialActivitySnapshot,
  type SocialActivitySnapshotBlockedResult,
  type SocialActivitySnapshotResult,
  type SocialActivitySnapshotScope,
} from '@/domain/friends/socialActivitySnapshot';
import type { FriendsPrivacySnapshot } from '@/domain/friends/friendship';

export interface PrepareSocialActivitySnapshotsInput {
  readonly activity: Activity;
  readonly privacySnapshot: FriendsPrivacySnapshot;
  readonly requestedScope?: SocialActivitySnapshotScope;
  readonly now?: string;
}

export interface PreparedSocialActivitySnapshots {
  readonly snapshots: readonly SocialActivitySnapshot[];
  readonly blocked: readonly SocialActivitySnapshotBlockedResult[];
  readonly summaryCount: number;
  readonly detailedCount: number;
  readonly rawActivityShared: false;
}

export function prepareSocialActivitySnapshots({
  activity,
  privacySnapshot,
  requestedScope = 'detailed',
  now = new Date().toISOString(),
}: PrepareSocialActivitySnapshotsInput): PreparedSocialActivitySnapshots {
  const results = createSocialActivitySnapshotsForFriends(activity, privacySnapshot, requestedScope, now);
  const snapshots = results
    .filter((result): result is Extract<SocialActivitySnapshotResult, { readonly status: 'created' }> =>
      result.status === 'created',
    )
    .map((result) => result.snapshot);
  const blocked = results.filter((result): result is SocialActivitySnapshotBlockedResult =>
    result.status === 'blocked',
  );

  return {
    snapshots,
    blocked,
    summaryCount: snapshots.filter((snapshot) => snapshot.scope === 'summary').length,
    detailedCount: snapshots.filter((snapshot) => snapshot.scope === 'detailed').length,
    rawActivityShared: false,
  };
}
