import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendSyncOperationHistory,
  readSyncOperationHistory,
  summarizeSyncOperationHistory,
  syncSourceLabel,
} from '@/application/sync/syncOperationHistory';

const result = {
  operation: 'sync' as const,
  source: 'local-change' as const,
  startedAt: '2026-07-03T10:00:00.000Z',
  completedAt: '2026-07-03T10:00:01.000Z',
  completedDomainIds: ['weights'] as const,
  failedDomainIds: [] as const,
  domainResults: [
    {
      domainId: 'weights' as const,
      status: 'up-to-date' as const,
      differingEntityCount: 0,
    },
  ],
};

describe('historique des opérations de synchronisation', () => {
  beforeEach(() => localStorage.clear());

  it('enregistre une réussite par compte et notifie l’interface', () => {
    const listener = vi.fn();
    window.addEventListener('sportpilot:sync-operation-history-changed', listener);

    appendSyncOperationHistory('ACCOUNT-1', result);

    const entries = readSyncOperationHistory('account-1');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      operation: 'sync',
      source: 'local-change',
      outcome: 'success',
      completedDomainIds: ['weights'],
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('résume la dernière réussite, le dernier échec et les domaines à relancer', () => {
    appendSyncOperationHistory('account-1', result);
    appendSyncOperationHistory('account-1', {
      ...result,
      operation: 'analyze',
      source: 'foreground',
      completedAt: '2026-07-03T10:01:01.000Z',
      completedDomainIds: [],
      failedDomainIds: ['goals'],
      domainResults: [{
        domainId: 'goals',
        status: 'temporary-failure',
        errorMessage: 'Réseau indisponible',
      }],
    });

    const summary = summarizeSyncOperationHistory(readSyncOperationHistory('account-1'));
    expect(summary.lastSuccessfulSync?.operation).toBe('sync');
    expect(summary.lastFailure?.failedDomainIds).toEqual(['goals']);
    expect(summary.pendingDomainIds).toEqual(['goals']);
  });

  it('distingue les sources automatiques des actions manuelles', () => {
    expect(syncSourceLabel('manual')).toBe('Manuelle');
    expect(syncSourceLabel('network-restored')).toContain('Automatique');
  });
});
