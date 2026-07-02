export type SyncOrchestratorDomainId =
  | 'account-preferences'
  | 'rewards-routines'
  | 'weights'
  | 'activities'
  | 'goals'
  | 'strength'
  | 'nutrition-journal'
  | 'nutrition-library'
  | 'nutrition-tracking';

export type SyncOrchestratorOperation = 'analyze' | 'sync';

export type SyncOrchestratorSource =
  | 'manual'
  | 'application-start'
  | 'foreground'
  | 'network-restored'
  | 'local-change'
  | 'account-connected'
  | 'cloud-restore';

export type SyncChangeOrigin = 'local' | 'cloud' | 'both' | 'unknown';

export type SyncOrchestratorDomainStatus =
  | 'idle'
  | 'queued'
  | 'analyzing'
  | 'up-to-date'
  | 'local-changes-pending'
  | 'cloud-changes-available'
  | 'action-required'
  | 'syncing'
  | 'temporary-failure'
  | 'offline';

export interface SyncOrchestratorPreview {
  readonly differingEntityCount: number;
  readonly changeOrigin?: SyncChangeOrigin;
}

export interface SyncOrchestratorDomainAdapter {
  readonly id: SyncOrchestratorDomainId;
  analyze(): Promise<SyncOrchestratorPreview>;
  synchronize(): Promise<unknown>;
  readPreview?(): SyncOrchestratorPreview | undefined;
}

export interface SyncOrchestratorDomainSnapshot {
  readonly status: SyncOrchestratorDomainStatus;
  readonly differingEntityCount?: number;
  readonly changeOrigin?: SyncChangeOrigin;
  readonly errorMessage?: string;
  readonly lastOperation?: SyncOrchestratorOperation;
  readonly lastSource?: SyncOrchestratorSource;
  readonly updatedAt?: string;
}

export interface SyncOrchestratorSnapshot {
  readonly accountKey: string;
  readonly isRunning: boolean;
  readonly queueLength: number;
  readonly currentOperation?: SyncOrchestratorOperation;
  readonly currentDomainId?: SyncOrchestratorDomainId;
  readonly lastOperation?: SyncOrchestratorOperation;
  readonly lastSource?: SyncOrchestratorSource;
  readonly lastCompletedAt?: string;
  readonly domains: Readonly<
    Record<SyncOrchestratorDomainId, SyncOrchestratorDomainSnapshot>
  >;
}

export interface SyncOrchestratorRequest {
  readonly operation: SyncOrchestratorOperation;
  readonly domainIds?: readonly SyncOrchestratorDomainId[];
  readonly source?: SyncOrchestratorSource;
}

export interface SyncOrchestratorScheduleRequest
  extends SyncOrchestratorRequest {
  readonly delayMs?: number;
}

export interface SyncOrchestratorDomainResult {
  readonly domainId: SyncOrchestratorDomainId;
  readonly status: SyncOrchestratorDomainStatus;
  readonly differingEntityCount?: number;
  readonly changeOrigin?: SyncChangeOrigin;
  readonly errorMessage?: string;
}

export interface SyncOrchestratorRunResult {
  readonly operation: SyncOrchestratorOperation;
  readonly source: SyncOrchestratorSource;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly completedDomainIds: readonly SyncOrchestratorDomainId[];
  readonly failedDomainIds: readonly SyncOrchestratorDomainId[];
  readonly domainResults: readonly SyncOrchestratorDomainResult[];
}

export interface SyncOrchestrator {
  getSnapshot(): SyncOrchestratorSnapshot;
  subscribe(listener: () => void): () => void;
  run(request: SyncOrchestratorRequest): Promise<SyncOrchestratorRunResult>;
  schedule(
    request: SyncOrchestratorScheduleRequest,
  ): Promise<SyncOrchestratorRunResult>;
  retryFailures(): Promise<SyncOrchestratorRunResult | undefined>;
  cancelScheduled(): void;
  dispose(): void;
}

