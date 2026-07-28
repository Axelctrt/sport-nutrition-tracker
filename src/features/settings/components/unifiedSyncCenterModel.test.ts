import type { SyncOrchestratorSnapshot } from '@/application/sync/syncOrchestrator';
import {
  domainStatus,
  formatTimestamp,
  statusClasses,
  statusLabel,
  type DomainDescriptor,
  type DomainFailure,
} from './unifiedSyncCenterModel';

const domain: DomainDescriptor = {
  id: 'activities',
  label: 'Activités',
  description: 'Activités sportives.',
  detailId: 'sync-detail-activities',
  enabled: true,
  snapshotStatus: 'ready',
  differingEntityCount: 0,
  snapshotErrorMessage: undefined,
};

function resolveStatus(
  overrides: Partial<DomainDescriptor> = {},
  failure?: DomainFailure,
  orchestratorStatus: SyncOrchestratorSnapshot['domains']['activities']['status'] = 'idle',
) {
  return domainStatus({ ...domain, ...overrides }, failure, orchestratorStatus);
}

describe('unifiedSyncCenterModel', () => {
  it('priorise les échecs et les opérations en cours dans le statut de domaine', () => {
    expect(resolveStatus({}, { operation: 'sync', message: 'Réseau indisponible' })).toBe('error');
    expect(resolveStatus({}, undefined, 'queued')).toBe('queued');
    expect(resolveStatus({ snapshotStatus: 'analyzing' })).toBe('analyzing');
    expect(resolveStatus({ snapshotStatus: 'syncing' })).toBe('syncing');
  });

  it('distingue un domaine non analysé, à jour ou avec différences', () => {
    expect(resolveStatus({ differingEntityCount: undefined })).toBe('not-analyzed');
    expect(resolveStatus({ differingEntityCount: 0 })).toBe('up-to-date');
    expect(resolveStatus({ differingEntityCount: 3 })).toBe('differences');
  });

  it('centralise les libellés et classes de présentation', () => {
    expect(statusLabel('differences', 1)).toBe('1 différence');
    expect(statusLabel('differences', 2)).toBe('2 différences');
    expect(statusLabel('error')).toBe('En échec');
    expect(statusLabel('not-run')).toBe('Non exécutée');
    expect(statusClasses('up-to-date')).toContain('emerald');
    expect(statusClasses('error')).toContain('red');
  });

  it('retourne Jamais pour une date absente ou invalide', () => {
    expect(formatTimestamp(undefined)).toBe('Jamais');
    expect(formatTimestamp('invalide')).toBe('Jamais');
  });
});
