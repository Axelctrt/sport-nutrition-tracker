import {
  AUTOMATIC_ACCOUNT_SYNC_PREFERENCE_CHANGED_EVENT,
  CLOUD_ACCOUNT_RESTORED_EVENT,
} from '@/application/sync/automaticSyncEvents';
import {
  createSyncOrchestratorDomains,
  readSyncOrchestratorPreview,
  SYNC_ORCHESTRATOR_DOMAIN_IDS,
} from '@/application/sync/syncOrchestratorAdapters';
import {
  createSyncOrchestrator,
  type SyncOrchestrator,
  type SyncOrchestratorDomainId,
  type SyncOrchestratorSource,
} from '@/application/sync/syncOrchestrator';
import {
  SYNC_LOCAL_DATA_CHANGED_EVENT,
  syncLocalDataChangedDetail,
} from '@/application/sync/syncLocalChangeEvents';
import { GOAL_STATE_CHANGED_EVENT } from '@/domain/goals/goalState';
import { WEEKLY_MISSION_HISTORY_CHANGED_EVENT } from '@/domain/rewards/weeklyMissionHistory';
import type { AppSettings } from '@/domain/models/settings';
import { ROUTINE_REMINDER_CHANGED_EVENT } from '@/application/reminders/routineReminderService';
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

function hasActiveDomainOperation(snapshot: SyncPrototypeSnapshot): boolean {
  const statuses = [
    snapshot.realAccountPreferences?.status,
    snapshot.realRewardsRoutines?.status,
    snapshot.realWeights?.status,
    snapshot.realActivities?.status,
    snapshot.realGoals?.status,
    snapshot.realStrength?.status,
    snapshot.realNutritionJournal?.status,
    snapshot.realNutritionLibrary?.status,
    snapshot.realNutritionTracking?.status,
  ];

  return statuses.some((status) => status === 'analyzing' || status === 'syncing');
}

function automaticDomainIds(settings: AppSettings): SyncOrchestratorDomainId[] {
  return SYNC_ORCHESTRATOR_DOMAIN_IDS.filter(
    (domainId) => !(domainId === 'weights' && settings.automaticWeightSyncEnabled),
  );
}

