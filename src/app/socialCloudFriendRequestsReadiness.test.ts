import {
  SOCIAL_CLOUD_FRIEND_REQUEST_CONTRACT_VERSION,
  SOCIAL_CLOUD_FRIEND_REQUEST_FORBIDDEN_BEHAVIORS,
  SOCIAL_CLOUD_FRIEND_REQUEST_STATUSES,
  assertSocialCloudFriendRequestContractIntegrity,
} from '@/domain/friends/socialCloudFriendRequest';
import {
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('readiness demandes d’amis cloud 0.28.0 F4', () => {
  it('expose le contrat F4 sans relation basée sur handle', () => {
    expect(SOCIAL_CLOUD_FRIEND_REQUEST_CONTRACT_VERSION).toBe('0.28.0-f4');
    expect(SOCIAL_CLOUD_FRIEND_REQUEST_STATUSES).toEqual([
      'pending',
      'accepted',
      'declined',
      'cancelled',
    ]);
    expect(SOCIAL_CLOUD_FRIEND_REQUEST_FORBIDDEN_BEHAVIORS).toContain('handleBasedRelationship');
    expect(SOCIAL_CLOUD_FRIEND_REQUEST_FORBIDDEN_BEHAVIORS).toContain('automaticFriendship');
    expect(SOCIAL_CLOUD_FRIEND_REQUEST_FORBIDDEN_BEHAVIORS).toContain('rawActivityExport');
    expect(assertSocialCloudFriendRequestContractIntegrity()).toBe(true);
  });

  it('prépare la table cloud dédiée sans migrer AppDatabase', () => {
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(13);
    expect(SYNC_PROTOTYPE_TABLE_NAMES).toContain('socialFriendRequests');
    expect(SYNC_PROTOTYPE_TABLE_NAMES).not.toContain('socialRawActivities' as never);
  });
});
