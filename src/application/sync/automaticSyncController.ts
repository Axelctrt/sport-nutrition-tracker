import {
  AUTOMATIC_ACCOUNT_SYNC_PREFERENCE_CHANGED_EVENT,
  CLOUD_ACCOUNT_RESTORED_EVENT,
} from '@/application/sync/automaticSyncEvents';
import {
  createSyncOrchestratorDomains,
} from '@/application/sync/syncOrchestratorAdapters';
import {
  createSyncOrchestrator,
  type SyncOrchestrator,
  type SyncOrchestratorDomainId,
  type SyncOrchestratorRunResult,
  type SyncOrchestratorSource,
  type SyncOrchestratorSyncMode,
} from '@/application/sync/syncOrchestrator';
import {
  SYNC_LOCAL_DATA_CHANGED_EVENT,
  syncLocalDataChangedDetail,
} from '@/application/sync/syncLocalChangeEvents';
import { GOAL_STATE_PERSISTED_EVENT } from '@/domain/goals/goalState';
import { ENDURANCE_PLANNING_PERSISTED_EVENT } from '@/domain/planning/endurancePlanningState';
import type { AppSettings } from '@/domain/models/settings';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createSyncPrototypeAccountFingerprint } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import { REAL_WEIGHT_DATA_CHANGED_EVENT } from '@/infrastructure/sync-prototype/weightSyncEvents';

const FOREGROUND_MINIMUM_INTERVAL_MS = 30_000;
const LIFECYCLE_DEBOUNCE_MS = 250;
const LOCAL_CHANGE_DEBOUNCE_MS = 1_500;

const SAFE_REMOTE_CONVERGENCE_DOMAIN_IDS =
  new Set<SyncOrchestratorDomainId>(['strength', 'goals', 'weights', 'activities']);
const SAFE_LOCAL_UPLOAD_DOMAIN_IDS =
  new Set<SyncOrchestratorDomainId>(['strength', 'goals', 'weights', 'activities']);
const SAFE_MERGE_DOMAIN_IDS = new Set<SyncOrchestratorDomainId>([
  'account-preferences',
  'rewards-routines',
  'goals',
  'daily-coaching',
  'nutrition-journal',
  'nutrition-library',
  'nutrition-tracking',
]);

export type AutomaticSyncConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'unknown';

export interface AutomaticSyncControllerSnapshot {
  readonly initialized: boolean;
  readonly enabled: boolean;
  readonly accountFingerprint: string | undefined;
  readonly authorizedAccountFingerprint: string | undefined;
  readonly connectionAllowed: boolean;
  readonly lastTriggerSource: SyncOrchestratorSource | undefined;
  readonly lastOperation: 'analyze' | 'sync' | undefined;
  readonly lastCompletedAt: string | undefined;
  readonly errorMessage: string | undefined;
}

export interface AutomaticSyncControllerOptions {
  readonly client: SyncPrototypeClient;
  readonly settingsRepository: SettingsRepository;
  readonly eventTarget?: EventTarget;
  readonly visibilityTarget?: EventTarget;
  readonly isVisible?: () => boolean;
  readonly isOnline?: () => boolean;
  readonly connectionType?: () => AutomaticSyncConnectionType;
  readonly now?: () => Date;
  readonly foregroundMinimumIntervalMs?: number;
  readonly lifecycleDebounceMs?: number;
  readonly localChangeDebounceMs?: number;
  readonly createOrchestrator?: (
    accountKey: string,
    client: SyncPrototypeClient,
  ) => SyncOrchestrator;
}

function accountFingerprint(snapshot: SyncPrototypeSnapshot): string | undefined {
  return createSyncPrototypeAccountFingerprint(
    snapshot.account.userId ?? snapshot.account.email,
  )?.toLowerCase();
}

