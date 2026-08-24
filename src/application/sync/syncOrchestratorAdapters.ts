import type {
  SyncOrchestratorDomainAdapter,
  SyncOrchestratorDomainId,
  SyncOrchestratorPreview,
} from '@/application/sync/syncOrchestrator';
import { notifySyncLocalDataChanged } from '@/application/sync/syncLocalChangeEvents';
import { flushGoalStatePersistence } from '@/domain/goals/goalState';
import {
  synchronizeRegisteredRealActivitiesFromCloud,
  synchronizeRegisteredRealActivitiesToCloud,
} from '@/infrastructure/sync-prototype/realActivitySyncService';
import {
  synchronizeRegisteredRealGoalsFromCloud,
  synchronizeRegisteredRealGoalsToCloud,
} from '@/infrastructure/sync-prototype/realGoalSyncService';
import {
  synchronizeRegisteredRealWeightsFromCloud,
  synchronizeRegisteredRealWeightsToCloud,
} from '@/infrastructure/sync-prototype/realWeightSyncService';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';

export const SYNC_ORCHESTRATOR_DOMAIN_IDS = [
  'account-preferences',
  'rewards-routines',
  'weights',
  'activities',
  'goals',
  'strength',
  'nutrition-journal',
  'nutrition-library',
  'nutrition-tracking',
  'daily-coaching',
] as const satisfies readonly SyncOrchestratorDomainId[];

export function readSyncOrchestratorPreview(
  snapshot: SyncPrototypeSnapshot,
  id: SyncOrchestratorDomainId,
): SyncOrchestratorPreview | undefined {
  switch (id) {
    case 'account-preferences':
      return snapshot.realAccountPreferences?.preview;
    case 'rewards-routines':
      return snapshot.realRewardsRoutines?.preview;
    case 'weights':
      return snapshot.realWeights?.preview;
    case 'activities':
      return snapshot.realActivities?.preview;
    case 'goals':
      return snapshot.realGoals?.preview;
    case 'strength':
      return snapshot.realStrength?.preview;
    case 'nutrition-journal':
      return snapshot.realNutritionJournal?.preview;
    case 'nutrition-library':
      return snapshot.realNutritionLibrary?.preview;
    case 'nutrition-tracking':
      return snapshot.realNutritionTracking?.preview;
    case 'daily-coaching':
      return snapshot.realDailyCoaching?.preview;
  }
}

async function synchronizeRegisteredDirection(
  client: SyncPrototypeClient,
  domainId: 'activities' | 'weights' | 'goals',
  expectedOrigin: 'cloud' | 'local',
  synchronizeRegistered: (currentUserId: string) => Promise<unknown>,
  analyze: () => Promise<{ readonly differingEntityCount: number }>,
): Promise<unknown> {
  const before = client.getSnapshot();
  const preview = readSyncOrchestratorPreview(before, domainId);
  const currentUserId = before.account.userId;
  if (
    !currentUserId ||
    !preview ||
    preview.differingEntityCount <= 0 ||
    preview.changeOrigin !== expectedOrigin
  ) {
    return undefined;
  }

  await client.syncNow();
  if (client.getSnapshot().account.userId !== currentUserId) return undefined;

  // Re-analyze after the transport refresh. Besides revalidating provenance,
  // this rebinds the registered service context to this exact client/device
  // immediately before the directional write.
  await analyze();
  const refreshed = client.getSnapshot();
  const refreshedPreview = readSyncOrchestratorPreview(refreshed, domainId);
  if (
    refreshed.account.userId !== currentUserId ||
    !refreshedPreview ||
    refreshedPreview.differingEntityCount <= 0 ||
    refreshedPreview.changeOrigin !== expectedOrigin
  ) {
    return undefined;
  }

  const result = await synchronizeRegistered(currentUserId);
  if (expectedOrigin === 'local') {
    await client.syncNow();
    if (client.getSnapshot().account.userId !== currentUserId) return result;
  }
  await analyze();
  return result;
}

async function analyzeGoalsWithFreshCloudBarrier(
  client: SyncPrototypeClient,
): Promise<{ readonly differingEntityCount: number }> {
  // Local Goals live in an in-memory runtime with queued Dexie persistence.
  // Make the local database authoritative before any provenance decision.
  await flushGoalStatePersistence();

  // The local mutation and its causal parent have already been staged into the
  // Dexie Cloud replica by AutomaticSyncCoordinator. Transport lets the server
  // execute the declarative head CAS before SportPilot reads the accepted head.
  await client.syncNow();
  return client.analyzeRealGoals!();
}

async function synchronizeGoalsWithFreshCloudBarrier(
  client: SyncPrototypeClient,
): Promise<unknown> {
  await flushGoalStatePersistence();

  // both/unknown remains the explicit business reconciliation fallback for
  // legacy/initial cases that have no trustworthy staged directional baseline.
  await client.syncNow();
  return client.syncRealGoals!();
}

async function synchronizeNutritionLibrary(
  client: SyncPrototypeClient,
): Promise<unknown> {
  const result = await client.syncRealNutritionLibrary!();
  if (result.remappedProductReferences > 0) {
    notifySyncLocalDataChanged(
      ['nutrition-journal'],
      'nutrition-library-product-remap',
    );
  }
  return result;
}

async function synchronizeNutritionTracking(
  client: SyncPrototypeClient,
): Promise<unknown> {
  const result = await client.syncRealNutritionTracking!();
  if (result.recalculatedDailyTargets > 0) {
    notifySyncLocalDataChanged(
      ['nutrition-journal'],
      'nutrition-tracking-daily-target-recalculation',
    );
  }
  return result;
}

