import {
  SOCIAL_CLOUD_CONTRACT_VERSION,
  SOCIAL_CLOUD_FORBIDDEN_FEATURES,
  SOCIAL_CLOUD_REQUIRED_COLLECTIONS,
  assertSocialCloudContractIntegrity,
  evaluateSocialCloudReadiness,
} from '@/domain/friends/socialCloudContract';

describe('readiness cloud social 0.28.0 F1', () => {
  it('fige le contrat cloud social sans activer de backend complet', () => {
    expect(SOCIAL_CLOUD_CONTRACT_VERSION).toBe('0.28.0-f1');
    expect(SOCIAL_CLOUD_REQUIRED_COLLECTIONS).toContain('socialHandleReservations');
    expect(SOCIAL_CLOUD_REQUIRED_COLLECTIONS).toContain('socialFriendRequests');
    expect(SOCIAL_CLOUD_REQUIRED_COLLECTIONS).toContain('socialActivitySnapshots');
    expect(SOCIAL_CLOUD_FORBIDDEN_FEATURES).toContain('rawActivityExport');
    expect(SOCIAL_CLOUD_FORBIDDEN_FEATURES).toEqual(
      expect.arrayContaining([
        'globalUserDirectory',
        'publicSuggestions',
        'likes',
        'comments',
        'messaging',
        'groups',
        'leaderboards',
      ]),
    );
    expect(assertSocialCloudContractIntegrity()).toBe(true);
  });

  it('conserve le cloud social réel inactif tant que le flag dédié reste désactivé', () => {
    expect(
      evaluateSocialCloudReadiness({
        syncPrototypeEnabled: true,
        socialCloudEnabled: false,
        databaseUrl: 'https://sportpilot.dexie.cloud',
      }),
    ).toMatchObject({
      status: 'contractReady',
      canLookupUsers: false,
      canReserveHandle: false,
      canSendFriendRequests: false,
      canPublishSnapshots: false,
      canReadFeedSnapshots: false,
    });
  });

  it('prépare les capacités uniquement quand sync, URL cloud, flag social et utilisateur sont présents', () => {
    expect(
      evaluateSocialCloudReadiness({
        syncPrototypeEnabled: true,
        socialCloudEnabled: true,
        databaseUrl: 'https://sportpilot.dexie.cloud',
        authenticatedUserId: 'social-user:me',
      }),
    ).toMatchObject({
      status: 'contractReady',
      canLookupUsers: true,
      canReserveHandle: true,
      canSendFriendRequests: true,
      canPublishSnapshots: true,
      canReadFeedSnapshots: true,
    });
  });
});
