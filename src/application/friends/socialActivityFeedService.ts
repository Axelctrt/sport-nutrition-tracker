import type { FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import {
  buildSocialActivityFeed,
  type SocialActivityFeedState,
} from '@/domain/friends/socialActivityFeed';

export interface PrepareSocialActivityFeedInput {
  readonly privacySnapshot: FriendsPrivacySnapshot;
  readonly snapshots: readonly SocialActivitySnapshot[];
}

export interface PreparedSocialActivityFeed extends SocialActivityFeedState {
  readonly source: 'filtered-snapshots';
}

export function prepareSocialActivityFeed({
  privacySnapshot,
  snapshots,
}: PrepareSocialActivityFeedInput): PreparedSocialActivityFeed {
  return {
    ...buildSocialActivityFeed(privacySnapshot, snapshots),
    source: 'filtered-snapshots',
  };
}
