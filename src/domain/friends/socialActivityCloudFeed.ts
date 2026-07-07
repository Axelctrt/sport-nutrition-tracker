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
