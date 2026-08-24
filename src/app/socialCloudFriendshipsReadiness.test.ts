import {
  SOCIAL_CLOUD_FRIENDSHIP_CONTRACT_VERSION,
  SOCIAL_CLOUD_FRIENDSHIP_FORBIDDEN_BEHAVIORS,
  assertSocialCloudFriendshipContractIntegrity,
} from '@/domain/friends/socialCloudFriendship';
import {
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('readiness amitiés cloud 0.28.0 F5', () => {
  it('expose le contrat F5 avec relation userId et permission résumé par défaut', () => {
    expect(SOCIAL_CLOUD_FRIENDSHIP_CONTRACT_VERSION).toBe('0.28.0-f5');
    expect(SOCIAL_CLOUD_FRIENDSHIP_FORBIDDEN_BEHAVIORS).toContain('handleBasedRelationship');
    expect(SOCIAL_CLOUD_FRIENDSHIP_FORBIDDEN_BEHAVIORS).toContain('automaticFriendshipWithoutAcceptedRequest');
    expect(SOCIAL_CLOUD_FRIENDSHIP_FORBIDDEN_BEHAVIORS).toContain('rawActivityExport');
    expect(assertSocialCloudFriendshipContractIntegrity()).toBe(true);
  });

  it('prépare les tables cloud dédiées sans migrer AppDatabase', () => {
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(18);
    expect(SYNC_PROTOTYPE_TABLE_NAMES).toContain('socialFriendships');
    expect(SYNC_PROTOTYPE_TABLE_NAMES).toContain('socialFriendPermissions');
    expect(SYNC_PROTOTYPE_TABLE_NAMES).not.toContain('socialRawActivities' as never);
  });
});
