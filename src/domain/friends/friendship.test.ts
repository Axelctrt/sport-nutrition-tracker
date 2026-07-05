import type { EntityId } from '@/domain/models/common';
import {
  acceptFriendRequest,
  addOutgoingFriendRequest,
  createOutgoingFriendRequest,
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  declineFriendRequest,
  normalizeFriendHandle,
  summarizeFriendsPrivacy,
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
});
