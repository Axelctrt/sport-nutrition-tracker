import type { SyncOperationHistoryEntry } from '@/application/sync/syncOperationHistory';
import {
  type SyncOrchestratorDomainId,
  type SyncOrchestratorSnapshot,
} from '@/application/sync/syncOrchestrator';
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { readSyncPrototypeConfigSafely } from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

export type UnifiedSyncDetailId =
  | 'sync-detail-account-preferences'
  | 'sync-detail-rewards-routines'
  | 'sync-detail-weights'
  | 'sync-detail-activities'
  | 'sync-detail-goals'
  | 'sync-detail-strength'
  | 'sync-detail-nutrition-journal'
  | 'sync-detail-nutrition-library'
  | 'sync-detail-nutrition-tracking';

export type UnifiedDomainId = SyncOrchestratorDomainId;

export type UnifiedOperation = 'analyze' | 'sync';

export type DomainStatus =
  | 'not-analyzed'
  | 'not-run'
  | 'queued'
  | 'analyzing'
  | 'syncing'
  | 'up-to-date'
  | 'differences'
  | 'error';

export interface DomainFailure {
  readonly operation: UnifiedOperation;
  readonly message: string;
  readonly notExecuted?: boolean;
}

export interface SyncHistory {
  readonly lastAnalysisAt?: string;
  readonly lastSyncAt?: string;
}

export interface DomainDescriptor {
  readonly id: UnifiedDomainId;
  readonly label: string;
  readonly description: string;
  readonly detailId: UnifiedSyncDetailId;
  readonly enabled: boolean;
  readonly snapshotStatus: string | undefined;
  readonly differingEntityCount: number | undefined;
  readonly snapshotErrorMessage: string | undefined;
  readonly analyze?: () => Promise<{ readonly differingEntityCount: number }>;
  readonly synchronize?: () => Promise<unknown>;
}

export interface ConfirmationState {
  readonly target: 'all' | 'failures';
}

const EMPTY_SNAPSHOT: SyncPrototypeSnapshot = {
  account: { isLoggedIn: false, isLoading: false },
  sync: { status: 'not-started', phase: 'initial' },
  weights: { weights: [], deletedCount: 0, isLoading: false },
  diagnostics: createEmptySyncPrototypeDiagnostics(),
};

const EMPTY_ORCHESTRATOR_SNAPSHOT: SyncOrchestratorSnapshot = {
  accountKey: 'unavailable',
  isRunning: false,
  queueLength: 0,
  domains: {
    'account-preferences': { status: 'idle' },
    'rewards-routines': { status: 'idle' },
    weights: { status: 'idle' },
    activities: { status: 'idle' },
    goals: { status: 'idle' },
    strength: { status: 'idle' },
    'nutrition-journal': { status: 'idle' },
    'nutrition-library': { status: 'idle' },
    'nutrition-tracking': { status: 'idle' },
    'daily-coaching': { status: 'idle' },
  },
};

export const subscribeToNothing = (): (() => void) => () => undefined;
export const getEmptySnapshot = (): SyncPrototypeSnapshot => EMPTY_SNAPSHOT;
export const getEmptyOrchestratorSnapshot = (): SyncOrchestratorSnapshot =>
  EMPTY_ORCHESTRATOR_SNAPSHOT;

export function resolveClient(): {
  readonly client: SyncPrototypeClient | null;
  readonly errorMessage?: string;
} {
  const { config, errorMessage } = readSyncPrototypeConfigSafely();
  if (errorMessage) return { client: null, errorMessage };
  if (!config.enabled) return { client: null };

  try {
    return { client: getSyncPrototypeClient() };
  } catch (error) {
    return {
      client: null,
      errorMessage:
        error instanceof Error
          ? error.message
          : 'Le centre de synchronisation ne peut pas être initialisé.',
    };
  }
}

export function formatTimestamp(value: string | undefined): string {
  if (!value) return 'Jamais';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Jamais';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

export function historyStorageKey(snapshot: SyncPrototypeSnapshot): string | undefined {
  const fingerprint = createSyncPrototypeAccountFingerprint(
    snapshot.account.userId ?? snapshot.account.email,
  );
  return fingerprint
    ? `sportpilot:sync-center:history:${fingerprint.toLowerCase()}`
    : undefined;
}

export function readHistory(storageKey: string | undefined): SyncHistory {
  if (!storageKey) return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SyncHistory;
    return {
      ...(typeof parsed.lastAnalysisAt === 'string'
        ? { lastAnalysisAt: parsed.lastAnalysisAt }
        : {}),
      ...(typeof parsed.lastSyncAt === 'string'
        ? { lastSyncAt: parsed.lastSyncAt }
        : {}),
    };
  } catch {
    return {};
  }
}

export function writeHistory(storageKey: string | undefined, history: SyncHistory): void {
  if (!storageKey) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(history));
  } catch {
    // Les métadonnées du centre restent facultatives si le stockage est indisponible.
  }
}

export function scrollToDetail(detailId: UnifiedSyncDetailId): void {
  document.getElementById(detailId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

export function domainStatus(
  domain: DomainDescriptor,
  failure: DomainFailure | undefined,
  orchestratorStatus: SyncOrchestratorSnapshot['domains'][UnifiedDomainId]['status'],
): DomainStatus {
  if (failure?.notExecuted || orchestratorStatus === 'not-run') return 'not-run';
  if (failure || domain.snapshotStatus === 'error' || orchestratorStatus === 'temporary-failure') return 'error';
  if (orchestratorStatus === 'queued') return 'queued';
  if (domain.snapshotStatus === 'analyzing' || orchestratorStatus === 'analyzing') return 'analyzing';
  if (domain.snapshotStatus === 'syncing' || orchestratorStatus === 'syncing') return 'syncing';
  if (domain.differingEntityCount === undefined) return 'not-analyzed';
  return domain.differingEntityCount === 0 ? 'up-to-date' : 'differences';
}

export function statusLabel(status: DomainStatus, differences = 0): string {
  switch (status) {
    case 'not-run':
      return 'Non exécutée';
    case 'not-analyzed':
      return 'À analyser';
    case 'queued':
      return 'En attente';
    case 'analyzing':
      return 'Analyse…';
    case 'syncing':
      return 'Synchronisation…';
    case 'up-to-date':
      return 'À jour';
    case 'differences':
      return `${differences} ${differences > 1 ? 'différences' : 'différence'}`;
    case 'error':
      return 'En échec';
  }
}

export function statusClasses(status: DomainStatus): string {
  switch (status) {
    case 'not-run':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    case 'up-to-date':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200';
    case 'differences':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200';
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200';
    case 'queued':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200';
    case 'analyzing':
    case 'syncing':
      return 'bg-brand-100 text-brand-800 dark:bg-brand-950/50 dark:text-brand-200';
    case 'not-analyzed':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  }
}


export function historyOperationLabel(entry: SyncOperationHistoryEntry): string {
  return entry.operation === 'sync' ? 'Synchronisation' : 'Analyse';
}

export function historyOutcomeLabel(entry: SyncOperationHistoryEntry): string {
  if (entry.outcome === 'success') return 'Réussie';
  if (entry.outcome === 'partial-failure') return 'Partiellement réussie';
  return 'Échec';
}
