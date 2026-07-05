import type { EntityId } from '@/domain/models/common';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import type { SocialCloudActivitySnapshotPort } from '@/domain/friends/socialCloudContract';
import { prepareSocialActivityFeed } from '@/application/friends/socialActivityFeedService';
import type { FriendsPrivacySnapshot } from '@/domain/friends/friendship';

export interface PublishSocialCloudActivitySnapshotsInput {
  readonly userId: EntityId;
  readonly snapshots: readonly SocialActivitySnapshot[];
  readonly port: SocialCloudActivitySnapshotPort;
}

export interface PublishSocialCloudActivitySnapshotsResult {
  readonly status: 'published' | 'unavailable' | 'blocked';
  readonly publishedSnapshots: readonly SocialActivitySnapshot[];
  readonly rawActivityShared: false;
  readonly message: string;
}

export async function publishSocialCloudActivitySnapshots({
  userId,
  snapshots,
  port,
}: PublishSocialCloudActivitySnapshotsInput): Promise<PublishSocialCloudActivitySnapshotsResult> {
  if (snapshots.length === 0) {
    return {
      status: 'blocked',
      publishedSnapshots: [],
      rawActivityShared: false,
      message: 'Aucun snapshot filtré à publier.',
    };
  }

  const result = await port.publishSnapshots(userId, snapshots);
  if (result.status === 'created' || result.status === 'updated' || result.status === 'alreadyExists') {
    return {
      status: 'published',
      publishedSnapshots: result.value ?? snapshots,
      rawActivityShared: false,
      message: result.message,
    };
  }

  return {
    status: 'unavailable',
    publishedSnapshots: [],
    rawActivityShared: false,
    message: result.message,
  };
}

export interface LoadSocialCloudActivityFeedInput {
  readonly userId: EntityId;
  readonly privacySnapshot: FriendsPrivacySnapshot;
  readonly port: SocialCloudActivitySnapshotPort;
}

export async function loadSocialCloudActivityFeed({
  userId,
  privacySnapshot,
  port,
}: LoadSocialCloudActivityFeedInput) {
  const snapshots = await port.listFeedSnapshots(userId);
  return prepareSocialActivityFeed({ privacySnapshot, snapshots });
}
