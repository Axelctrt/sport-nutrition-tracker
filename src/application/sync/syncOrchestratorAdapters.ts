import type {
  SyncOrchestratorDomainAdapter,
  SyncOrchestratorDomainId,
  SyncOrchestratorPreview,
} from '@/application/sync/syncOrchestrator';
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
  add('weights', () => client.analyzeRealWeights(), () => client.syncRealWeights());
  add(
    'activities',
    client.analyzeRealActivities
      ? () => client.analyzeRealActivities!()
      : undefined,
    client.syncRealActivities ? () => client.syncRealActivities!() : undefined,
  );
  add(
    'goals',
    client.analyzeRealGoals ? () => client.analyzeRealGoals!() : undefined,
    client.syncRealGoals ? () => client.syncRealGoals!() : undefined,
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
      ? () => client.syncRealNutritionLibrary!()
      : undefined,
  );
  add(
    'nutrition-tracking',
    client.analyzeRealNutritionTracking
      ? () => client.analyzeRealNutritionTracking!()
      : undefined,
    client.syncRealNutritionTracking
      ? () => client.syncRealNutritionTracking!()
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
