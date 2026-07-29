import routeSource from '../../functions/api/social-identity/reconcile.js?raw';
import serverSource from '../../functions/_shared/socialIdentityReconciliation.js?raw';
import pageSource from '@/features/friends/pages/FriendsPrivacyPage.tsx?raw';
import observerSource from '@/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotObserver.ts?raw';
import gatewaySource from '@/infrastructure/sync-prototype/socialIdentityReconciliationGateway.ts?raw';

import { reconcileSocialIdentityWithCloudAccount } from '@/application/friends/socialIdentityReconciliationService';
import { reconcileRuntimeSocialIdentity } from '@/infrastructure/sync-prototype/runtimeSocialIdentityReconciliation';

describe('social identity canonical reconciliation readiness 0.29.0 A14', () => {
  it('expose une réconciliation authentifiée vers le userId Dexie Cloud', () => {
    expect(reconcileSocialIdentityWithCloudAccount).toBeTypeOf('function');
    expect(reconcileRuntimeSocialIdentity).toBeTypeOf('function');
    expect(routeSource).toContain('handleSocialIdentityReconciliationRequest');
    expect(serverSource).toContain('authenticateRequest');
    expect(serverSource).toContain(
      'SOCIAL_IDENTITY_RECONCILIATION_HANDLE_CONFLICT',
    );
    expect(serverSource).not.toContain('socialHandleReservations');
    expect(serverSource).not.toContain('socialIdentities');
    expect(gatewaySource).toContain('authorization: `Bearer ${credentials.accessToken}`');
  });

  it('réécrit le socle social sans créer un second modèle de données', () => {
    expect(serverSource).toContain('social_directory_handles');
    expect(serverSource).toContain('social_friendships');
    expect(serverSource).toContain('social_friend_permissions');
    expect(serverSource).toContain('social_friend_requests');
    expect(serverSource).toContain('social_activity_snapshots');
    expect(serverSource).not.toContain('CREATE TABLE');
  });

  it('réconcilie avant le chargement des amis et avant la création de l’outbox', () => {
    const reconciliationPosition = pageSource.indexOf('activeIdentityReconciliation(loadedIdentity)');
    const friendsPosition = pageSource.indexOf('listFriendshipsWithProfiles(effectiveIdentity.userId)');
    expect(reconciliationPosition).toBeGreaterThan(-1);
    expect(friendsPosition).toBeGreaterThan(reconciliationPosition);
    expect(observerSource).toContain('reconcileIdentity(storedIdentity)');
    expect(observerSource).toContain('reconcileRuntimeSocialIdentity');
  });
});