export function createSyncOrchestratorDomains(
  client: SyncPrototypeClient,
): readonly SyncOrchestratorDomainAdapter[] {
  const adapters: SyncOrchestratorDomainAdapter[] = [];
  const add = (
    id: SyncOrchestratorDomainId,
    analyze: (() => Promise<{ readonly differingEntityCount: number }>) | undefined,
    synchronize: (() => Promise<unknown>) | undefined,
    synchronizeFromCloud?: (() => Promise<unknown>) | undefined,
    synchronizeToCloud?: (() => Promise<unknown>) | undefined,
  ) => {
    if (!analyze || !synchronize) return;
    adapters.push({
      id,
      analyze,
      synchronize: (syncMode) => {
        if (syncMode === 'cloud-only') {
          if (!synchronizeFromCloud) {
            return Promise.reject(new Error(
              `La convergence cloud-only n’est pas disponible pour ${id}.`,
            ));
          }
          return synchronizeFromCloud();
        }
        if (syncMode === 'local-only') {
          if (!synchronizeToCloud) {
            return Promise.reject(new Error(
              `L’envoi local-only n’est pas disponible pour ${id}.`,
            ));
          }
          return synchronizeToCloud();
        }
        return synchronize();
      },
      readPreview: () => readSyncOrchestratorPreview(client.getSnapshot(), id),
    });
  };

  add(
    'account-preferences',
    client.analyzeRealAccountPreferences
      ? () => client.analyzeRealAccountPreferences!()
      : undefined,
    client.syncRealAccountPreferences
      ? () => client.syncRealAccountPreferences!()
      : undefined,
  );
  add(
    'rewards-routines',
    client.analyzeRealRewardsRoutines
      ? () => client.analyzeRealRewardsRoutines!()
      : undefined,
    client.syncRealRewardsRoutines
      ? () => client.syncRealRewardsRoutines!()
      : undefined,
  );
  add(
    'weights',
    () => client.analyzeRealWeights(),
    () => client.syncRealWeights(),
    () => synchronizeRegisteredDirection(
      client,
      'weights',
      'cloud',
      synchronizeRegisteredRealWeightsFromCloud,
      () => client.analyzeRealWeights(),
    ),
    () => synchronizeRegisteredDirection(
      client,
      'weights',
      'local',
      synchronizeRegisteredRealWeightsToCloud,
      () => client.analyzeRealWeights(),
    ),
  );
  add(
    'activities',
    client.analyzeRealActivities
      ? () => client.analyzeRealActivities!()
      : undefined,
    client.syncRealActivities ? () => client.syncRealActivities!() : undefined,
    client.analyzeRealActivities
      ? () => synchronizeRegisteredDirection(
          client,
          'activities',
          'cloud',
          synchronizeRegisteredRealActivitiesFromCloud,
          () => client.analyzeRealActivities!(),
        )
      : undefined,
    client.analyzeRealActivities
      ? () => synchronizeRegisteredDirection(
          client,
          'activities',
          'local',
          synchronizeRegisteredRealActivitiesToCloud,
          () => client.analyzeRealActivities!(),
        )
      : undefined,
  );
  add(
    'goals',
    client.analyzeRealGoals
      ? () => analyzeGoalsWithFreshCloudBarrier(client)
      : undefined,
    client.syncRealGoals
      ? () => synchronizeGoalsWithFreshCloudBarrier(client)
      : undefined,
    client.analyzeRealGoals
      ? () => synchronizeRegisteredDirection(
          client,
          'goals',
          'cloud',
          synchronizeRegisteredRealGoalsFromCloud,
          () => client.analyzeRealGoals!(),
        )
      : undefined,
    client.analyzeRealGoals
      ? () => synchronizeRegisteredDirection(
          client,
          'goals',
          'local',
          synchronizeRegisteredRealGoalsToCloud,
          () => client.analyzeRealGoals!(),
        )
      : undefined,
  );
  add(
    'strength',
    client.analyzeRealStrength ? () => client.analyzeRealStrength!() : undefined,
    client.syncRealStrength ? () => client.syncRealStrength!() : undefined,
    client.syncRealStrengthFromCloud
      ? () => client.syncRealStrengthFromCloud!()
      : undefined,
    client.syncRealStrengthToCloud
      ? () => client.syncRealStrengthToCloud!()
      : undefined,
  );
  add(
    'nutrition-journal',
    client.analyzeRealNutritionJournal
      ? () => client.analyzeRealNutritionJournal!()
      : undefined,
    client.syncRealNutritionJournal
      ? () => client.syncRealNutritionJournal!()
      : undefined,
  );
  add(
    'nutrition-library',
    client.analyzeRealNutritionLibrary
      ? () => client.analyzeRealNutritionLibrary!()
      : undefined,
    client.syncRealNutritionLibrary
      ? () => synchronizeNutritionLibrary(client)
      : undefined,
  );
  add(
    'nutrition-tracking',
    client.analyzeRealNutritionTracking
      ? () => client.analyzeRealNutritionTracking!()
      : undefined,
    client.syncRealNutritionTracking
      ? () => synchronizeNutritionTracking(client)
      : undefined,
  );
  add(
    'daily-coaching',
    client.analyzeRealDailyCoaching
      ? () => client.analyzeRealDailyCoaching!()
      : undefined,
    client.syncRealDailyCoaching
      ? () => client.syncRealDailyCoaching!()
      : undefined,
  );

  return adapters;
}
