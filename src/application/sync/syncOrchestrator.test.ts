import { readSyncOperationHistory } from '@/application/sync/syncOperationHistory';
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

  it('transmet explicitement le mode cloud-only à l’adaptateur', async () => {
    const strength = adapter('strength');
    const orchestrator = createSyncOrchestrator({
      accountKey: 'cloud-only-account',
      domains: [strength],
    });

    await orchestrator.run({
      operation: 'sync',
      source: 'application-start',
      domainIds: ['strength'],
      syncMode: 'cloud-only',
    });

    expect(strength.synchronize).toHaveBeenCalledWith('cloud-only');
  });

  it('transmet explicitement le mode local-only à l’adaptateur', async () => {
    const strength = adapter('strength');
    const orchestrator = createSyncOrchestrator({
      accountKey: 'local-only-account',
      domains: [strength],
    });

    await orchestrator.run({
      operation: 'sync',
      source: 'local-change',
      domainIds: ['strength'],
      syncMode: 'local-only',
    });

    expect(strength.synchronize).toHaveBeenCalledWith('local-only');
  });

  it('conserve le mode cloud-only lors d’une reprise ciblée après échec', async () => {
    const strengthSync = vi.fn()
      .mockRejectedValueOnce(new Error('Réseau temporaire.'))
      .mockResolvedValue(undefined);
    const strength = adapter('strength', { synchronize: strengthSync });
    const orchestrator = createSyncOrchestrator({
      accountKey: 'cloud-only-retry',
      domains: [strength],
    });

    const first = await orchestrator.run({
      operation: 'sync',
      domainIds: ['strength'],
      syncMode: 'cloud-only',
    });
    expect(first.failedDomainIds).toEqual(['strength']);

    await orchestrator.retryFailures();

    expect(strengthSync).toHaveBeenNthCalledWith(1, 'cloud-only');
    expect(strengthSync).toHaveBeenNthCalledWith(2, 'cloud-only');
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

  it('prévalide une seule fois et ne lance aucun domaine si le compte cloud est inutilisable', async () => {
    const weights = adapter('weights');
    const activities = adapter('activities');
    const preflight = vi.fn(async () => {
      throw new Error('Ta session cloud a expiré. Reconnecte-toi pour continuer.');
    });
    const orchestrator = createSyncOrchestrator({
      accountKey: 'expired-account',
      domains: [weights, activities],
      preflight,
    });

    const result = await orchestrator.run({ operation: 'sync' });

    expect(preflight).toHaveBeenCalledTimes(1);
    expect(weights.synchronize).not.toHaveBeenCalled();
    expect(activities.synchronize).not.toHaveBeenCalled();
    expect(result.domainResults).toEqual([
      expect.objectContaining({ domainId: 'weights', status: 'not-run' }),
      expect.objectContaining({ domainId: 'activities', status: 'not-run' }),
    ]);
    expect(orchestrator.getSnapshot().domains.weights.status).toBe('not-run');
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

  it('autorise deux comptes différents à progresser sans verrou global', async () => {
    const firstGate = deferred<void>();
    const secondGate = deferred<void>();
    const order: string[] = [];
    const first = createSyncOrchestrator({
      accountKey: 'account-a',
      domains: [adapter('weights', {
        analyze: vi.fn(async () => {
          order.push('a:start');
          await firstGate.promise;
          order.push('a:end');
          return { differingEntityCount: 0 };
        }),
      })],
    });
    const second = createSyncOrchestrator({
      accountKey: 'account-b',
      domains: [adapter('activities', {
        analyze: vi.fn(async () => {
          order.push('b:start');
          await secondGate.promise;
          order.push('b:end');
          return { differingEntityCount: 0 };
        }),
      })],
    });

    const firstRun = first.run({ operation: 'analyze' });
    const secondRun = second.run({ operation: 'analyze' });
    await vi.waitFor(() => {
      expect(order).toEqual(expect.arrayContaining(['a:start', 'b:start']));
    });

    firstGate.resolve();
    secondGate.resolve();
    await Promise.all([firstRun, secondRun]);
    expect(order.indexOf('a:end')).toBeGreaterThan(order.indexOf('a:start'));
    expect(order.indexOf('b:end')).toBeGreaterThan(order.indexOf('b:start'));
  });

  it('journalise aussi une tentative bloquée hors connexion', async () => {
    localStorage.clear();
    const orchestrator = createSyncOrchestrator({
      accountKey: 'offline-history',
      domains: [adapter('weights')],
      isOnline: () => false,
    });

    await orchestrator.run({
      operation: 'sync',
      source: 'network-restored',
    });

    expect(readSyncOperationHistory('offline-history')).toEqual([
      expect.objectContaining({
        operation: 'sync',
        source: 'network-restored',
        outcome: 'failure',
        failedDomainIds: ['weights'],
      }),
    ]);
  });

  it('conserve les succès acquis lors d’une perte réseau puis relance seulement les échecs', async () => {
    let online = true;
    const weightsSync = vi.fn(async () => {
      online = false;
    });
    const activitiesSync = vi.fn(async () => {
      if (!online) throw new Error('Connexion interrompue pendant l’opération.');
    });
    const orchestrator = createSyncOrchestrator({
      accountKey: 'network-loss',
      domains: [
        adapter('weights', { synchronize: weightsSync }),
        adapter('activities', { synchronize: activitiesSync }),
      ],
      isOnline: () => online,
    });

    const first = await orchestrator.run({ operation: 'sync' });
    expect(first.completedDomainIds).toEqual(['weights']);
    expect(first.failedDomainIds).toEqual(['activities']);

    online = true;
    const retry = await orchestrator.retryFailures();
    expect(retry?.completedDomainIds).toEqual(['activities']);
    expect(weightsSync).toHaveBeenCalledTimes(1);
    expect(activitiesSync).toHaveBeenCalledTimes(2);
  });

  it('n’entame pas un nouveau domaine après l’arrêt pendant une opération', async () => {
    const gate = deferred<void>();
    const weightsSync = vi.fn(async () => gate.promise);
    const activitiesSync = vi.fn(async () => undefined);
    const orchestrator = createSyncOrchestrator({
      accountKey: 'closing-application',
      domains: [
        adapter('weights', { synchronize: weightsSync }),
        adapter('activities', { synchronize: activitiesSync }),
      ],
    });

    const run = orchestrator.run({ operation: 'sync' });
    await vi.waitFor(() => expect(weightsSync).toHaveBeenCalledOnce());
    orchestrator.dispose();
    gate.resolve();

    const result = await run;
    expect(result.completedDomainIds).toEqual(['weights']);
    expect(result.failedDomainIds).toEqual(['activities']);
    expect(activitiesSync).not.toHaveBeenCalled();
    expect(result.domainResults).toContainEqual(
      expect.objectContaining({
        domainId: 'activities',
        status: 'temporary-failure',
      }),
    );
  });

});
