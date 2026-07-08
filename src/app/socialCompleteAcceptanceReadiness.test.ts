import activityFormSource from '@/features/activities/components/ActivityForm.tsx?raw';
import detailDialogSource from '@/features/friends/components/SocialActivityDetailDialog.tsx?raw';
import feedPanelSource from '@/features/friends/components/SocialActivityFeedPanel.tsx?raw';
import sharingSettingsSource from '@/features/friends/components/SocialActivitySharingSettings.tsx?raw';
import friendsPageSource from '@/features/friends/pages/FriendsPrivacyPage.tsx?raw';
import workoutSessionSource from '@/features/strength-sessions/pages/WorkoutSessionPage.tsx?raw';
import activityServerSource from '@/../functions/_shared/socialActivitySnapshots.js?raw';
import friendRequestsServerSource from '@/../functions/_shared/socialFriendRequests.js?raw';
import friendsServerSource from '@/../functions/_shared/socialFriends.js?raw';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  acceptFriendRequest,
  evaluateFriendScopedActivitySharingGuard,
  removeFriendFromSnapshot,
  updateFriendActivityFieldSelection,
  updateFriendActivityPermission,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import type { EntityId } from '@/domain/models/common';

const ownerUserId = 'owner@example.com' as EntityId;
const friendUserId = 'friend@example.com' as EntityId;
const requestId = 'friend-request:friend@example.com->owner@example.com' as EntityId;

function pendingSnapshot(): FriendsPrivacySnapshot {
  return {
    friends: [],
    requests: [
      {
        id: requestId,
        requesterUserId: friendUserId,
        recipientUserId: ownerUserId,
        displayName: 'Lina Trail',
        handle: 'lina.trail',
        direction: 'incoming',
        status: 'pending',
        requestedAt: '2026-07-08T10:00:00.000Z',
      },
    ],
    privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  };
}

describe('social complete acceptance readiness 0.29.0 A25', () => {
  it('couvre le cycle domaine demande, acceptation, permission et suppression', () => {
    const accepted = acceptFriendRequest(
      pendingSnapshot(),
      requestId,
      '2026-07-08T10:05:00.000Z',
    );
    const friend = accepted.friends[0];

    expect(friend).toMatchObject({
      id: friendUserId,
      userId: friendUserId,
      handle: 'lina.trail',
    });
    expect(accepted.requests).toEqual([]);
    expect(evaluateFriendScopedActivitySharingGuard(accepted, friend!).allowedScope).toBe('summary');

    const personalized = updateFriendActivityFieldSelection(
      updateFriendActivityPermission(
        accepted,
        friend!.id,
        'detailed',
        '2026-07-08T10:06:00.000Z',
      ),
      friend!.id,
      {
        common: ['activityType', 'title', 'date', 'duration', 'calories'],
        cardio: ['distance', 'pace'],
        strength: ['exercises', 'sets', 'repetitions', 'loads', 'rpe'],
      },
    );
    const guard = evaluateFriendScopedActivitySharingGuard(personalized, friend!);

    expect(guard.allowedScope).toBe('detailed');
    expect(guard.permission.fieldSelection).toMatchObject({
      cardio: expect.arrayContaining(['distance', 'pace']),
      strength: expect.arrayContaining(['exercises', 'sets', 'repetitions', 'loads', 'rpe']),
    });

    const removed = removeFriendFromSnapshot(personalized, friend!.id);
    expect(removed.friends).toEqual([]);
    expect(removed.activityPermissions).toEqual([]);
  });

  it('garde le partage exclusivement dans la relation avec chaque ami', () => {
    expect(sharingSettingsSource).toContain("{ value: 'none', label: 'Aucun' }");
    expect(sharingSettingsSource).toContain("{ value: 'summary', label: 'Résumé' }");
    expect(sharingSettingsSource).toContain("{ value: 'detailed', label: 'Personnalisé' }");
    expect(sharingSettingsSource).toContain('Ce que {friendDisplayName} peut voir');
    expect(friendsPageSource).toContain('updateFriendFieldSelection');
    expect(activityFormSource).not.toContain('SocialActivitySharingSettings');
    expect(workoutSessionSource).not.toContain('SocialActivitySharingSettings');
  });

  it('couvre le fil compact et le détail filtré', () => {
    expect(feedPanelSource).toContain('SocialActivityFeedCard');
    expect(feedPanelSource).toContain('SocialActivityDetailDialog');
    expect(feedPanelSource).toContain('isRefreshing');
    expect(detailDialogSource).toContain('role="dialog"');
    expect(detailDialogSource).toContain('Les données non partagées ne sont pas envoyées à ton appareil.');
    expect(activityServerSource).toContain('redactSnapshotToFieldSelection');
    expect(activityServerSource).toContain('SOCIAL_ACTIVITY_FIELDS_EXCEEDED');
  });

  it('couvre le cycle serveur des demandes et amitiés', () => {
    expect(friendRequestsServerSource).toContain("AND status = 'pending'");
    expect(friendRequestsServerSource).toContain('DELETE FROM social_friend_requests');
    expect(friendsServerSource).toContain("SET status = 'removed'");
    expect(friendsServerSource).toContain('DELETE FROM social_friend_permissions');
  });

  it('conserve les protections de sécurité et de résilience', () => {
    expect(activityServerSource).toContain('async function authenticateRequest');
    expect(friendRequestsServerSource).toContain('authenticateRequest');
    expect(friendsServerSource).toContain('authenticateRequest');
    expect(friendsPageSource).toContain('cloudSocialBackendUnavailable');
    expect(friendsPageSource).toContain('permissionMutationVersionsRef');
    expect(friendsPageSource).toContain('persistenceQueueRef');
  });
});
