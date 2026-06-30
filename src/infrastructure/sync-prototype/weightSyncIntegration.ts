import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { readSyncPrototypeConfig } from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import {
  AUTOMATIC_WEIGHT_SYNC_PREFERENCE_CHANGED_EVENT,
  REAL_WEIGHT_DATA_CHANGED_EVENT,
} from '@/infrastructure/sync-prototype/weightSyncEvents';

export type WeightSyncIntegrationStatus =
  | 'unavailable'
  | 'disabled'
  | 'disconnected'
  | 'idle'
  | 'syncing'
  | 'in-sync'
  | 'offline'
  | 'error';

export interface WeightSyncIntegrationSnapshot {
  readonly available: boolean;
  readonly enabled: boolean;
  readonly accountConnected: boolean;
  readonly online: boolean;
  readonly status: WeightSyncIntegrationStatus;
  readonly lastSyncAt?: string;
  readonly errorMessage?: string;
}


type WeightSyncIntegrationChanges = Partial<
  Omit<WeightSyncIntegrationSnapshot, 'lastSyncAt' | 'errorMessage'>
> & {
  readonly lastSyncAt?: string | undefined;
  readonly errorMessage?: string | undefined;
};

export interface WeightSyncIntegrationOptions {
  readonly client?: SyncPrototypeClient;
  readonly settingsRepository: SettingsRepository;
  readonly eventTarget?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  readonly isOnline?: () => boolean;
  readonly now?: () => Date;
  readonly setTimer?: typeof globalThis.setTimeout;
  readonly clearTimer?: typeof globalThis.clearTimeout;
  readonly debounceMs?: number;
  readonly minimumIntervalMs?: number;
  readonly timeoutMs?: number;
  readonly clientErrorGraceMs?: number;
  readonly postSuccessErrorGraceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 750;
const DEFAULT_MINIMUM_INTERVAL_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_CLIENT_ERROR_GRACE_MS = 1_000;
const DEFAULT_POST_SUCCESS_ERROR_GRACE_MS = 10_000;

function messageFromError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'La synchronisation des pesées a échoué.';
}

function isConnectivityError(message: string | undefined): boolean {
  if (!message) return false;

  return /(network|offline|websocket|failed to fetch|fetch failed|load failed|connexion|internet)/i.test(
    message,
  );
}

export class WeightSyncIntegrationController {
  private snapshot: WeightSyncIntegrationSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly client: SyncPrototypeClient | undefined;
  private readonly settingsRepository: SettingsRepository;
  private readonly eventTarget: WeightSyncIntegrationOptions['eventTarget'] | undefined;
  private readonly isOnline: () => boolean;
  private readonly now: () => Date;
  private readonly setTimer: typeof globalThis.setTimeout;
  private readonly clearTimer: typeof globalThis.clearTimeout;
  private readonly debounceMs: number;
  private readonly minimumIntervalMs: number;
  private readonly timeoutMs: number;
  private readonly clientErrorGraceMs: number;
  private readonly postSuccessErrorGraceMs: number;
  private initializationPromise: Promise<void> | undefined;
  private unsubscribeClient: (() => void) | undefined;
  private scheduledTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  private clientErrorTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  private activeOperation: Promise<unknown> | undefined;
  private activeCaller: Promise<void> | undefined;
  private lastAttemptAt = 0;
  private pendingAfterCurrent = false;
  private preferenceWriteInProgress = false;
  private suppressClientErrorsUntil = 0;

  private readonly handleOnline = () => {
    this.updateConnectivity(true);
    this.schedule({ restartDebounce: true, bypassMinimumInterval: true });
  };

  private readonly handleOffline = () => {
    this.cancelScheduled();
    this.updateSnapshot({
      online: false,
      status: 'offline',
      errorMessage: undefined,
    });
  };

  private readonly handleWeightChange = () => {
    this.schedule({ restartDebounce: true });
  };

  private readonly handlePreferenceChange = (event: Event) => {
    if (this.preferenceWriteInProgress) return;

    const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
    if (typeof detail?.enabled !== 'boolean') return;
    this.applyEnabledState(detail.enabled);
  };

