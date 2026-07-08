import type { EntityId } from '@/domain/models/common';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  ensureFriendActivityPermissions,
  updateFriendActivityFieldSelection,
  updateFriendActivityPermission,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';

const friend: FriendProfileSummary = {
  id: 'friend-user' as EntityId,
  userId: 'friend-user' as EntityId,
  displayName: 'Lina Trail',
  handle: 'lina.trail',
  initials: 'LT',
};

function snapshot(): FriendsPrivacySnapshot {
  return {
    friends: [friend],
    requests: [],
    privacy: {
      ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
      profileVisibility: 'friends',
      activitySharing: 'detailed',
    },
  };
}

describe('friendship A20', () => {
  it('ajoute la sélection détaillée par défaut aux anciennes permissions', () => {
    const normalized = ensureFriendActivityPermissions({
      ...snapshot(),
      activityPermissions: [{
        id: 'friend-permission:friend-user' as EntityId,
        ...(friend.userId ? { friendUserId: friend.userId } : {}),
        friendHandle: friend.handle,
        sharingLevel: 'summary',
        detailedConsent: 'notRequested',
      }],
    });

    expect(normalized.activityPermissions?.[0]?.fieldSelection).toMatchObject({
      common: expect.arrayContaining(['activityType', 'title', 'date', 'time', 'duration', 'calories']),
      cardio: expect.arrayContaining(['distance', 'pace', 'speed', 'heartRate', 'cadence']),
      strength: expect.arrayContaining(['exercises', 'sets', 'repetitions', 'loads', 'rpe']),
    });
  });

  it('met à jour les champs sans perdre le consentement détaillé', () => {
    const detailed = updateFriendActivityPermission(
      snapshot(),
      friend.id,
      'detailed',
      '2026-07-08T12:00:00.000Z',
    );
    const updated = updateFriendActivityFieldSelection(detailed, friend.id, {
      common: ['duration'],
      cardio: ['distance'],
      strength: ['repetitions'],
    });

    expect(updated.activityPermissions?.[0]).toMatchObject({
      sharingLevel: 'detailed',
      detailedConsent: 'granted',
      detailedConsentGrantedAt: '2026-07-08T12:00:00.000Z',
      fieldSelection: {
        common: ['duration', 'activityType', 'date'],
        cardio: ['distance'],
        strength: ['repetitions', 'exercises', 'sets'],
      },
    });
  });

  it('préserve la sélection lors d’un aller-retour résumé puis détaillé', () => {
    const selected = updateFriendActivityFieldSelection(snapshot(), friend.id, {
      common: ['activityType', 'date', 'duration'],
      cardio: ['distance'],
      strength: ['exercises', 'sets', 'repetitions'],
    });
    const summary = updateFriendActivityPermission(selected, friend.id, 'summary');
    const detailed = updateFriendActivityPermission(
      summary,
      friend.id,
      'detailed',
      '2026-07-08T13:00:00.000Z',
    );

    expect(detailed.activityPermissions?.[0]?.fieldSelection).toEqual(
      selected.activityPermissions?.[0]?.fieldSelection,
    );
  });
});