function automaticDomainIds(
  settings: AppSettings,
  snapshot: SyncPrototypeSnapshot,
): SyncOrchestratorDomainId[] {
  const domainIds: SyncOrchestratorDomainId[] = [];

  if (snapshot.realAccountPreferences?.enabled) {
    domainIds.push('account-preferences');
  }
  if (snapshot.realRewardsRoutines?.enabled) {
    domainIds.push('rewards-routines');
  }
  if (snapshot.realWeights?.enabled && !settings.automaticWeightSyncEnabled) {
    domainIds.push('weights');
  }
  if (snapshot.realActivities?.enabled) domainIds.push('activities');
  if (snapshot.realGoals?.enabled) domainIds.push('goals');
  if (snapshot.realStrength?.enabled) domainIds.push('strength');
  if (snapshot.realNutritionJournal?.enabled) {
    domainIds.push('nutrition-journal');
  }
  if (snapshot.realNutritionLibrary?.enabled) {
    domainIds.push('nutrition-library');
  }
  if (snapshot.realNutritionTracking?.enabled) {
    domainIds.push('nutrition-tracking');
  }
  if (snapshot.realDailyCoaching?.enabled) domainIds.push('daily-coaching');

  return domainIds;
}

function normalizeDomains(
  requested: readonly SyncOrchestratorDomainId[],
  allowed: readonly SyncOrchestratorDomainId[],
): SyncOrchestratorDomainId[] {
  const allowedSet = new Set(allowed);
  return [...new Set(requested)].filter((domainId) => allowedSet.has(domainId));
}

function safeRemoteConvergenceDomainIds(
  result: SyncOrchestratorRunResult,
): SyncOrchestratorDomainId[] {
  return result.domainResults
    .filter((domainResult) =>
      SAFE_REMOTE_CONVERGENCE_DOMAIN_IDS.has(domainResult.domainId)
      && domainResult.status === 'cloud-changes-available'
      && domainResult.changeOrigin === 'cloud'
      && (domainResult.differingEntityCount ?? 0) > 0,
    )
    .map((domainResult) => domainResult.domainId);
}

function safeLocalUploadDomainIds(
  result: SyncOrchestratorRunResult,
): SyncOrchestratorDomainId[] {
  return result.domainResults
    .filter((domainResult) =>
      SAFE_LOCAL_UPLOAD_DOMAIN_IDS.has(domainResult.domainId)
      && domainResult.status === 'local-changes-pending'
      && domainResult.changeOrigin === 'local'
      && (domainResult.differingEntityCount ?? 0) > 0,
    )
    .map((domainResult) => domainResult.domainId);
}

function safeMergeDomainIds(
  result: SyncOrchestratorRunResult,
): SyncOrchestratorDomainId[] {
  return result.domainResults
    .filter((domainResult) =>
      SAFE_MERGE_DOMAIN_IDS.has(domainResult.domainId)
      && domainResult.status === 'action-required'
      && (domainResult.differingEntityCount ?? 0) > 0,
    )
    .map((domainResult) => domainResult.domainId);
}

export class AutomaticSyncController {
  private readonly client: SyncPrototypeClient;
  private readonly settingsRepository: SettingsRepository;
  private readonly eventTarget: EventTarget | undefined;
  private readonly visibilityTarget: EventTarget | undefined;
  private readonly isVisible: () => boolean;
  private readonly isOnline: () => boolean;
  private readonly connectionType: () => AutomaticSyncConnectionType;
  private readonly now: () => Date;
  private readonly foregroundMinimumIntervalMs: number;
  private readonly lifecycleDebounceMs: number;
  private readonly localChangeDebounceMs: number;
  private readonly createOrchestrator: (
    accountKey: string,
    client: SyncPrototypeClient,
  ) => SyncOrchestrator;
  private readonly listeners = new Set<() => void>();

  private settings: AppSettings | undefined;
  private orchestrator: SyncOrchestrator | undefined;
  private orchestratorAccountKey: string | undefined;
  private identityGeneration = 0;
  private unsubscribeClient: (() => void) | undefined;
  private initializationPromise: Promise<void> | undefined;
  private disposed = false;
  private previousLoggedIn = false;
  private previousCloudReady = false;
  private previousFingerprint: string | undefined;
  private lastForegroundTriggerAt = 0;
  private snapshot: AutomaticSyncControllerSnapshot = {
    initialized: false,
    enabled: false,
    connectionAllowed: true,
    accountFingerprint: undefined,
    authorizedAccountFingerprint: undefined,
    lastTriggerSource: undefined,
    lastOperation: undefined,
    lastCompletedAt: undefined,
    errorMessage: undefined,
  };