  constructor(options: WeightSyncIntegrationOptions) {
    this.client = options.client;
    this.settingsRepository = options.settingsRepository;
    this.eventTarget = options.eventTarget;
    this.isOnline = options.isOnline ?? (() => navigator.onLine);
    this.now = options.now ?? (() => new Date());
    const setTimer = options.setTimer ?? globalThis.setTimeout;
    const clearTimer = options.clearTimer ?? globalThis.clearTimeout;
    this.setTimer = setTimer.bind(globalThis);
    this.clearTimer = clearTimer.bind(globalThis);
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.minimumIntervalMs =
      options.minimumIntervalMs ?? DEFAULT_MINIMUM_INTERVAL_MS;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.clientErrorGraceMs =
      options.clientErrorGraceMs ?? DEFAULT_CLIENT_ERROR_GRACE_MS;
    this.postSuccessErrorGraceMs =
      options.postSuccessErrorGraceMs ?? DEFAULT_POST_SUCCESS_ERROR_GRACE_MS;

    const online = this.isOnline();
    this.snapshot = {
      available: Boolean(this.client),
      enabled: false,
      accountConnected: false,
      online,
      status: this.client ? 'disabled' : 'unavailable',
    };
  }

  getSnapshot = (): WeightSyncIntegrationSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  initialize(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.initializeInternal().catch((error) => {
      this.initializationPromise = undefined;
      this.updateSnapshot({
        status: 'error',
        errorMessage: messageFromError(error),
      });
      throw error;
    });

    return this.initializationPromise;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (!this.client && enabled) {
      throw new Error(
        'La synchronisation des pesées n’est pas disponible dans cette version.',
      );
    }

    this.preferenceWriteInProgress = true;
    try {
      let updateError: unknown;

      try {
        await this.settingsRepository.update({
          automaticWeightSyncEnabled: enabled,
        });
      } catch (error) {
        updateError = error;
      }

      // L'activation est un réglage strictement local. Dexie Cloud peut
      // changer d'état entre le rendu et le clic (restauration de session,
      // connexion WebSocket, synchronisation initiale) sans invalider cette
      // préférence. On vérifie donc uniquement la valeur réellement stockée.
      const persisted = await this.settingsRepository.get();
      if (persisted.automaticWeightSyncEnabled !== enabled) {
        if (updateError) throw updateError;
        throw new Error('Le réglage de synchronisation n’a pas été enregistré.');
      }
    } finally {
      this.preferenceWriteInProgress = false;
    }

    this.applyEnabledState(enabled);

    if (enabled) {
      void this.initialize()
        .then(() => {
          if (!this.client) return;
          this.updateFromClient(this.client.getSnapshot());
        })
        .catch((error) => {
          this.updateSnapshot({
            status: 'error',
            errorMessage: messageFromError(error),
          });
        });
    }
  }

