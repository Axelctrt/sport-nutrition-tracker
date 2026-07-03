import type { SyncOrchestratorDomainId } from '@/application/sync/syncOrchestrator';

export const SYNC_LOCAL_DATA_CHANGED_EVENT =
  'sportpilot:sync-local-data-changed';

export interface SyncLocalDataChangedDetail {
  readonly domainIds: readonly SyncOrchestratorDomainId[];
  readonly reason?: string;
}

export function notifySyncLocalDataChanged(
  domainIds: readonly SyncOrchestratorDomainId[],
  reason?: string,
): void {
  if (typeof window === 'undefined' || domainIds.length === 0) return;

  window.dispatchEvent(
    new CustomEvent<SyncLocalDataChangedDetail>(SYNC_LOCAL_DATA_CHANGED_EVENT, {
      detail: {
        domainIds: [...new Set(domainIds)],
        ...(reason ? { reason } : {}),
      },
    }),
  );
}

export function syncLocalDataChangedDetail(
  event: Event,
): SyncLocalDataChangedDetail | undefined {
  const detail = (event as CustomEvent<SyncLocalDataChangedDetail>).detail;
  if (!detail || !Array.isArray(detail.domainIds)) return undefined;

  return {
    domainIds: [...new Set(detail.domainIds)],
    ...(typeof detail.reason === 'string' ? { reason: detail.reason } : {}),
  };
}
