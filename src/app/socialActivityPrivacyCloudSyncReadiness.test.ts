import accountPreferencesSource from '@/infrastructure/sync-prototype/realAccountPreferencesSyncService.ts?raw';
import privacyRepositorySource from '@/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository.ts?raw';
import identityRepositorySource from '@/infrastructure/repositories/dexie/DexieSocialIdentityRepository.ts?raw';
import privacyPageSource from '@/features/friends/pages/FriendsPrivacyPage.tsx?raw';
import automaticCoordinatorSource from '@/app/sync/AutomaticSyncCoordinator.tsx?raw';
import appDatabaseVersionsSource from '@/infrastructure/database/migrations/versions.ts?raw';
import syncDatabaseSource from '@/infrastructure/sync-prototype/SyncPrototypeDatabase.ts?raw';

const normalizedAccountPreferencesSource = accountPreferencesSource.replace(/\r\n/g, '\n');

describe('social activity privacy cloud sync readiness 0.29.0 A10', () => {
  it('synchronise séparément la visibilité sociale et la politique globale', () => {
    expect(normalizedAccountPreferencesSource).toContain('socialProfileVisibility');
    expect(normalizedAccountPreferencesSource).toContain('socialActivitySharing');
    expect(normalizedAccountPreferencesSource).toContain('chooseLatest(\n    local.socialProfileVisibility');
    expect(normalizedAccountPreferencesSource).toContain('chooseLatest(\n    local.socialActivitySharing');
    expect(normalizedAccountPreferencesSource).toContain('validateSocialActivityGlobalSharingPolicy');
  });

  it('conserve des horodatages dédiés aux réglages sensibles', () => {
    expect(privacyRepositorySource).toContain('profileVisibilityUpdatedAt');
    expect(privacyRepositorySource).toContain('socialActivitySharingPolicyUpdatedAt');
    expect(privacyRepositorySource).toContain('profileVisibilityChanged');
    expect(privacyRepositorySource).toContain('socialActivitySharingPolicyChanged');
    expect(identityRepositorySource).toContain('...(existing ?? {})');
  });

  it('déclenche la synchronisation automatique et recharge la page ouverte', () => {
    expect(privacyPageSource).toContain("notifySyncLocalDataChanged(['account-preferences']");
    expect(privacyPageSource).toContain('SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT');
    expect(privacyPageSource).toContain('refreshPrivacyFromCloud');
    expect(automaticCoordinatorSource).toContain('reconcileRuntimeSocialActivityPrivacy');
    expect(automaticCoordinatorSource).toContain('SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT');
  });

  it('ne change aucune version de stockage pour des champs optionnels', () => {
    expect(appDatabaseVersionsSource).toContain('CURRENT_DATABASE_VERSION = DATABASE_VERSION_10');
    expect(syncDatabaseSource).toContain('SYNC_PROTOTYPE_DATABASE_VERSION = 15');
  });
});
