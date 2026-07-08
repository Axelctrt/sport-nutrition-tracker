import deliverySource from '@/application/friends/socialActivitySnapshotDeliveryService.ts?raw';
import friendsPageSource from '@/features/friends/pages/FriendsPrivacyPage.tsx?raw';
import outboxRepositorySource from '@/infrastructure/social-activity-snapshots/DexieSocialActivitySnapshotOutboxRepository.ts?raw';
import runtimeDeliverySource from '@/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotCloudDelivery.ts?raw';
import gatewaySource from '@/infrastructure/sync-prototype/socialFriendsGateway.ts?raw';

describe('social sync resilience readiness 0.29.0 A23', () => {
  it('ne traite jamais une panne de permissions comme une liste vide autoritaire', () => {
    expect(gatewaySource).toContain('listPermissionsWithStatus');
    expect(gatewaySource).toContain('Réponse permissions serveur invalide');
    expect(friendsPageSource).toContain("permissionSync.status === 'synchronized'");
    expect(friendsPageSource).toContain('les données locales ont été conservées');
  });

  it('protège les réglages récents contre les réponses obsolètes', () => {
    expect(friendsPageSource).toContain('persistenceQueueRef');
    expect(friendsPageSource).toContain('permissionMutationVersionsRef');
    expect(friendsPageSource).toContain('isCurrentMutation');
  });

  it('reprend automatiquement une publication sociale différée', () => {
    expect(deliverySource).toContain('nextRetryAt');
    expect(outboxRepositorySource).toContain('getNextRetryAt');
    expect(runtimeDeliverySource).toContain('scheduleRetry');
    expect(runtimeDeliverySource).toContain('clearRetryTimer');
  });
});
