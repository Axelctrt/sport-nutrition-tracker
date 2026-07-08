import type { EntityId } from '@/domain/models/common';
import { createFriendsPrivacyService } from '@/application/friends/friendsPrivacyService';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS } from '@/domain/friends/friendship';

describe('friendsPrivacyService', () => {
  it('expose les compteurs du socle amis et confidentialité', () => {
    const service = createFriendsPrivacyService();

    expect(service.getSummary()).toMatchObject({
      friendCount: 1,
      incomingPendingCount: 1,
      outgoingPendingCount: 1,
      sharingEnabled: true,
      summaryPermissionCount: 1,
    });
  });

  it('accepte une demande sans activer le partage détaillé', () => {
    const service = createFriendsPrivacyService();
    const state = service.actions.acceptRequest('request:incoming:nora-trail' as EntityId);

    expect(state.friends).toHaveLength(2);
    expect(state.privacy.activitySharing).toBe('disabled');
    expect(state.lastFeedback).toContain('partage détaillé reste désactivé');
  });

  it('envoie une demande sortante validée', () => {
    const service = createFriendsPrivacyService({
      friends: [],
      requests: [],
      privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    });

    const state = service.actions.sendRequest('@ami.test');

    expect(state.requests).toHaveLength(1);
    expect(state.requests[0]).toMatchObject({ handle: 'ami.test', direction: 'outgoing' });
    expect(state.lastFeedback).toContain('Demande envoyée');
  });

  it('bloque les nouvelles demandes sans supprimer les amis existants', () => {
    const service = createFriendsPrivacyService();
    const state = service.actions.setRequestsOpen(false);

    expect(state.privacy.allowFriendRequests).toBe(false);
    expect(state.friends).toHaveLength(1);
  });

  it('expose le garde-fou qui bloque le détail social tant que le consentement par ami manque', () => {
    const service = createFriendsPrivacyService();
    service.actions.setActivitySharing('detailed');

    expect(service.getSharingGuard()).toMatchObject({
      canShareSummary: true,
      canShareDetailed: false,
      detailedSharingBlocked: true,
    });
    expect(service.getState().lastFeedback).toContain('bloqué jusqu’au consentement explicite');
  });

  it('conserve les anciens réglages en stockage sans modifier la permission effective de l’ami', () => {
    const service = createFriendsPrivacyService();
    const state = service.actions.setSocialActivitySharingPolicy({
      visibility: 'custom',
      fields: {
        common: ['activityType', 'date', 'duration'],
        cardio: ['distance', 'pace'],
        strength: ['sessionName', 'exercises', 'sets', 'repetitions'],
      },
    });

    expect(state.privacy.socialActivitySharingPolicy).toMatchObject({ visibility: 'custom' });
    expect(service.getSharingGuard()).toMatchObject({
      allowedScope: 'summary',
      canShareSummary: true,
      canShareDetailed: false,
    });
  });

});