  async syncNow(): Promise<void> {
    await this.initialize();

    if (!this.client || !this.snapshot.available) {
      throw new Error('La synchronisation des pesées est indisponible.');
    }
    if (!this.snapshot.enabled) {
      throw new Error('Active d’abord la synchronisation des pesées.');
    }
    if (!this.isOnline()) {
      this.updateSnapshot({ online: false, status: 'offline' });
      throw new Error('Aucune connexion réseau n’est disponible.');
    }

    await this.waitForClientReady();

    if (!this.client.getSnapshot().account.isLoggedIn) {
      this.updateFromClient(this.client.getSnapshot());
      throw new Error('Connecte ton compte de synchronisation.');
    }
    if (this.activeOperation) {
      if (this.activeCaller) return this.activeCaller;
      throw new Error('Une synchronisation est déjà en cours.');
    }

    this.cancelScheduled();
    this.lastAttemptAt = this.now().getTime();
    this.updateSnapshot({
      online: true,
      status: 'syncing',
      errorMessage: undefined,
    });

    const operation = this.client.syncRealWeights();
    this.activeOperation = operation;

    let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | undefined;
    let callerSettled = false;

    const caller = new Promise<void>((resolve, reject) => {
      timeoutHandle = this.setTimer(() => {
        if (callerSettled) return;
        callerSettled = true;
        this.activeCaller = undefined;
        const error = new Error(
          'La synchronisation prend trop de temps. Vérifie la connexion puis réessaie.',
        );
        this.updateSnapshot({ status: 'error', errorMessage: error.message });
        reject(error);
      }, this.timeoutMs);

      operation
        .then((result) => {
          if (timeoutHandle) this.clearTimer(timeoutHandle);
          const completedAt = result.completedAt || this.now().toISOString();
          this.suppressClientErrorsUntil =
            this.now().getTime() + this.postSuccessErrorGraceMs;
          this.cancelPendingClientError();
          this.updateSnapshot({
            status: !this.snapshot.enabled
              ? 'disabled'
              : !this.isOnline()
                ? 'offline'
                : 'in-sync',
            lastSyncAt: completedAt,
            errorMessage: undefined,
          });
          if (!callerSettled) {
            callerSettled = true;
            resolve();
          }
        })
        .catch((error: unknown) => {
          if (timeoutHandle) this.clearTimer(timeoutHandle);
          const errorMessage = messageFromError(error);
          const cloudSnapshot = this.client!.getSnapshot();
          const connectivityFailure =
            !this.isOnline() ||
            cloudSnapshot.sync.status === 'offline' ||
            cloudSnapshot.sync.phase === 'offline' ||
            isConnectivityError(errorMessage);
          this.updateSnapshot(
            !this.snapshot.enabled
              ? { status: 'disabled', errorMessage: undefined }
              : connectivityFailure
                ? { status: 'offline', errorMessage: undefined }
                : { status: 'error', errorMessage },
          );
          if (!callerSettled) {
            callerSettled = true;
            reject(error);
          }
        })
        .finally(() => {
          this.activeOperation = undefined;
          this.activeCaller = undefined;
          if (this.pendingAfterCurrent) {
            this.pendingAfterCurrent = false;
            this.schedule();
          }
        });
    });

    this.activeCaller = caller;
    return caller;
  }

  private async waitForClientReady(): Promise<void> {
    if (!this.client) return;

    const isPending = (snapshot: SyncPrototypeSnapshot): boolean =>
      snapshot.account.isLoading ||
      snapshot.sync.status === 'connecting' ||
      snapshot.sync.phase === 'initial' ||
      snapshot.sync.phase === 'pushing' ||
      snapshot.sync.phase === 'pulling';

    const current = this.client.getSnapshot();
    if (!isPending(current)) return;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | undefined;
      let unsubscribe: () => void = () => undefined;

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        unsubscribe();
        if (timeoutHandle) this.clearTimer(timeoutHandle);
        if (error) reject(error);
        else resolve();
      };

      const inspect = () => {
        const snapshot = this.client!.getSnapshot();
        if (snapshot.sync.status === 'error' || snapshot.sync.phase === 'error') {
          finish(
            new Error(
              snapshot.sync.errorMessage ??
                'Dexie Cloud n’a pas pu préparer la synchronisation.',
            ),
          );
          return;
        }
        if (!isPending(snapshot)) finish();
      };

      unsubscribe = this.client!.subscribe(inspect);
      timeoutHandle = this.setTimer(() => {
        finish(
          new Error(
            'Dexie Cloud prépare encore la session. Réessaie dans quelques secondes.',
          ),
        );
      }, this.timeoutMs);

