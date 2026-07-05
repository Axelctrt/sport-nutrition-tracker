import {
  SOCIAL_CLOUD_FORBIDDEN_FEATURES,
  SOCIAL_CLOUD_REQUIRED_COLLECTIONS,
  assertSocialCloudContractIntegrity,
  evaluateSocialCloudReadiness,
} from '@/domain/friends/socialCloudContract';
import type { EntityId } from '@/domain/models/common';

describe('contrat cloud social 0.28.0 F1', () => {
  it('définit les collections minimales sans activité brute ni annuaire ouvert', () => {
    expect(assertSocialCloudContractIntegrity()).toBe(true);
    expect(SOCIAL_CLOUD_REQUIRED_COLLECTIONS).toEqual([
      'socialIdentities',
      'socialHandleReservations',
      'socialFriendRequests',
      'socialFriendships',
      'socialFriendPermissions',
      'socialActivitySnapshots',
    ]);
    expect(SOCIAL_CLOUD_REQUIRED_COLLECTIONS).not.toContain('activities');
    expect(SOCIAL_CLOUD_REQUIRED_COLLECTIONS).not.toContain('rawActivities');
    expect(SOCIAL_CLOUD_FORBIDDEN_FEATURES).toEqual(expect.arrayContaining([
      'globalUserDirectory',
      'publicSuggestions',
      'rawActivityExport',
      'likes',
      'comments',
      'messaging',
      'groups',
      'leaderboards',
    ]));
  });

  it('reste désactivé quand Dexie Cloud est désactivé', () => {
    expect(
      evaluateSocialCloudReadiness({
        syncPrototypeEnabled: false,
        socialCloudEnabled: true,
      }),
    ).toMatchObject({
      status: 'disabled',
      canLookupUsers: false,
      canSendFriendRequests: false,
      canPublishSnapshots: false,
    });
  });

  it('signale le contrat prêt mais non branché quand le flag social réel reste désactivé', () => {
    expect(
      evaluateSocialCloudReadiness({
        syncPrototypeEnabled: true,
        socialCloudEnabled: false,
        databaseUrl: 'https://sportpilot.dexie.cloud',
      }),
    ).toMatchObject({
      status: 'contractReady',
      canLookupUsers: false,
      message: 'Contrat cloud social prêt, mais flag social réel désactivé.',
    });
  });

  it('n’autorise les capacités réelles qu’avec sync, flag et utilisateur authentifié', () => {
    expect(
      evaluateSocialCloudReadiness({
        syncPrototypeEnabled: true,
        socialCloudEnabled: true,
        databaseUrl: 'https://sportpilot.dexie.cloud',
      }),
    ).toMatchObject({
      status: 'missingAuthenticatedUser',
      canLookupUsers: false,
    });

    expect(
      evaluateSocialCloudReadiness({
        syncPrototypeEnabled: true,
        socialCloudEnabled: true,
        databaseUrl: 'https://sportpilot.dexie.cloud',
        authenticatedUserId: 'social-user:alex' as EntityId,
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
