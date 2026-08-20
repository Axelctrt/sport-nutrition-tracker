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
  synchronizeRegisteredRealGoalsByBusinessLww,
} from '@/infrastructure/sync-prototype/realGoalAutomaticSyncService';
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
  domainId: 'activities' | 'weights',
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
  // Make the local database authoritative before any provenance/LWW decision.
  await flushGoalStatePersistence();

  // Dexie Cloud 4.4.13 can satisfy a pull+wait call with the completion
  // timestamp of a sync that was already in flight when the pull was queued.
  // syncNow() followed by analyzeRealGoals() gives Goals a second sequential
  // pull barrier before provenance/LWW is evaluated.
  await client.syncNow();
  return client.analyzeRealGoals!();
}

async function synchronizeGoalsWithFreshCloudBarrier(
  client: SyncPrototypeClient,
): Promise<unknown> {
  await flushGoalStatePersistence();

  // A few adapter unit tests intentionally use a minimal client without a
  // snapshot. Keep their transport-barrier contract without changing runtime
  // behavior; production SyncPrototypeClient always exposes getSnapshot().
  if (typeof client.getSnapshot !== 'function') {
    await client.syncNow();
    return client.syncRealGoals!();
  }

  const initial = client.getSnapshot();
  const currentUserId = initial.account.userId;
  if (!currentUserId) return undefined;

  // Drain any in-flight transport, then analyze again. analyzeRealGoals()
  // performs its own forced pull and registers the exact local/cloud context
  // used immediately below.
  await client.syncNow();
  if (client.getSnapshot().account.userId !== currentUserId) return undefined;

  const refreshedPreview = await client.analyzeRealGoals!();
  if (client.getSnapshot().account.userId !== currentUserId) return undefined;
  if (refreshedPreview.differingEntityCount <= 0) return undefined;

  // Transport provenance (syncRevision/syncActorId) can move independently
  // from Goal.updatedAt. Automatic convergence therefore drops only the
  // device-local Goals provenance baseline and routes through the existing
  // bidirectional business LWW resolver.
  let result = await synchronizeRegisteredRealGoalsByBusinessLww(currentUserId);

  // Publish the selected business winner and pull server confirmation before
  // declaring convergence.
  await client.syncNow();
  if (client.getSnapshot().account.userId !== currentUserId) return result;

  let confirmedPreview = await client.analyzeRealGoals!();
  if (client.getSnapshot().account.userId !== currentUserId) return result;
  if (confirmedPreview.differingEntityCount <= 0) return result;

  // A late server row may appear only after the optimistic replica write. One
  // bounded retry re-runs the same LWW arbitration; remaining divergence is
  // surfaced instead of allowing a later directional cycle to overwrite it.
  await flushGoalStatePersistence();
  await client.syncNow();
  if (client.getSnapshot().account.userId !== currentUserId) return result;

  const retryPreview = await client.analyzeRealGoals!();
  if (client.getSnapshot().account.userId !== currentUserId) return result;
  if (retryPreview.differingEntityCount <= 0) return result;

  result = await synchronizeRegisteredRealGoalsByBusinessLww(currentUserId);

  await client.syncNow();
  if (client.getSnapshot().account.userId !== currentUserId) return result;

  confirmedPreview = await client.analyzeRealGoals!();
  if (confirmedPreview.differingEntityCount > 0) {
    throw new Error(
      'La convergence Goals reste divergente après confirmation transport.',
    );
  }

  return result;
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
    client.syncRealGoals
      ? () => synchronizeGoalsWithFreshCloudBarrier(client)
      : undefined,
    client.syncRealGoals
      ? () => synchronizeGoalsWithFreshCloudBarrier(client)
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