      inspect();
    });
  }

  private async initializeInternal(): Promise<void> {
    const online = this.isOnline();
    this.updateSnapshot({ online });

    if (!this.client) {
      this.updateSnapshot({
        available: false,
        enabled: false,
        status: 'unavailable',
      });
      return;
    }

    await this.client.initialize();
    const settings = await this.settingsRepository.get();

    this.unsubscribeClient = this.client.subscribe(() => {
      this.updateFromClient(this.client!.getSnapshot());
    });
    this.eventTarget?.addEventListener('online', this.handleOnline);
    this.eventTarget?.addEventListener('offline', this.handleOffline);
    this.eventTarget?.addEventListener(
      REAL_WEIGHT_DATA_CHANGED_EVENT,
      this.handleWeightChange,
    );
    this.eventTarget?.addEventListener(
      AUTOMATIC_WEIGHT_SYNC_PREFERENCE_CHANGED_EVENT,
      this.handlePreferenceChange,
    );

    this.updateFromClient(this.client.getSnapshot());
    this.applyEnabledState(settings.automaticWeightSyncEnabled);
  }

  private applyEnabledState(enabled: boolean): void {
    if (!this.client) {
      this.updateSnapshot({ enabled: false, status: 'unavailable' });
      return;
    }

    if (!enabled) {
      this.cancelScheduled();
      this.pendingAfterCurrent = false;
      this.updateSnapshot({
        enabled: false,
        status: 'disabled',
        errorMessage: undefined,
      });
      return;
    }

    this.updateSnapshot({ enabled: true, errorMessage: undefined });
    this.updateFromClient(this.client.getSnapshot());
  }

  private updateFromClient(clientSnapshot: SyncPrototypeSnapshot): void {
    const previousStatus = this.snapshot.status;
    const accountConnected = clientSnapshot.account.isLoggedIn;
    const online = this.isOnline();
    const cloudOffline =
      clientSnapshot.sync.status === 'offline' ||
      clientSnapshot.sync.phase === 'offline' ||
      ((clientSnapshot.sync.status === 'error' ||
        clientSnapshot.sync.phase === 'error') &&
        isConnectivityError(clientSnapshot.sync.errorMessage));

    if (!this.snapshot.enabled) {
      this.cancelPendingClientError();
      this.updateSnapshot({
        accountConnected,
        online,
        status: 'disabled',
        errorMessage: undefined,
      });
      return;
    }
    if (!online || cloudOffline) {
      this.cancelScheduled();
      this.cancelPendingClientError();
      this.updateSnapshot({
        accountConnected,
        online,
        status: 'offline',
        errorMessage: undefined,
      });
      return;
    }
    if (!accountConnected) {
      this.cancelScheduled();
      this.cancelPendingClientError();
      this.updateSnapshot({
        accountConnected,
        online,
        status: 'disconnected',
        errorMessage: undefined,
      });
      return;
    }
    if (this.activeOperation) {
      this.cancelPendingClientError();
      this.updateSnapshot({
        accountConnected,
        online,
        status: 'syncing',
        errorMessage: undefined,
      });
      return;
    }

    const cloudError =
      clientSnapshot.sync.status === 'error' ||
      clientSnapshot.sync.phase === 'error';

    if (cloudError) {
      this.deferClientError(
        clientSnapshot.sync.errorMessage ??
          'Dexie Cloud signale une erreur de synchronisation.',
      );
      this.updateSnapshot({
        accountConnected,
        online,
        status: this.snapshot.lastSyncAt ? 'in-sync' : 'idle',
        errorMessage: undefined,
      });
      return;
    }

    this.cancelPendingClientError();
    const status = this.snapshot.lastSyncAt ? 'in-sync' : 'idle';
    const recovered =
      previousStatus === 'offline' ||
      previousStatus === 'error' ||
      previousStatus === 'disconnected';

    this.updateSnapshot({
      accountConnected,
      online,
      status,
      errorMessage: undefined,
    });

    this.schedule({ bypassMinimumInterval: recovered });
  }

  private deferClientError(message: string): void {
    if (this.clientErrorTimer) return;

    const remainingPostSuccessGrace = Math.max(
      0,
      this.suppressClientErrorsUntil - this.now().getTime(),
    );
    const delay = Math.max(
      this.clientErrorGraceMs,
      remainingPostSuccessGrace,
    );

    this.clientErrorTimer = this.setTimer(() => {
      this.clientErrorTimer = undefined;
      if (!this.client || !this.snapshot.enabled || !this.isOnline()) return;

      const clientSnapshot = this.client.getSnapshot();
      const stillInError =
        clientSnapshot.sync.status === 'error' ||
        clientSnapshot.sync.phase === 'error';
      const connectivityFailure =
        clientSnapshot.sync.status === 'offline' ||
        clientSnapshot.sync.phase === 'offline' ||
        isConnectivityError(clientSnapshot.sync.errorMessage);

      if (!stillInError || connectivityFailure) return;

      this.updateSnapshot({
        accountConnected: clientSnapshot.account.isLoggedIn,
        online: true,
        status: 'error',
        errorMessage: clientSnapshot.sync.errorMessage ?? message,
      });
    }, delay);
  }

  private cancelPendingClientError(): void {
    if (!this.clientErrorTimer) return;
    this.clearTimer(this.clientErrorTimer);
    this.clientErrorTimer = undefined;
  }

  private updateConnectivity(online: boolean): void {
    if (!this.snapshot.enabled) {
      this.updateSnapshot({ online, status: 'disabled' });
      return;
    }
    this.updateSnapshot({
      online,
      status: online ? 'idle' : 'offline',
      errorMessage: undefined,
    });
  }

  private schedule(
    options: {
      readonly restartDebounce?: boolean;
      readonly bypassMinimumInterval?: boolean;
    } = {},
  ): void {
    if (
      !this.client ||
      !this.snapshot.enabled ||
      !this.snapshot.accountConnected ||
      !this.isOnline()
    ) {
      return;
    }

    if (this.activeOperation) {
      this.pendingAfterCurrent = true;
      return;
    }

    if (this.scheduledTimer) {
      if (!options.restartDebounce && !options.bypassMinimumInterval) return;
      this.cancelScheduled();
    }

    if (options.bypassMinimumInterval) this.lastAttemptAt = 0;

    const elapsed = this.now().getTime() - this.lastAttemptAt;
    const minimumDelay = options.bypassMinimumInterval
      ? 0
      : Math.max(0, this.minimumIntervalMs - elapsed);
    const delay = Math.max(this.debounceMs, minimumDelay);
    this.scheduledTimer = this.setTimer(() => {
      this.scheduledTimer = undefined;
      void this.syncNow().catch(() => undefined);
    }, delay);
  }

  private cancelScheduled(): void {
    if (!this.scheduledTimer) return;
    this.clearTimer(this.scheduledTimer);
    this.scheduledTimer = undefined;
  }

  private updateSnapshot(
    changes: WeightSyncIntegrationChanges,
  ): void {
    const lastSyncAt =
      'lastSyncAt' in changes
        ? changes.lastSyncAt
        : this.snapshot.lastSyncAt;
    const errorMessage =
      'errorMessage' in changes
        ? changes.errorMessage
        : this.snapshot.errorMessage;

    this.snapshot = {
      available: changes.available ?? this.snapshot.available,
      enabled: changes.enabled ?? this.snapshot.enabled,
      accountConnected:
        changes.accountConnected ?? this.snapshot.accountConnected,
      online: changes.online ?? this.snapshot.online,
      status: changes.status ?? this.snapshot.status,
      ...(lastSyncAt === undefined ? {} : { lastSyncAt }),
      ...(errorMessage === undefined ? {} : { errorMessage }),
    };
    for (const listener of this.listeners) listener();
  }

  dispose(): void {
    this.cancelScheduled();
    this.cancelPendingClientError();
    this.unsubscribeClient?.();
    this.unsubscribeClient = undefined;
    this.eventTarget?.removeEventListener('online', this.handleOnline);
    this.eventTarget?.removeEventListener('offline', this.handleOffline);
    this.eventTarget?.removeEventListener(
      REAL_WEIGHT_DATA_CHANGED_EVENT,
      this.handleWeightChange,
    );
    this.eventTarget?.removeEventListener(
      AUTOMATIC_WEIGHT_SYNC_PREFERENCE_CHANGED_EVENT,
      this.handlePreferenceChange,
    );
  }
}

let singleton: WeightSyncIntegrationController | undefined;

export function getWeightSyncIntegration(): WeightSyncIntegrationController {
  if (singleton) return singleton;

  const config = readSyncPrototypeConfig();
  const available = config.enabled && config.realWeightSyncEnabled;
  singleton = new WeightSyncIntegrationController({
    ...(available ? { client: getSyncPrototypeClient() } : {}),
    settingsRepository: repositories.settings,
    ...(typeof window === 'undefined' ? {} : { eventTarget: window }),
  });
  return singleton;
}
