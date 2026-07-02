import {
  createSyncOrchestrator,
  type SyncOrchestratorDomainAdapter,
  type SyncOrchestratorDomainId,
} from '@/application/sync/syncOrchestrator';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function adapter(
  id: SyncOrchestratorDomainId,
  overrides: Partial<SyncOrchestratorDomainAdapter> = {},
): SyncOrchestratorDomainAdapter {
  return {
    id,
    analyze: vi.fn(async () => ({ differingEntityCount: 0 })),
    synchronize: vi.fn(async () => undefined),
    readPreview: vi.fn(() => ({ differingEntityCount: 0 })),
    ...overrides,
  };
}

describe('syncOrchestrator', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('analyse les domaines séquentiellement sans déclencher d’écriture', async () => {
    const order: string[] = [];
    let concurrent = 0;
    let maximumConcurrent = 0;
    const createAnalyze = (id: string) => vi.fn(async () => {
      concurrent += 1;
      maximumConcurrent = Math.max(maximumConcurrent, concurrent);
      order.push(`start:${id}`);
      await Promise.resolve();
      order.push(`end:${id}`);
      concurrent -= 1;
      return { differingEntityCount: 0 };
    });
    const weights = adapter('weights', { analyze: createAnalyze('weights') });
    const activities = adapter('activities', { analyze: createAnalyze('activities') });
    const orchestrator = createSyncOrchestrator({
      accountKey: 'User-F1',
      domains: [weights, activities],
    });

    const result = await orchestrator.run({
      operation: 'analyze',
      source: 'manual',
    });

    expect(order).toEqual([
      'start:weights',
      'end:weights',
      'start:activities',
      'end:activities',
    ]);
    expect(maximumConcurrent).toBe(1);
    expect(weights.synchronize).not.toHaveBeenCalled();
    expect(activities.synchronize).not.toHaveBeenCalled();
    expect(result.completedDomainIds).toEqual(['weights', 'activities']);
    expect(orchestrator.getSnapshot().domains.weights.status).toBe('up-to-date');
  });

  it('verrouille deux orchestrateurs partageant le même compte', async () => {
    const firstGate = deferred<void>();
    const order: string[] = [];
    const first = createSyncOrchestrator({
      accountKey: 'shared-account',
      domains: [adapter('weights', {
        analyze: vi.fn(async () => {
          order.push('first:start');
          await firstGate.promise;
          order.push('first:end');
          return { differingEntityCount: 0 };
        }),
      })],
    });
    const second = createSyncOrchestrator({
      accountKey: 'SHARED-ACCOUNT',
      domains: [adapter('activities', {
        analyze: vi.fn(async () => {
          order.push('second:start');
          return { differingEntityCount: 0 };
        }),
      })],
    });

    const firstRun = first.run({ operation: 'analyze' });
    await vi.waitFor(() => expect(order).toEqual(['first:start']));
    const secondRun = second.run({ operation: 'analyze' });
    await Promise.resolve();
    expect(order).toEqual(['first:start']);

    firstGate.resolve();
    await Promise.all([firstRun, secondRun]);
    expect(order).toEqual(['first:start', 'first:end', 'second:start']);
  });

  it('classe les différences selon leur origine disponible', async () => {
    const orchestrator = createSyncOrchestrator({
      accountKey: 'origins',
      domains: [
        adapter('weights', {
          analyze: vi.fn(async () => ({
            differingEntityCount: 2,
            changeOrigin: 'local' as const,
          })),
        }),
        adapter('activities', {
          analyze: vi.fn(async () => ({
            differingEntityCount: 1,
            changeOrigin: 'cloud' as const,
          })),
        }),
        adapter('goals', {
          analyze: vi.fn(async () => ({ differingEntityCount: 3 })),
        }),
      ],
    });

    await orchestrator.run({ operation: 'analyze' });

    const { domains } = orchestrator.getSnapshot();
    expect(domains.weights.status).toBe('local-changes-pending');
    expect(domains.activities.status).toBe('cloud-changes-available');
    expect(domains.goals.status).toBe('action-required');
  });

  it('poursuit les autres domaines après un échec et relance uniquement l’échec', async () => {
    const weightsAnalyze = vi.fn()
      .mockRejectedValueOnce(new Error('Réseau temporairement indisponible.'))
      .mockResolvedValue({ differingEntityCount: 0 });
    const activitiesAnalyze = vi.fn(async () => ({ differingEntityCount: 0 }));
    const orchestrator = createSyncOrchestrator({
      accountKey: 'retry-account',
      domains: [
        adapter('weights', { analyze: weightsAnalyze }),
        adapter('activities', { analyze: activitiesAnalyze }),
      ],
    });

    const first = await orchestrator.run({ operation: 'analyze' });
    expect(first.failedDomainIds).toEqual(['weights']);
    expect(first.completedDomainIds).toEqual(['activities']);
    expect(orchestrator.getSnapshot().domains.weights.status).toBe('temporary-failure');

    const retry = await orchestrator.retryFailures();
    expect(retry?.completedDomainIds).toEqual(['weights']);
    expect(weightsAnalyze).toHaveBeenCalledTimes(2);
    expect(activitiesAnalyze).toHaveBeenCalledTimes(1);
  });

  it('regroupe les demandes différées rapprochées dans une seule file', async () => {
    vi.useFakeTimers();
    const weightsAnalyze = vi.fn(async () => ({ differingEntityCount: 0 }));
    const activitiesAnalyze = vi.fn(async () => ({ differingEntityCount: 0 }));
    const orchestrator = createSyncOrchestrator({
      accountKey: 'debounced-account',
      domains: [
        adapter('weights', { analyze: weightsAnalyze }),
        adapter('activities', { analyze: activitiesAnalyze }),
      ],
      defaultDebounceMs: 500,
    });

    const first = orchestrator.schedule({
      operation: 'analyze',
      source: 'local-change',
      domainIds: ['weights'],
    });
    const second = orchestrator.schedule({
      operation: 'analyze',
      source: 'local-change',
      domainIds: ['activities'],
    });

    expect(weightsAnalyze).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(weightsAnalyze).toHaveBeenCalledTimes(1);
    expect(activitiesAnalyze).toHaveBeenCalledTimes(1);
    expect(firstResult).toBe(secondResult);
    expect(firstResult.completedDomainIds).toEqual(['weights', 'activities']);
  });

  it('n’appelle aucun adaptateur hors connexion', async () => {
    const weights = adapter('weights');
    const orchestrator = createSyncOrchestrator({
      accountKey: 'offline-account',
      domains: [weights],
      isOnline: () => false,
    });

    const result = await orchestrator.run({ operation: 'sync' });

    expect(weights.analyze).not.toHaveBeenCalled();
    expect(weights.synchronize).not.toHaveBeenCalled();
    expect(result.failedDomainIds).toEqual(['weights']);
    expect(result.domainResults[0]).toMatchObject({ status: 'offline' });
    expect(orchestrator.getSnapshot().domains.weights.status).toBe('offline');
  });
});
