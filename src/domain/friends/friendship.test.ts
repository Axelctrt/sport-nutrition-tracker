import type { EntityId } from '@/domain/models/common';
import { createDefaultSocialIdentity, type PublicUserProfile } from '@/domain/friends/socialIdentity';
import {
  acceptFriendRequest,
  addOutgoingFriendRequest,
  createOutgoingFriendRequestForProfile,
  evaluateFriendRequestEligibility,
  canExposeFriendActivityDetails,
  canExposeFriendActivityDetailsToFriend,
  createOutgoingFriendRequest,
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  declineFriendRequest,
  normalizeFriendHandle,
  evaluateFriendActivitySharingGuard,
  evaluateFriendScopedActivitySharingGuard,
  summarizeFriendsPrivacy,
  updateFriendActivityPermission,
  updateFriendsPrivacySettings,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';

const baseSnapshot: FriendsPrivacySnapshot = {
  friends: [],
  privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  requests: [
    {
      id: 'request-1' as EntityId,
      displayName: 'Nora Trail',
      handle: 'nora.trail',
      direction: 'incoming',
      status: 'pending',
      requestedAt: '2026-07-05T00:00:00.000Z',
    },
  ],
};

describe('friendship domain', () => {
  it('normalise un identifiant ami sans exposer de caractères invalides', () => {
    expect(normalizeFriendHandle(' @Nora Trail! ')).toBe('noratrail');
    expect(createOutgoingFriendRequest('ab')).toBeUndefined();
  });

  it('accepte une demande reçue et ajoute l’ami associé', () => {
    const accepted = acceptFriendRequest(baseSnapshot, 'request-1' as EntityId);

    expect(accepted.friends).toHaveLength(1);
    expect(accepted.friends[0]?.handle).toBe('nora.trail');
    expect(accepted.requests[0]?.status).toBe('accepted');
  });

  it('refuse une demande sans créer d’ami', () => {
    const declined = declineFriendRequest(baseSnapshot, 'request-1' as EntityId);

    expect(declined.friends).toHaveLength(0);
    expect(declined.requests[0]?.status).toBe('declined');
  });

  it('ajoute une demande sortante unique', () => {
    const updated = addOutgoingFriendRequest(baseSnapshot, '@Romain.Run', '2026-07-05T01:00:00.000Z');
    const duplicated = addOutgoingFriendRequest(updated, 'romain.run', '2026-07-05T02:00:00.000Z');

    expect(updated.requests).toHaveLength(2);
    expect(updated.requests.at(-1)).toMatchObject({ handle: 'romain.run', direction: 'outgoing' });
    expect(duplicated.requests).toHaveLength(2);
  });



  it('prépare une demande réelle basée sur les userId cloud', () => {
    const identity = createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'alex123');
    const profile: PublicUserProfile = {
      userId: 'social-user:lina' as EntityId,
      handle: 'lina.trail',
      displayName: 'Lina Trail',
      createdAt: '2026-07-05T09:00:00.000Z',
      updatedAt: '2026-07-05T09:00:00.000Z',
    };

    const eligibility = evaluateFriendRequestEligibility(baseSnapshot, identity, profile);
    const request = createOutgoingFriendRequestForProfile(
      profile,
      identity.userId,
      '2026-07-05T11:00:00.000Z',
    );

    expect(eligibility.status).toBe('allowed');
    expect(request).toMatchObject({
      requesterUserId: identity.userId,
      recipientUserId: profile.userId,
      handle: 'lina.trail',
      direction: 'outgoing',
    });
  });

  it('bloque les cas métier avant création d’une demande réelle', () => {
    const identity = createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'alex123');
    const selfProfile: PublicUserProfile = {
      userId: identity.userId,
      handle: identity.handle,
      displayName: identity.displayName,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
    };

    expect(evaluateFriendRequestEligibility(baseSnapshot, identity, selfProfile).status).toBe('self');
  });

  it('désactive le partage lorsque le profil devient privé', () => {
    const settings = updateFriendsPrivacySettings(DEFAULT_FRIENDS_PRIVACY_SETTINGS, {
      activitySharing: 'summary-only',
      profileVisibility: 'private',
    });

    expect(settings.profileVisibility).toBe('private');
    expect(settings.activitySharing).toBe('disabled');
  });

  it('résume les compteurs utiles à l’écran amis', () => {
    const summary = summarizeFriendsPrivacy(addOutgoingFriendRequest(baseSnapshot, 'romain.run'));

    expect(summary).toMatchObject({
      friendCount: 0,
      incomingPendingCount: 1,
      outgoingPendingCount: 1,
      requestsOpen: true,
      approvalRequired: true,
      sharingEnabled: false,
    });
  });

  it('bloque le partage détaillé tant que le consentement par ami n’existe pas', () => {
    const guard = evaluateFriendActivitySharingGuard({
      ...baseSnapshot,
      friends: [
        {
          id: 'friend:nora.trail' as EntityId,
          displayName: 'Nora Trail',
          handle: 'nora.trail',
          initials: 'NT',
        },
      ],
      privacy: {
        ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
        activitySharing: 'detailed',
      },
    });

    expect(guard).toMatchObject({
      allowedScope: 'summary',
      canShareSummary: true,
      canShareDetailed: false,
      detailedSharingBlocked: true,
    });
    expect(canExposeFriendActivityDetails(baseSnapshot)).toBe(false);
  });

  it('crée une permission résumé par défaut et autorise le détail seulement par consentement ami', () => {
    const friend = {
      id: 'social-user:nora' as EntityId,
      userId: 'social-user:nora' as EntityId,
      displayName: 'Nora Trail',
      handle: 'nora.trail',
      initials: 'NT',
    };
    const detailedSnapshot = updateFriendActivityPermission({
      ...baseSnapshot,
      friends: [friend],
      privacy: {
        ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
        activitySharing: 'detailed',
      },
    }, friend.id, 'detailed', '2026-07-05T12:00:00.000Z');

    const scopedGuard = evaluateFriendScopedActivitySharingGuard(detailedSnapshot, friend);

    expect(scopedGuard).toMatchObject({
      allowedScope: 'detailed',
      canShareDetailed: true,
      detailedSharingBlocked: false,
    });
    expect(detailedSnapshot.activityPermissions?.[0]).toMatchObject({
      friendUserId: friend.userId,
      friendHandle: 'nora.trail',
      sharingLevel: 'detailed',
      detailedConsent: 'granted',
      detailedConsentGrantedAt: '2026-07-05T12:00:00.000Z',
    });
    expect(canExposeFriendActivityDetails(detailedSnapshot)).toBe(false);
    expect(canExposeFriendActivityDetailsToFriend(detailedSnapshot, friend)).toBe(true);
  });

});