  private readonly handleOnline = () => {
    void this.triggerLifecycle('network-restored');
  };

  private readonly handleFocus = () => {
    void this.triggerForeground();
  };

  private readonly handleVisibility = () => {
    if (this.isVisible()) void this.triggerForeground();
  };

  private readonly handlePreferenceChange = () => {
    void this.reloadSettings(true);
  };

  private readonly handleCloudRestore = () => {
    void this.triggerLifecycle('cloud-restore');
  };

  private readonly handleLocalDataChange = (event: Event) => {
    const detail = syncLocalDataChangedDetail(event);
    if (!detail) return;
    void this.triggerLocalChange(detail.domainIds);
  };

  private readonly handleWeightChange = () => {
    void this.triggerLocalChange(['weights']);
  };

  private readonly handleGoalPersisted = () => {
    void this.triggerLocalChange(['goals']);
  };

  private readonly handleEndurancePlanningPersisted = () => {
    void this.triggerLocalChange(['activities']);
  };

  constructor(options: AutomaticSyncControllerOptions) {
    this.client = options.client;
    this.settingsRepository = options.settingsRepository;
    this.eventTarget = options.eventTarget;
    this.visibilityTarget = options.visibilityTarget;
    this.isVisible = options.isVisible ?? (() => true);
    this.isOnline = options.isOnline ?? (() => true);
    this.connectionType = options.connectionType ?? (() => 'unknown');
    this.now = options.now ?? (() => new Date());
    this.foregroundMinimumIntervalMs =
      options.foregroundMinimumIntervalMs ?? FOREGROUND_MINIMUM_INTERVAL_MS;
    this.lifecycleDebounceMs =
      options.lifecycleDebounceMs ?? LIFECYCLE_DEBOUNCE_MS;
    this.localChangeDebounceMs =
      options.localChangeDebounceMs ?? LOCAL_CHANGE_DEBOUNCE_MS;
    this.createOrchestrator =
      options.createOrchestrator ??
      ((accountKey, client) =>
        createSyncOrchestrator({
          accountKey,
          domains: createSyncOrchestratorDomains(client),
          isOnline: this.isOnline,
          preflight: async () => {
            await client.ensureValidCloudCredentials?.();
          },
        }));
  }

  getSnapshot = (): AutomaticSyncControllerSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private updateSnapshot(
    changes: Partial<AutomaticSyncControllerSnapshot>,
  ): void {
    this.snapshot = {
      ...this.snapshot,
      ...changes,
    };
    for (const listener of this.listeners) listener();
  }

  initialize(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = Promise.all([
      this.settingsRepository.get(),
      this.client.initialize(),
    ])
      .then(([settings]) => {
        if (this.disposed) return;
        this.settings = settings;
        this.attachListeners();
        this.unsubscribeClient = this.client.subscribe(() => {
          void this.handleClientSnapshot();
        });
        this.handleAccountIdentity(this.client.getSnapshot());
        this.updatePreferenceSnapshot();
        this.updateSnapshot({ initialized: true, errorMessage: undefined });
        return this.triggerLifecycle('application-start');
      })
      .catch((error: unknown) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'La synchronisation automatique n’a pas pu être initialisée.';
        this.updateSnapshot({ initialized: true, errorMessage });
        throw error;
      });

