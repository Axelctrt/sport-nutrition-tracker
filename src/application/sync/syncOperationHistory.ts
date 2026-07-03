import type {
  SyncOrchestratorDomainId,
  SyncOrchestratorOperation,
  SyncOrchestratorRunResult,
  SyncOrchestratorSource,
} from '@/application/sync/syncOrchestrator';

export const SYNC_OPERATION_HISTORY_CHANGED_EVENT =
  'sportpilot:sync-operation-history-changed';

export type SyncOperationOutcome = 'success' | 'partial-failure' | 'failure';

export interface SyncOperationHistoryEntry {
  readonly id: string;
  readonly accountKey: string;
  readonly operation: SyncOrchestratorOperation;
  readonly source: SyncOrchestratorSource;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly completedDomainIds: readonly SyncOrchestratorDomainId[];
  readonly failedDomainIds: readonly SyncOrchestratorDomainId[];
  readonly differingEntityCount: number;
  readonly outcome: SyncOperationOutcome;
  readonly errorMessage?: string;
}

export interface SyncOperationHistorySummary {
  readonly lastSuccessfulSync?: SyncOperationHistoryEntry;
  readonly lastFailure?: SyncOperationHistoryEntry;
  readonly pendingDomainIds: readonly SyncOrchestratorDomainId[];
  readonly entries: readonly SyncOperationHistoryEntry[];
}

const MAX_HISTORY_ENTRIES = 20;

function storageKey(accountKey: string): string {
  return `sportpilot:sync-operation-history:${accountKey.trim().toLowerCase()}`;
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

function parseEntry(value: unknown): SyncOperationHistoryEntry | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const entry = value as Partial<SyncOperationHistoryEntry>;
  if (
    typeof entry.id !== 'string' ||
    typeof entry.accountKey !== 'string' ||
    (entry.operation !== 'analyze' && entry.operation !== 'sync') ||
    typeof entry.source !== 'string' ||
    typeof entry.startedAt !== 'string' ||
    typeof entry.completedAt !== 'string' ||
    !Array.isArray(entry.completedDomainIds) ||
    !Array.isArray(entry.failedDomainIds) ||
    typeof entry.differingEntityCount !== 'number' ||
    !['success', 'partial-failure', 'failure'].includes(entry.outcome ?? '')
  ) return undefined;
  return entry as SyncOperationHistoryEntry;
}

export function readSyncOperationHistory(
  accountKey: string | undefined,
): readonly SyncOperationHistoryEntry[] {
  if (!accountKey) return [];
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(storageKey(accountKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseEntry).filter(Boolean) as SyncOperationHistoryEntry[];
  } catch {
    return [];
  }
}

export function appendSyncOperationHistory(
  accountKey: string,
  result: SyncOrchestratorRunResult,
): SyncOperationHistoryEntry {
  const failedCount = result.failedDomainIds.length;
  const completedCount = result.completedDomainIds.length;
  const entry: SyncOperationHistoryEntry = {
    id: `${result.completedAt}:${result.operation}:${result.source}`,
    accountKey: accountKey.trim().toLowerCase(),
    operation: result.operation,
    source: result.source,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    completedDomainIds: [...result.completedDomainIds],
    failedDomainIds: [...result.failedDomainIds],
    differingEntityCount: result.domainResults.reduce(
      (sum, domain) => sum + (domain.differingEntityCount ?? 0),
      0,
    ),
    outcome:
      failedCount === 0
        ? 'success'
        : completedCount === 0
          ? 'failure'
          : 'partial-failure',
    ...(result.domainResults.find((domain) => domain.errorMessage)?.errorMessage
      ? {
          errorMessage: result.domainResults.find((domain) => domain.errorMessage)!
            .errorMessage,
        }
      : {}),
  };

  const storage = safeStorage();
  if (storage) {
    try {
      const entries = [entry, ...readSyncOperationHistory(accountKey)]
        .filter((candidate, index, values) =>
          values.findIndex((value) => value.id === candidate.id) === index,
        )
        .slice(0, MAX_HISTORY_ENTRIES);
      storage.setItem(storageKey(accountKey), JSON.stringify(entries));
    } catch {
      // L'historique est informatif et ne doit jamais bloquer la synchronisation.
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SYNC_OPERATION_HISTORY_CHANGED_EVENT, {
        detail: { accountKey: entry.accountKey },
      }),
    );
  }
  return entry;
}

export function summarizeSyncOperationHistory(
  entries: readonly SyncOperationHistoryEntry[],
): SyncOperationHistorySummary {
  const lastSuccessfulSync = entries.find(
    (entry) => entry.operation === 'sync' && entry.outcome === 'success',
  );
  const lastFailure = entries.find((entry) => entry.outcome !== 'success');
  const pendingDomainIds = [
    ...new Set(
      entries
        .filter((entry) => entry.outcome !== 'success')
        .flatMap((entry) => entry.failedDomainIds),
    ),
  ];
  return {
    ...(lastSuccessfulSync ? { lastSuccessfulSync } : {}),
    ...(lastFailure ? { lastFailure } : {}),
    pendingDomainIds,
    entries,
  };
}

export function syncSourceLabel(source: SyncOrchestratorSource): string {
  switch (source) {
    case 'manual': return 'Manuelle';
    case 'application-start': return 'Automatique · démarrage';
    case 'foreground': return 'Automatique · premier plan';
    case 'network-restored': return 'Automatique · reconnexion';
    case 'local-change': return 'Automatique · modification locale';
    case 'account-connected': return 'Automatique · connexion du compte';
    case 'cloud-restore': return 'Automatique · restauration';
  }
}
