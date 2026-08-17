import type { SyncOrchestratorDomainAdapter } from '@/application/sync/syncOrchestrator';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import type {
  DomainDescriptor,
  UnifiedDomainId,
} from './unifiedSyncCenterModel';

function snapshotPreview(
  snapshot: SyncPrototypeSnapshot,
  id: UnifiedDomainId,
): { readonly differingEntityCount: number } | undefined {
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

function goalsHaveDirectionalOrigin(client: SyncPrototypeClient): boolean {
  const origin = client.getSnapshot().realGoals?.preview?.changeOrigin;
  return origin === 'local' || origin === 'cloud';
}

async function synchronizeGoalsSafely(client: SyncPrototypeClient): Promise<unknown> {
  if (!client.syncRealGoals || !goalsHaveDirectionalOrigin(client)) return undefined;
  return client.syncRealGoals();
}

export function createOrchestratorDomains(
  client: SyncPrototypeClient,
): readonly SyncOrchestratorDomainAdapter[] {
  const adapters: SyncOrchestratorDomainAdapter[] = [];
  const add = (
    id: UnifiedDomainId,
    analyze: (() => Promise<{ readonly differingEntityCount: number }>) | undefined,
    synchronize: (() => Promise<unknown>) | undefined,
  ) => {
    if (!analyze || !synchronize) return;
    adapters.push({
      id,
      analyze,
      synchronize,
      readPreview: () => snapshotPreview(client.getSnapshot(), id),
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
    client.analyzeRealActivities ? () => client.analyzeRealActivities!() : undefined,
    client.syncRealActivities ? () => client.syncRealActivities!() : undefined,
  );
  add(
    'goals',
    client.analyzeRealGoals ? () => client.analyzeRealGoals!() : undefined,
    client.syncRealGoals ? () => synchronizeGoalsSafely(client) : undefined,
  );
  add(
    'strength',
    client.analyzeRealStrength ? () => client.analyzeRealStrength!() : undefined,
    client.syncRealStrength ? () => client.syncRealStrength!() : undefined,
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

export function createDomains(
  client: SyncPrototypeClient | null,
  snapshot: SyncPrototypeSnapshot,
): readonly DomainDescriptor[] {
  const descriptors: readonly Omit<
    DomainDescriptor,
    | 'enabled'
    | 'snapshotStatus'
    | 'differingEntityCount'
    | 'snapshotErrorMessage'
    | 'analyze'
    | 'synchronize'
  >[] = [
    {
      id: 'account-preferences',
      label: 'Profil et réglages',
      description: 'Profil, calculs, tableau de bord et modèles d’endurance.',
      detailId: 'sync-detail-account-preferences',
    },
    {
      id: 'rewards-routines',
      label: 'Récompenses et routines',
      description: 'Badges, thèmes SportPilot, missions et rappels.',
      detailId: 'sync-detail-rewards-routines',
    },
    {
      id: 'weights',
      label: 'Pesées',
      description: 'Historique du poids et suppressions associées.',
      detailId: 'sync-detail-weights',
    },
    {
      id: 'activities',
      label: 'Activités',
      description: 'Course, marche, vélo, natation et cardio.',
      detailId: 'sync-detail-activities',
    },
    {
      id: 'goals',
      label: 'Objectifs',
      description: 'Objectifs sportifs et nutritionnels suivis.',
      detailId: 'sync-detail-goals',
    },
    {
      id: 'strength',
      label: 'Musculation',
      description: 'Exercices, modèles, séances et historique.',
      detailId: 'sync-detail-strength',
    },
    {
      id: 'nutrition-journal',
      label: 'Journal nutritionnel',
      description: 'Journées, repas, aliments et objectifs quotidiens recalculés, notamment après une pesée.',
      detailId: 'sync-detail-nutrition-journal',
    },
    {
      id: 'nutrition-library',
      label: 'Bibliothèque nutritionnelle',
      description: 'Produits, recettes et repas favoris.',
      detailId: 'sync-detail-nutrition-library',
    },
    {
      id: 'nutrition-tracking',
      label: 'Suivi nutritionnel',
      description: 'Bilans et états de suivi nutritionnel.',
      detailId: 'sync-detail-nutrition-tracking',
    },
  ];

  return descriptors.map((descriptor): DomainDescriptor => {
    const preview = snapshotPreview(snapshot, descriptor.id);

    switch (descriptor.id) {
      case 'account-preferences': {
        const state = snapshot.realAccountPreferences;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealAccountPreferences && client.syncRealAccountPreferences),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealAccountPreferences
            ? { analyze: () => client.analyzeRealAccountPreferences!() }
            : {}),
          ...(client?.syncRealAccountPreferences
            ? { synchronize: () => client.syncRealAccountPreferences!() }
            : {}),
        };
      }
      case 'rewards-routines': {
        const state = snapshot.realRewardsRoutines;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealRewardsRoutines && client.syncRealRewardsRoutines),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealRewardsRoutines
            ? { analyze: () => client.analyzeRealRewardsRoutines!() }
            : {}),
          ...(client?.syncRealRewardsRoutines
            ? { synchronize: () => client.syncRealRewardsRoutines!() }
            : {}),
        };
      }
      case 'weights': {
        const state = snapshot.realWeights;
        return {
          ...descriptor,
          enabled: Boolean(state && client),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client ? { analyze: () => client.analyzeRealWeights() } : {}),
          ...(client ? { synchronize: () => client.syncRealWeights() } : {}),
        };
      }
      case 'activities': {
        const state = snapshot.realActivities;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealActivities && client.syncRealActivities),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealActivities
            ? { analyze: () => client.analyzeRealActivities!() }
            : {}),
          ...(client?.syncRealActivities
            ? { synchronize: () => client.syncRealActivities!() }
            : {}),
        };
      }
      case 'goals': {
        const state = snapshot.realGoals;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealGoals && client.syncRealGoals),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealGoals
            ? { analyze: () => client.analyzeRealGoals!() }
            : {}),
          ...(client?.syncRealGoals
            ? { synchronize: () => synchronizeGoalsSafely(client) }
            : {}),
        };
      }
      case 'strength': {
        const state = snapshot.realStrength;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealStrength && client.syncRealStrength),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealStrength
            ? { analyze: () => client.analyzeRealStrength!() }
            : {}),
          ...(client?.syncRealStrength
            ? { synchronize: () => client.syncRealStrength!() }
            : {}),
        };
      }
      case 'nutrition-journal': {
        const state = snapshot.realNutritionJournal;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealNutritionJournal && client.syncRealNutritionJournal),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealNutritionJournal
            ? { analyze: () => client.analyzeRealNutritionJournal!() }
            : {}),
          ...(client?.syncRealNutritionJournal
            ? { synchronize: () => client.syncRealNutritionJournal!() }
            : {}),
        };
      }
      case 'nutrition-library': {
        const state = snapshot.realNutritionLibrary;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealNutritionLibrary && client.syncRealNutritionLibrary),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealNutritionLibrary
            ? { analyze: () => client.analyzeRealNutritionLibrary!() }
            : {}),
          ...(client?.syncRealNutritionLibrary
            ? { synchronize: () => client.syncRealNutritionLibrary!() }
            : {}),
        };
      }
      case 'nutrition-tracking': {
        const state = snapshot.realNutritionTracking;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealNutritionTracking && client.syncRealNutritionTracking),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealNutritionTracking
            ? { analyze: () => client.analyzeRealNutritionTracking!() }
            : {}),
          ...(client?.syncRealNutritionTracking
            ? { synchronize: () => client.syncRealNutritionTracking!() }
            : {}),
        };
      }
      case 'daily-coaching': {
        const state = snapshot.realDailyCoaching;
        return {
          ...descriptor,
          detailId: 'sync-detail-nutrition-tracking',
          enabled: Boolean(
            state
            && client?.analyzeRealDailyCoaching
            && client.syncRealDailyCoaching,
          ),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealDailyCoaching
            ? { analyze: () => client.analyzeRealDailyCoaching!() }
            : {}),
          ...(client?.syncRealDailyCoaching
            ? { synchronize: () => client.syncRealDailyCoaching!() }
            : {}),
        };
      }
    }
  });
}
