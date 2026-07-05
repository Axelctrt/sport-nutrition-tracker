import type { EntityId } from '@/domain/models/common';
import { buildSyncPrototypeSocialCloudReadiness } from '@/infrastructure/sync-prototype/socialCloudReadinessAdapter';

describe('socialCloudReadinessAdapter', () => {
  it('dégrade proprement quand le prototype Dexie Cloud est désactivé', () => {
    expect(buildSyncPrototypeSocialCloudReadiness({ enabled: false })).toMatchObject({
      status: 'disabled',
      canLookupUsers: false,
    });
  });

  it('reconnaît le contrat social sans activer les mutations réelles', () => {
    expect(
      buildSyncPrototypeSocialCloudReadiness({
        enabled: true,
        databaseUrl: 'https://sportpilot.dexie.cloud',
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
      }),
    ).toMatchObject({
      status: 'contractReady',
      canSendFriendRequests: false,
      canPublishSnapshots: false,
    });
  });

  it('active les capacités seulement si un utilisateur cloud est connu', () => {
    const base = {
      enabled: true as const,
      databaseUrl: 'https://sportpilot.dexie.cloud',
      realWeightSyncEnabled: true,
      realActivitySyncEnabled: true,
      realGoalSyncEnabled: true,
      realStrengthSyncEnabled: true,
      realNutritionJournalSyncEnabled: true,
      realNutritionLibrarySyncEnabled: true,
      realNutritionTrackingSyncEnabled: true,
      realAccountPreferencesSyncEnabled: true,
      realRewardsRoutinesSyncEnabled: true,
      realSocialCloudEnabled: true,
      diagnosticsEnabled: false,
    };

    expect(buildSyncPrototypeSocialCloudReadiness(base)).toMatchObject({
      status: 'missingAuthenticatedUser',
      canLookupUsers: false,
    });
    expect(buildSyncPrototypeSocialCloudReadiness(base, 'social-user:alex' as EntityId)).toMatchObject({
      status: 'contractReady',
      canLookupUsers: true,
      canPublishSnapshots: true,
    });
  });
});