    return this.initializationPromise;
  }

  private attachListeners(): void {
    this.eventTarget?.addEventListener('online', this.handleOnline);
    this.eventTarget?.addEventListener('focus', this.handleFocus);
    this.eventTarget?.addEventListener(
      AUTOMATIC_ACCOUNT_SYNC_PREFERENCE_CHANGED_EVENT,
      this.handlePreferenceChange,
    );
    this.eventTarget?.addEventListener(
      CLOUD_ACCOUNT_RESTORED_EVENT,
      this.handleCloudRestore,
    );
    this.eventTarget?.addEventListener(
      SYNC_LOCAL_DATA_CHANGED_EVENT,
      this.handleLocalDataChange,
    );
    this.eventTarget?.addEventListener(
      REAL_WEIGHT_DATA_CHANGED_EVENT,
      this.handleWeightChange,
    );
    this.eventTarget?.addEventListener(
      GOAL_STATE_PERSISTED_EVENT,
      this.handleGoalPersisted,
    );
    this.eventTarget?.addEventListener(
      ENDURANCE_PLANNING_PERSISTED_EVENT,
      this.handleEndurancePlanningPersisted,
    );
    this.visibilityTarget?.addEventListener(
      'visibilitychange',
      this.handleVisibility,
    );
  }

  private detachListeners(): void {
    this.eventTarget?.removeEventListener('online', this.handleOnline);
    this.eventTarget?.removeEventListener('focus', this.handleFocus);
    this.eventTarget?.removeEventListener(
      AUTOMATIC_ACCOUNT_SYNC_PREFERENCE_CHANGED_EVENT,
      this.handlePreferenceChange,
    );
    this.eventTarget?.removeEventListener(
      CLOUD_ACCOUNT_RESTORED_EVENT,
      this.handleCloudRestore,
    );
    this.eventTarget?.removeEventListener(
      SYNC_LOCAL_DATA_CHANGED_EVENT,
      this.handleLocalDataChange,
    );
    this.eventTarget?.removeEventListener(
      REAL_WEIGHT_DATA_CHANGED_EVENT,
      this.handleWeightChange,
    );
    this.eventTarget?.removeEventListener(
      GOAL_STATE_PERSISTED_EVENT,
      this.handleGoalPersisted,
    );
    this.eventTarget?.removeEventListener(
      ENDURANCE_PLANNING_PERSISTED_EVENT,
      this.handleEndurancePlanningPersisted,
    );
    this.visibilityTarget?.removeEventListener(
      'visibilitychange',
      this.handleVisibility,
    );
  }

  private async reloadSettings(triggerAfterReload: boolean): Promise<void> {
    try {
      this.settings = await this.settingsRepository.get();
      this.updatePreferenceSnapshot();
      if (triggerAfterReload) await this.triggerLifecycle('application-start');
    } catch (error) {
      this.updateSnapshot({
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Le réglage de synchronisation automatique n’a pas pu être relu.',
      });
    }
  }

  private updatePreferenceSnapshot(): void {
    const clientSnapshot = this.client.getSnapshot();
    const currentFingerprint = accountFingerprint(clientSnapshot);
    const settings = this.settings;
    const connectionAllowed = this.connectionAllowed(settings);
    this.updateSnapshot({
      enabled: settings?.automaticAccountSyncEnabled === true,
      ...(currentFingerprint
        ? { accountFingerprint: currentFingerprint }
        : { accountFingerprint: undefined }),
      ...(settings?.automaticAccountSyncAccountFingerprint
        ? {
            authorizedAccountFingerprint:
              settings.automaticAccountSyncAccountFingerprint.toLowerCase(),
          }
        : { authorizedAccountFingerprint: undefined }),
      connectionAllowed,
    });
  }

  private connectionAllowed(settings = this.settings): boolean {
    if (!settings) return false;
    if (settings.automaticAccountSyncConnectionMode === 'any-connection') {
      return true;
    }
    return this.connectionType() === 'wifi';
  }

  private replaceOrchestratorForAccount(
    nextFingerprint: string | undefined,
  ): void {
    if (nextFingerprint === this.orchestratorAccountKey) return;

    this.identityGeneration += 1;
    this.orchestrator?.dispose();
    this.orchestrator = nextFingerprint
      ? this.createOrchestrator(nextFingerprint, this.client)
      : undefined;
    this.orchestratorAccountKey = nextFingerprint;
  }

  private isCurrentOperation(
    generation: number,
    orchestrator: SyncOrchestrator,
  ): boolean {
    return (
      !this.disposed
      && generation === this.identityGeneration
      && orchestrator === this.orchestrator
    );
  }

  private isCurrentAccountOperation(
    generation: number,
    orchestrator: SyncOrchestrator,
    expectedFingerprint: string,
  ): boolean {
    return (
      this.isCurrentOperation(generation, orchestrator)
      && accountFingerprint(this.client.getSnapshot()) === expectedFingerprint
    );
  }

  private handleAccountIdentity(snapshot: SyncPrototypeSnapshot): void {
    const nextFingerprint = accountFingerprint(snapshot);
    this.replaceOrchestratorForAccount(nextFingerprint);
    this.previousFingerprint = nextFingerprint;
    this.previousLoggedIn = snapshot.account.isLoggedIn;
    const access = this.client.getCloudAccessState?.();
    this.previousCloudReady = access
      ? access.isOperational || access.canAttemptRenewal
      : snapshot.account.isLoggedIn;
    this.updatePreferenceSnapshot();
  }

  private async handleClientSnapshot(): Promise<void> {
    const clientSnapshot = this.client.getSnapshot();
    const nextFingerprint = accountFingerprint(clientSnapshot);
    const becameConnected =
      clientSnapshot.account.isLoggedIn &&
      (!this.previousLoggedIn || nextFingerprint !== this.previousFingerprint);
    const access = this.client.getCloudAccessState?.();
    const cloudReady = access
      ? access.isOperational || access.canAttemptRenewal
      : clientSnapshot.account.isLoggedIn;
    const becameCloudReady = cloudReady && !this.previousCloudReady;

    this.replaceOrchestratorForAccount(nextFingerprint);

    this.previousLoggedIn = clientSnapshot.account.isLoggedIn;
    this.previousCloudReady = cloudReady;
    this.previousFingerprint = nextFingerprint;
    this.updatePreferenceSnapshot();

    if (becameConnected || becameCloudReady) {
      await this.triggerLifecycle('account-connected');
    }
  }

  private eligibleDomainIds(): SyncOrchestratorDomainId[] {
    const settings = this.settings;
    const clientSnapshot = this.client.getSnapshot();
    const currentFingerprint = accountFingerprint(clientSnapshot);
    const authorizedFingerprint =
      settings?.automaticAccountSyncAccountFingerprint?.toLowerCase();
    const cloudAccess = this.client.getCloudAccessState?.();

    if (
      !settings?.automaticAccountSyncEnabled ||
      !clientSnapshot.account.isLoggedIn ||
      (cloudAccess
        && !cloudAccess.isOperational
        && !cloudAccess.canAttemptRenewal) ||
      !currentFingerprint ||
      currentFingerprint !== authorizedFingerprint ||
      !this.isOnline() ||
      !this.connectionAllowed(settings)
    ) {
      return [];
    }

    return automaticDomainIds(settings, clientSnapshot);
  }

  private async triggerForeground(): Promise<void> {
    const timestamp = this.now().getTime();
    if (
      timestamp - this.lastForegroundTriggerAt <
      this.foregroundMinimumIntervalMs
    ) {
      return;
    }
    this.lastForegroundTriggerAt = timestamp;
    await this.triggerLifecycle('foreground');
  }

  private async applyMergeSafeAutomaticSyncs(
    orchestrator: SyncOrchestrator,
    generation: number,
    source: SyncOrchestratorSource,
    analysisResult: SyncOrchestratorRunResult,
  ): Promise<{
    readonly completedAt: string;
    readonly failedDomainCount: number;
  } | undefined> {
    const requestedDomainIds = safeMergeDomainIds(analysisResult);
    if (requestedDomainIds.length === 0) {
      return {
        completedAt: analysisResult.completedAt,
        failedDomainCount: 0,
      };
    }

    const expectedFingerprint = accountFingerprint(this.client.getSnapshot());
    if (!expectedFingerprint) return undefined;

    /*
     * Un état "action-required" n'est jamais écrit directement.
     * On rafraîchit d'abord le transport, puis on revalide le domaine
     * et l'identité avant toute convergence bidirectionnelle.
     */
    await this.client.syncNow();

    if (
      !this.isCurrentAccountOperation(
        generation,
        orchestrator,
        expectedFingerprint,
      )
    ) {
      return undefined;
    }

    this.updateSnapshot({ lastOperation: 'analyze' });

    const refreshedAnalysis = await orchestrator.schedule({
      operation: 'analyze',
      source,
      domainIds: requestedDomainIds,
      delayMs: 0,
    });

    if (
      !this.isCurrentAccountOperation(
        generation,
        orchestrator,
        expectedFingerprint,
      )
    ) {
      return undefined;
    }

    let completedAt = refreshedAnalysis.completedAt;
    const failedDomainIds = new Set<SyncOrchestratorDomainId>(
      refreshedAnalysis.failedDomainIds,
    );
    let wrote = false;

    /*
     * Goals peut redevenir strictement directionnel après le refresh
     * transport. Dans ce cas on conserve le chemin directionnel existant.
     */
    const directionalRequests: readonly {
      readonly domainIds: readonly SyncOrchestratorDomainId[];
      readonly syncMode: SyncOrchestratorSyncMode;
    }[] = [
      {
        domainIds: normalizeDomains(
          safeRemoteConvergenceDomainIds(refreshedAnalysis),
          requestedDomainIds,
        ),
        syncMode: 'cloud-only',
      },
      {
        domainIds: normalizeDomains(
          safeLocalUploadDomainIds(refreshedAnalysis),
          requestedDomainIds,
        ),
        syncMode: 'local-only',
      },
    ];

    for (const request of directionalRequests) {
      if (request.domainIds.length === 0) continue;

      this.updateSnapshot({ lastOperation: 'sync' });

      const result = await orchestrator.schedule({
        operation: 'sync',
        syncMode: request.syncMode,
        source,
        domainIds: request.domainIds,
        delayMs: 0,
      });

      if (
        !this.isCurrentAccountOperation(
          generation,
          orchestrator,
          expectedFingerprint,
        )
      ) {
        return undefined;
      }

      wrote = true;
      completedAt = result.completedAt;
      result.failedDomainIds.forEach((domainId) => {
        failedDomainIds.add(domainId);
      });
    }

    const mergeDomainIds = safeMergeDomainIds(refreshedAnalysis);

    if (mergeDomainIds.length > 0) {
      this.updateSnapshot({ lastOperation: 'sync' });

      const mergeResult = await orchestrator.schedule({
        operation: 'sync',
        syncMode: 'bidirectional',
        source,
        domainIds: mergeDomainIds,
        delayMs: 0,
      });

      if (
        !this.isCurrentAccountOperation(
          generation,
          orchestrator,
          expectedFingerprint,
        )
      ) {
        return undefined;
      }

      wrote = true;
      completedAt = mergeResult.completedAt;
      mergeResult.failedDomainIds.forEach((domainId) => {
        failedDomainIds.add(domainId);
      });
    }

    if (!wrote) {
      return {
        completedAt,
        failedDomainCount: failedDomainIds.size,
      };
    }

    /*
     * Une convergence merge-safe n'est considérée terminée qu'après
     * publication transport + relecture finale.
     */
    await this.client.syncNow();

    if (
      !this.isCurrentAccountOperation(
        generation,
        orchestrator,
        expectedFingerprint,
      )
    ) {
      return undefined;
    }

    this.updateSnapshot({ lastOperation: 'analyze' });

    const finalAnalysis = await orchestrator.schedule({
      operation: 'analyze',
      source,
      domainIds: requestedDomainIds,
      delayMs: 0,
    });

    if (
      !this.isCurrentAccountOperation(
        generation,
        orchestrator,
        expectedFingerprint,
      )
    ) {
      return undefined;
    }

    completedAt = finalAnalysis.completedAt;

    finalAnalysis.failedDomainIds.forEach((domainId) => {
      failedDomainIds.add(domainId);
    });

    for (const domainResult of finalAnalysis.domainResults) {
      if (
        requestedDomainIds.includes(domainResult.domainId)
        && (domainResult.differingEntityCount ?? 0) > 0
      ) {
        failedDomainIds.add(domainResult.domainId);
      }
    }

    return {
      completedAt,
      failedDomainCount: failedDomainIds.size,
    };
  }

  private async applySafeAutomaticSyncs(
    orchestrator: SyncOrchestrator,
    generation: number,
    source: SyncOrchestratorSource,
    analysisResult: SyncOrchestratorRunResult,
  ): Promise<{
    readonly completedAt: string;
    readonly failedDomainCount: number;
  } | undefined> {
    let completedAt = analysisResult.completedAt;
    let failedDomainCount = analysisResult.failedDomainIds.length;
    const requests: readonly {
      readonly domainIds: readonly SyncOrchestratorDomainId[];
      readonly syncMode: SyncOrchestratorSyncMode;
    }[] = [
      {
        domainIds: safeRemoteConvergenceDomainIds(analysisResult),
        syncMode: 'cloud-only',
      },
      {
        domainIds: safeLocalUploadDomainIds(analysisResult),
        syncMode: 'local-only',
      },
    ];

    for (const request of requests) {
      if (request.domainIds.length === 0) continue;
      this.updateSnapshot({ lastOperation: 'sync' });
      const syncResult = await orchestrator.schedule({
        operation: 'sync',
        syncMode: request.syncMode,
        source,
        domainIds: request.domainIds,
        delayMs: 0,
      });
      if (!this.isCurrentOperation(generation, orchestrator)) return undefined;
      completedAt = syncResult.completedAt;
      failedDomainCount += syncResult.failedDomainIds.length;
    }

    const mergeSafe = await this.applyMergeSafeAutomaticSyncs(
      orchestrator,
      generation,
      source,
      analysisResult,
    );
    if (!mergeSafe) return undefined;

    completedAt = mergeSafe.completedAt;
    failedDomainCount += mergeSafe.failedDomainCount;

    return { completedAt, failedDomainCount };
  }

  private async triggerLifecycle(source: SyncOrchestratorSource): Promise<void> {
    const domainIds = this.eligibleDomainIds();
    const orchestrator = this.orchestrator;
    if (!orchestrator || domainIds.length === 0) return;
    const generation = this.identityGeneration;

    this.updateSnapshot({
      lastTriggerSource: source,
      lastOperation: 'analyze',
      errorMessage: undefined,
    });

    try {
      const analysisResult = await orchestrator.schedule({
        operation: 'analyze',
        source,
        domainIds,
        delayMs: this.lifecycleDebounceMs,
      });
      if (!this.isCurrentOperation(generation, orchestrator)) return;

      const safeSyncs = await this.applySafeAutomaticSyncs(
        orchestrator,
        generation,
        source,
        analysisResult,
      );
      if (!safeSyncs) return;

      this.updateSnapshot({
        lastCompletedAt: safeSyncs.completedAt,
        ...(safeSyncs.failedDomainCount > 0
          ? {
              errorMessage: `${safeSyncs.failedDomainCount} rubrique(s) n’ont pas pu être traitées automatiquement.`,
            }
          : { errorMessage: undefined }),
      });
    } catch (error) {
      if (!this.isCurrentOperation(generation, orchestrator)) return;
      this.updateSnapshot({
        errorMessage:
          error instanceof Error
            ? error.message
            : 'La convergence automatique a échoué.',
      });
    }
  }

  private async triggerLocalChange(
    requestedDomainIds: readonly SyncOrchestratorDomainId[],
  ): Promise<void> {
    const allowedDomainIds = this.eligibleDomainIds();
    const orchestrator = this.orchestrator;
    if (!orchestrator || allowedDomainIds.length === 0) return;

    const domainIds = normalizeDomains(requestedDomainIds, allowedDomainIds);
    if (domainIds.length === 0) return;
    const generation = this.identityGeneration;

    this.updateSnapshot({
      lastTriggerSource: 'local-change',
      lastOperation: 'analyze',
      errorMessage: undefined,
    });

    try {
      const analysisResult = await orchestrator.schedule({
        operation: 'analyze',
        source: 'local-change',
        domainIds,
        delayMs: this.localChangeDebounceMs,
      });
      if (!this.isCurrentOperation(generation, orchestrator)) return;

      const safeSyncs = await this.applySafeAutomaticSyncs(
        orchestrator,
        generation,
        'local-change',
        analysisResult,
      );
      if (!safeSyncs) return;

      this.updateSnapshot({
        lastCompletedAt: safeSyncs.completedAt,
        ...(safeSyncs.failedDomainCount > 0
          ? {
              errorMessage: `${safeSyncs.failedDomainCount} rubrique(s) n’ont pas pu être traitées automatiquement.`,
            }
          : { errorMessage: undefined }),
      });
    } catch (error) {
      if (!this.isCurrentOperation(generation, orchestrator)) return;
      this.updateSnapshot({
        errorMessage:
          error instanceof Error
            ? error.message
            : 'La synchronisation automatique a échoué.',
      });
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.detachListeners();
    this.unsubscribeClient?.();
    this.unsubscribeClient = undefined;
    this.orchestrator?.dispose();
    this.orchestrator = undefined;
    this.listeners.clear();
  }
}
