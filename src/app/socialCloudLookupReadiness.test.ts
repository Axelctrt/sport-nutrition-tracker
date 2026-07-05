import {
  SOCIAL_CLOUD_USER_LOOKUP_CONTRACT_VERSION,
  assertSocialCloudUserLookupContractIntegrity,
  SOCIAL_CLOUD_USER_LOOKUP_FORBIDDEN_BEHAVIORS,
} from '@/domain/friends/socialCloudUserLookup';
import { createRuntimeSocialCloudUserLookupGateway } from '@/infrastructure/sync-prototype/realSocialCloudUserLookupGateway';

describe('readiness recherche exacte cloud 0.28.0 F3', () => {
  it('déclare le contrat de recherche exacte sans annuaire ni suggestion', () => {
    expect(SOCIAL_CLOUD_USER_LOOKUP_CONTRACT_VERSION).toBe('0.28.0-f3');
    expect(SOCIAL_CLOUD_USER_LOOKUP_FORBIDDEN_BEHAVIORS).toEqual(
      expect.arrayContaining([
        'globalUserDirectory',
        'publicSuggestions',
        'partialHandleSearch',
        'fuzzyMatching',
        'automaticFriendship',
        'automaticFriendRequest',
        'rawActivityExport',
      ]),
    );
    expect(assertSocialCloudUserLookupContractIntegrity()).toBe(true);
  });

  it('conserve le fallback indisponible tant que le flag réel est désactivé', async () => {
    const gateway = createRuntimeSocialCloudUserLookupGateway({
      configResult: {
        config: {
          enabled: true,
          databaseUrl: 'https://sportpilot-prototype.dexie.cloud',
          realWeightSyncEnabled: true,
          realActivitySyncEnabled: true,
          realGoalSyncEnabled: true,
          realStrengthSyncEnabled: true,
          realNutritionJournalSyncEnabled: true,
          realNutritionLibrarySyncEnabled: true,
          realNutritionTrackingSyncEnabled: true,
          realAccountPreferencesSyncEnabled: true,
          realRewardsRoutinesSyncEnabled: true,
          realSocialCloudEnabled: false,
          diagnosticsEnabled: false,
        },
      },
    });

    await expect(gateway.lookupByHandle('@alex.run')).resolves.toEqual({ status: 'unavailable' });
  });
});
