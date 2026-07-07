import type { ActiveSocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshotContract';

export interface SocialActivityFeedOwnerProfile {
  readonly userId: string;
  readonly handle?: string;
  readonly displayName?: string;
}

export interface SocialActivityCloudFeedCard
  extends Omit<ActiveSocialActivitySnapshot, 'detail'> {
  readonly detailAvailable: boolean;
  readonly ownerProfile: SocialActivityFeedOwnerProfile;
}

export interface SocialActivityCloudFeedPage {
  readonly items: readonly SocialActivityCloudFeedCard[];
  readonly nextCursor?: string;
}

export type SocialActivityCloudReadinessStatus =
  | 'ready'
  | 'migrationRequired'
  | 'prerequisiteMissing';

export interface SocialActivityCloudReadiness {
  readonly status: SocialActivityCloudReadinessStatus;
  readonly contractVersion: string;
  readonly authVerified: boolean;
  readonly databaseBound: boolean;
  readonly requiredMigration: string;
  readonly missingPrerequisites: readonly string[];
  readonly missingActivitySchema: readonly string[];
  readonly checkedAt: string;
}