interface SyncOrchestratorOptions {
  readonly accountKey: string;
  readonly domains: readonly SyncOrchestratorDomainAdapter[];
  readonly isOnline?: () => boolean;
  readonly now?: () => Date;
  readonly defaultDebounceMs?: number;
  readonly setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  readonly clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

interface QueuedRequest {
  readonly operation: SyncOrchestratorOperation;
  readonly source: SyncOrchestratorSource;
  readonly domainIds: readonly SyncOrchestratorDomainId[];
  readonly resolve: (result: SyncOrchestratorRunResult) => void;
  readonly reject: (error: unknown) => void;
}

interface ScheduledRequest {
  operation: SyncOrchestratorOperation;
  source: SyncOrchestratorSource;
  domainIds: Set<SyncOrchestratorDomainId>;
  timer: ReturnType<typeof setTimeout>;
  waiters: Array<{
    readonly resolve: (result: SyncOrchestratorRunResult) => void;
    readonly reject: (error: unknown) => void;
  }>;
}

const accountExecutionChains = new Map<string, Promise<void>>();

function normalizeAccountKey(accountKey: string): string {
  const normalized = accountKey.trim().toLowerCase();
  if (!normalized) {
    throw new Error('Un identifiant de compte est requis pour orchestrer la synchronisation.');
  }
  return normalized;
}

function initialDomainSnapshots(): Record<
  SyncOrchestratorDomainId,
  SyncOrchestratorDomainSnapshot
> {
  return {
    'account-preferences': { status: 'idle' },
    'rewards-routines': { status: 'idle' },
    weights: { status: 'idle' },
    activities: { status: 'idle' },
    goals: { status: 'idle' },
    strength: { status: 'idle' },
    'nutrition-journal': { status: 'idle' },
    'nutrition-library': { status: 'idle' },
    'nutrition-tracking': { status: 'idle' },
  };
}

function uniqueDomainIds(
  values: readonly SyncOrchestratorDomainId[],
): SyncOrchestratorDomainId[] {
  return [...new Set(values)];
}

function classifyPreview(
  preview: SyncOrchestratorPreview,
): SyncOrchestratorDomainStatus {
  if (preview.differingEntityCount <= 0) return 'up-to-date';
  switch (preview.changeOrigin ?? 'unknown') {
    case 'local':
      return 'local-changes-pending';
    case 'cloud':
      return 'cloud-changes-available';
    case 'both':
    case 'unknown':
      return 'action-required';
  }
}

async function withAccountLock<T>(
  accountKey: string,
  callback: () => Promise<T>,
): Promise<T> {
  const previous = accountExecutionChains.get(accountKey) ?? Promise.resolve();
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chain = previous.catch(() => undefined).then(() => gate);
  accountExecutionChains.set(accountKey, chain);

  await previous.catch(() => undefined);
  try {
    return await callback();
  } finally {
    release?.();
    if (accountExecutionChains.get(accountKey) === chain) {
      accountExecutionChains.delete(accountKey);
    }
  }
}

function emptyRunResult(
  operation: SyncOrchestratorOperation,
  source: SyncOrchestratorSource,
  timestamp: string,
): SyncOrchestratorRunResult {
  return {
    operation,
    source,
    startedAt: timestamp,
    completedAt: timestamp,
    completedDomainIds: [],
    failedDomainIds: [],
    domainResults: [],
  };
}

export function createSyncOrchestrator(
  options: SyncOrchestratorOptions,
): SyncOrchestrator {
  const accountKey = normalizeAccountKey(options.accountKey);
  const adapters = new Map(
    options.domains.map((domain) => [domain.id, domain] as const),
  );
  const allDomainIds = [...adapters.keys()];
  const listeners = new Set<() => void>();
  const queue: QueuedRequest[] = [];
  const scheduled = new Map<string, ScheduledRequest>();
  const isOnline = options.isOnline ?? (() => navigator.onLine !== false);
  const now = options.now ?? (() => new Date());
  const defaultDebounceMs = options.defaultDebounceMs ?? 750;
  const setTimer = options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer));
  let disposed = false;
  let draining = false;
  let lastFailedRequest:
    | {
        readonly operation: SyncOrchestratorOperation;
        readonly source: SyncOrchestratorSource;
        readonly domainIds: readonly SyncOrchestratorDomainId[];
      }
    | undefined;
  let snapshot: SyncOrchestratorSnapshot = {
    accountKey,
    isRunning: false,
    queueLength: 0,
    domains: initialDomainSnapshots(),
  };

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const updateSnapshot = (
    updater: (current: SyncOrchestratorSnapshot) => SyncOrchestratorSnapshot,
  ) => {
    snapshot = updater(snapshot);
    notify();
  };

  const updateDomain = (
    domainId: SyncOrchestratorDomainId,
    next: SyncOrchestratorDomainSnapshot,
  ) => {
    updateSnapshot((current) => ({
      ...current,
      domains: {
        ...current.domains,
        [domainId]: next,
      },
    }));
  };

  const requestDomainIds = (
    requested: readonly SyncOrchestratorDomainId[] | undefined,
  ): SyncOrchestratorDomainId[] => {
    const values = requested ? uniqueDomainIds(requested) : allDomainIds;
    return values.filter((domainId) => adapters.has(domainId));
  };

  const executeRequest = async (
    request: QueuedRequest,
  ): Promise<SyncOrchestratorRunResult> => withAccountLock(
    accountKey,
    async () => {
      const startedAt = now().toISOString();
      if (request.domainIds.length === 0) {
        return emptyRunResult(request.operation, request.source, startedAt);
      }

      if (!isOnline()) {
        for (const domainId of request.domainIds) {
          updateDomain(domainId, {
            status: 'offline',
            errorMessage: 'La synchronisation cloud est indisponible hors connexion.',
            lastOperation: request.operation,
            lastSource: request.source,
            updatedAt: startedAt,
          });
        }
        const result: SyncOrchestratorRunResult = {
          operation: request.operation,
          source: request.source,
          startedAt,
          completedAt: startedAt,
          completedDomainIds: [],
          failedDomainIds: [...request.domainIds],
          domainResults: request.domainIds.map((domainId) => ({
            domainId,
            status: 'offline',
            errorMessage: 'La synchronisation cloud est indisponible hors connexion.',
          })),
        };
        lastFailedRequest = {
          operation: request.operation,
          source: request.source,
          domainIds: [...request.domainIds],
        };
        return result;
      }

      updateSnapshot((current) => ({
        ...current,
        isRunning: true,
        currentOperation: request.operation,
        lastOperation: request.operation,
        lastSource: request.source,
      }));

      const completedDomainIds: SyncOrchestratorDomainId[] = [];
      const failedDomainIds: SyncOrchestratorDomainId[] = [];
      const domainResults: SyncOrchestratorDomainResult[] = [];

      for (const domainId of request.domainIds) {
        const adapter = adapters.get(domainId);
        if (!adapter) continue;

        const operationStatus = request.operation === 'analyze' ? 'analyzing' : 'syncing';
        const operationStartedAt = now().toISOString();
        updateSnapshot((current) => ({
          ...current,
          currentDomainId: domainId,
          domains: {
            ...current.domains,
            [domainId]: {
              ...current.domains[domainId],
              status: operationStatus,
              errorMessage: undefined,
              lastOperation: request.operation,
              lastSource: request.source,
              updatedAt: operationStartedAt,
            },
          },
        }));

        try {
          const preview = request.operation === 'analyze'
            ? await adapter.analyze()
            : (await adapter.synchronize(), adapter.readPreview?.());
          const effectivePreview = preview ?? adapter.readPreview?.() ?? {
            differingEntityCount: 0,
            changeOrigin: 'unknown' as const,
          };
          const status = classifyPreview(effectivePreview);
          const updatedAt = now().toISOString();
          updateDomain(domainId, {
            status,
            differingEntityCount: effectivePreview.differingEntityCount,
            changeOrigin: effectivePreview.changeOrigin ?? 'unknown',
            lastOperation: request.operation,
            lastSource: request.source,
            updatedAt,
          });
          completedDomainIds.push(domainId);
          domainResults.push({
            domainId,
            status,
            differingEntityCount: effectivePreview.differingEntityCount,
            changeOrigin: effectivePreview.changeOrigin ?? 'unknown',
          });
        } catch (error) {
          const errorMessage = error instanceof Error
            ? error.message
            : `${request.operation === 'analyze' ? 'L’analyse' : 'La synchronisation'} a échoué.`;
          const updatedAt = now().toISOString();
          updateDomain(domainId, {
            status: 'temporary-failure',
            errorMessage,
            lastOperation: request.operation,
            lastSource: request.source,
            updatedAt,
          });
          failedDomainIds.push(domainId);
          domainResults.push({
            domainId,
            status: 'temporary-failure',
            errorMessage,
          });
        }
      }

      const completedAt = now().toISOString();
      updateSnapshot((current) => {
        const {
          currentOperation: _currentOperation,
          currentDomainId: _currentDomainId,
          ...rest
        } = current;
        return {
          ...rest,
          isRunning: false,
          lastCompletedAt: completedAt,
        };
      });

      lastFailedRequest = failedDomainIds.length > 0
        ? {
            operation: request.operation,
            source: request.source,
            domainIds: [...failedDomainIds],
          }
        : undefined;

      return {
        operation: request.operation,
        source: request.source,
        startedAt,
        completedAt,
        completedDomainIds,
        failedDomainIds,
        domainResults,
      };
    },
  );

  const drainQueue = async () => {
    if (draining || disposed) return;
    draining = true;
    try {
      while (queue.length > 0 && !disposed) {
        const request = queue.shift();
        updateSnapshot((current) => ({
          ...current,
          queueLength: queue.length,
        }));
        if (!request) continue;
        try {
          request.resolve(await executeRequest(request));
        } catch (error) {
          request.reject(error);
        }
      }
    } finally {
      draining = false;
      updateSnapshot((current) => {
        const {
          currentOperation: _currentOperation,
          currentDomainId: _currentDomainId,
          ...rest
        } = current;
        return {
          ...rest,
          isRunning: false,
          queueLength: queue.length,
        };
      });
    }
  };

  const enqueue = (
    request: SyncOrchestratorRequest,
  ): Promise<SyncOrchestratorRunResult> => {
    if (disposed) {
      return Promise.reject(new Error('L’orchestrateur de synchronisation est arrêté.'));
    }

    const source = request.source ?? 'manual';
    const domainIds = requestDomainIds(request.domainIds);
    for (const domainId of domainIds) {
      const current = snapshot.domains[domainId];
      if (current.status === 'analyzing' || current.status === 'syncing') continue;
      updateDomain(domainId, {
        ...current,
        status: 'queued',
        lastOperation: request.operation,
        lastSource: source,
      });
    }

    const promise = new Promise<SyncOrchestratorRunResult>((resolve, reject) => {
      queue.push({
        operation: request.operation,
        source,
        domainIds,
        resolve,
        reject,
      });
    });
    updateSnapshot((current) => ({
      ...current,
      queueLength: queue.length,
    }));
    void drainQueue();
    return promise;
  };

  const schedule = (
    request: SyncOrchestratorScheduleRequest,
  ): Promise<SyncOrchestratorRunResult> => {
    if (disposed) {
      return Promise.reject(new Error('L’orchestrateur de synchronisation est arrêté.'));
    }
    const source = request.source ?? 'local-change';
    const key = `${request.operation}:${source}`;
    const domainIds = requestDomainIds(request.domainIds);
    const delayMs = request.delayMs ?? defaultDebounceMs;

    return new Promise<SyncOrchestratorRunResult>((resolve, reject) => {
      const existing = scheduled.get(key);
      if (existing) {
        clearTimer(existing.timer);
        for (const domainId of domainIds) existing.domainIds.add(domainId);
        existing.waiters.push({ resolve, reject });
        existing.timer = setTimer(() => {
          scheduled.delete(key);
          void enqueue({
            operation: existing.operation,
            source: existing.source,
            domainIds: [...existing.domainIds],
          }).then(
            (result) => existing.waiters.forEach((waiter) => waiter.resolve(result)),
            (error) => existing.waiters.forEach((waiter) => waiter.reject(error)),
          );
        }, delayMs);
        return;
      }

      const scheduledRequest: ScheduledRequest = {
        operation: request.operation,
        source,
        domainIds: new Set(domainIds),
        timer: undefined as unknown as ReturnType<typeof setTimeout>,
        waiters: [{ resolve, reject }],
      };
      scheduledRequest.timer = setTimer(() => {
        scheduled.delete(key);
        void enqueue({
          operation: scheduledRequest.operation,
          source: scheduledRequest.source,
          domainIds: [...scheduledRequest.domainIds],
        }).then(
          (result) => scheduledRequest.waiters.forEach((waiter) => waiter.resolve(result)),
          (error) => scheduledRequest.waiters.forEach((waiter) => waiter.reject(error)),
        );
      }, delayMs);
      scheduled.set(key, scheduledRequest);
    });
  };

  const cancelScheduled = () => {
    for (const request of scheduled.values()) {
      clearTimer(request.timer);
      const error = new Error('La demande de synchronisation différée a été annulée.');
      for (const waiter of request.waiters) waiter.reject(error);
    }
    scheduled.clear();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    run: enqueue,
    schedule,
    retryFailures: async () => {
      if (!lastFailedRequest) return undefined;
      return enqueue({
        ...lastFailedRequest,
        source: 'manual',
      });
    },
    cancelScheduled,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      cancelScheduled();
      const error = new Error('L’orchestrateur de synchronisation est arrêté.');
      while (queue.length > 0) queue.shift()?.reject(error);
      listeners.clear();
    },
  };
}