function normalizeDomains(
  requested: readonly SyncOrchestratorDomainId[],
  allowed: readonly SyncOrchestratorDomainId[],
): SyncOrchestratorDomainId[] {
  const allowedSet = new Set(allowed);
  return [...new Set(requested)].filter((domainId) => allowedSet.has(domainId));
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
  private unsubscribeClient: (() => void) | undefined;
  private initializationPromise: Promise<void> | undefined;
  private disposed = false;
  private previousLoggedIn = false;
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

  private readonly handleGoalChange = () => {
    void this.triggerLocalChange(['goals']);
  };

  private readonly handleRewardsChange = () => {
    void this.triggerLocalChange(['rewards-routines']);
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
      GOAL_STATE_CHANGED_EVENT,
      this.handleGoalChange,
    );
    this.eventTarget?.addEventListener(
      WEEKLY_MISSION_HISTORY_CHANGED_EVENT,
      this.handleRewardsChange,
    );
    this.eventTarget?.addEventListener(
      ROUTINE_REMINDER_CHANGED_EVENT,
      this.handleRewardsChange,
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
      GOAL_STATE_CHANGED_EVENT,
      this.handleGoalChange,
    );
    this.eventTarget?.removeEventListener(
      WEEKLY_MISSION_HISTORY_CHANGED_EVENT,
      this.handleRewardsChange,
    );
    this.eventTarget?.removeEventListener(
      ROUTINE_REMINDER_CHANGED_EVENT,
      this.handleRewardsChange,
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

  private handleAccountIdentity(snapshot: SyncPrototypeSnapshot): void {
    const nextFingerprint = accountFingerprint(snapshot);
    if (nextFingerprint !== this.orchestratorAccountKey) {
      this.orchestrator?.dispose();
      this.orchestrator = nextFingerprint
        ? this.createOrchestrator(nextFingerprint, this.client)
        : undefined;
      this.orchestratorAccountKey = nextFingerprint;
    }
    this.previousFingerprint = nextFingerprint;
    this.previousLoggedIn = snapshot.account.isLoggedIn;
    this.updatePreferenceSnapshot();
  }

  private async handleClientSnapshot(): Promise<void> {
    const clientSnapshot = this.client.getSnapshot();
    const nextFingerprint = accountFingerprint(clientSnapshot);
    const becameConnected =
      clientSnapshot.account.isLoggedIn &&
      (!this.previousLoggedIn || nextFingerprint !== this.previousFingerprint);

    if (nextFingerprint !== this.orchestratorAccountKey) {
      this.orchestrator?.dispose();
      this.orchestrator = nextFingerprint
        ? this.createOrchestrator(nextFingerprint, this.client)
        : undefined;
      this.orchestratorAccountKey = nextFingerprint;
    }

    this.previousLoggedIn = clientSnapshot.account.isLoggedIn;
    this.previousFingerprint = nextFingerprint;
    this.updatePreferenceSnapshot();

    if (becameConnected) {
      await this.triggerLifecycle('account-connected');
    }
  }

  private eligibleDomainIds(): SyncOrchestratorDomainId[] {
    const settings = this.settings;
    const clientSnapshot = this.client.getSnapshot();
    const currentFingerprint = accountFingerprint(clientSnapshot);
    const authorizedFingerprint =
      settings?.automaticAccountSyncAccountFingerprint?.toLowerCase();

    if (
      !settings?.automaticAccountSyncEnabled ||
      !clientSnapshot.account.isLoggedIn ||
      !currentFingerprint ||
      currentFingerprint !== authorizedFingerprint ||
      !this.isOnline() ||
      !this.connectionAllowed(settings)
    ) {
      return [];
    }

    return automaticDomainIds(settings);
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

  private async triggerLifecycle(source: SyncOrchestratorSource): Promise<void> {
    const domainIds = this.eligibleDomainIds();
    if (!this.orchestrator || domainIds.length === 0) return;

    this.updateSnapshot({
      lastTriggerSource: source,
      lastOperation: 'analyze',
      errorMessage: undefined,
    });

    try {
      const result = await this.orchestrator.schedule({
        operation: 'analyze',
        source,
        domainIds,
        delayMs: this.lifecycleDebounceMs,
      });
      this.updateSnapshot({
        lastCompletedAt: result.completedAt,
        ...(result.failedDomainIds.length > 0
          ? {
              errorMessage: `${result.failedDomainIds.length} rubrique(s) n’ont pas pu être analysées automatiquement.`,
            }
          : { errorMessage: undefined }),
      });
    } catch (error) {
      if (this.disposed) return;
      this.updateSnapshot({
        errorMessage:
          error instanceof Error
            ? error.message
            : 'L’analyse automatique a échoué.',
      });
    }
  }

  private async triggerLocalChange(
    requestedDomainIds: readonly SyncOrchestratorDomainId[],
  ): Promise<void> {
    const allowedDomainIds = this.eligibleDomainIds();
    if (!this.orchestrator || allowedDomainIds.length === 0) return;
    if (hasActiveDomainOperation(this.client.getSnapshot())) return;

    const domainIds = normalizeDomains(requestedDomainIds, allowedDomainIds);
    if (domainIds.length === 0) return;

    const clientSnapshot = this.client.getSnapshot();
    const hasCleanBaseline = domainIds.every(
      (domainId) =>
        readSyncOrchestratorPreview(clientSnapshot, domainId)
          ?.differingEntityCount === 0,
    );
    const operation = hasCleanBaseline ? 'sync' : 'analyze';

    this.updateSnapshot({
      lastTriggerSource: 'local-change',
      lastOperation: operation,
      errorMessage: undefined,
    });

    try {
      const result = await this.orchestrator.schedule({
        operation,
        source: 'local-change',
        domainIds,
        delayMs: this.localChangeDebounceMs,
      });
      this.updateSnapshot({
        lastCompletedAt: result.completedAt,
        ...(result.failedDomainIds.length > 0
          ? {
              errorMessage: `${result.failedDomainIds.length} rubrique(s) n’ont pas pu être traitées automatiquement.`,
            }
          : { errorMessage: undefined }),
      });
    } catch (error) {
      if (this.disposed) return;
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
