import {
  SOCIAL_CLOUD_CONTRACT_VERSION,
  SOCIAL_CLOUD_FORBIDDEN_FEATURES,
  SOCIAL_CLOUD_REQUIRED_COLLECTIONS,
} from '@/domain/friends/socialCloudContract';
import { SOCIAL_CLOUD_ACTIVITY_SNAPSHOT_CONTRACT_VERSION } from '@/domain/friends/socialCloudActivitySnapshot';
import { SOCIAL_CLOUD_FRIEND_REQUEST_CONTRACT_VERSION } from '@/domain/friends/socialCloudFriendRequest';
import { SOCIAL_CLOUD_FRIENDSHIP_CONTRACT_VERSION } from '@/domain/friends/socialCloudFriendship';
import { SOCIAL_CLOUD_USER_LOOKUP_CONTRACT_VERSION } from '@/domain/friends/socialCloudUserLookup';
import { SYNC_PROTOTYPE_DATABASE_VERSION } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('préparation de la release sociale cloud 0.28.0', () => {
  it('conserve les contrats cloud F1 à F6', () => {
    expect(SOCIAL_CLOUD_CONTRACT_VERSION).toBe('0.28.0-f1');
    expect(SOCIAL_CLOUD_USER_LOOKUP_CONTRACT_VERSION).toBe('0.28.0-f3');
    expect(SOCIAL_CLOUD_FRIEND_REQUEST_CONTRACT_VERSION).toBe('0.28.0-f4');
    expect(SOCIAL_CLOUD_FRIENDSHIP_CONTRACT_VERSION).toBe('0.28.0-f5');
    expect(SOCIAL_CLOUD_ACTIVITY_SNAPSHOT_CONTRACT_VERSION).toBe('0.28.0-f6');
  });

  it('publie uniquement les collections sociales cloud autorisées', () => {
    expect(SOCIAL_CLOUD_REQUIRED_COLLECTIONS).toEqual(
      expect.arrayContaining([
        'socialIdentities',
        'socialHandleReservations',
        'socialFriendRequests',
        'socialFriendships',
        'socialFriendPermissions',
        'socialActivitySnapshots',
      ]),
    );
    expect(SOCIAL_CLOUD_REQUIRED_COLLECTIONS).not.toContain('socialRawActivities');
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(18);
  });

  it('garde les interactions sociales hors périmètre', () => {
    expect(SOCIAL_CLOUD_FORBIDDEN_FEATURES).toEqual(
      expect.arrayContaining([
        'globalUserDirectory',
        'publicSuggestions',
        'rawActivityExport',
        'likes',
        'comments',
        'messaging',
        'groups',
        'leaderboards',
      ]),
    );
  });
});
