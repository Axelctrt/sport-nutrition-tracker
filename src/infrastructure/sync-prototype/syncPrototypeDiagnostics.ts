import type { SyncPrototypeSnapshot } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

export interface SyncPrototypeDiagnosticsSnapshot {
  readonly databaseName: string;
  readonly databaseVersion: number;
  readonly visibleWeightCount: number;
  readonly deletedWeightCount: number;
  readonly accountFingerprint?: string;
  readonly lastSyncCompletedAt?: string;
  readonly lastRefreshAt?: string;
  readonly latestWeightUpdatedAt?: string;
}

export interface SyncPrototypeDiagnosticReport {
  readonly generatedAt: string;
  readonly database: {
    readonly name: string;
    readonly version: number;
    readonly realDatabaseIncluded: false;
  };
  readonly account: {
    readonly isLoggedIn: boolean;
    readonly fingerprint?: string;
  };
  readonly sync: {
    readonly status: SyncPrototypeSnapshot['sync']['status'];
    readonly phase: SyncPrototypeSnapshot['sync']['phase'];
    readonly progress?: number;
    readonly lastCompletedAt?: string;
  };
  readonly weights: {
    readonly visibleCount: number;
    readonly deletedCount: number;
    readonly latestUpdatedAt?: string;
    readonly lastRefreshAt?: string;
  };
  readonly conflictPolicy: {
    readonly differentProperties: 'merge';
    readonly sameProperty: 'latest-operation-wins';
    readonly staleEntityAfterDeletion: 'hidden-by-deletion-record';
  };
  readonly security: {
    readonly containsEmail: false;
    readonly containsCredentials: false;
    readonly containsRealSportPilotData: false;
  };
}

const LEGACY_DATA_SPACE_REGISTRY_KEY = 'sportpilot:data-spaces:v1';
const FNV_64_PRIME = 0x100000001b3n;
const FNV_64_MASK = 0xffffffffffffffffn;

function fnv1a64(value: string, offset: bigint): string {
  let hash = offset;
  for (const character of value) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = (hash * FNV_64_PRIME) & FNV_64_MASK;
  }
  return hash.toString(16).padStart(16, '0');
}

export function createLegacySyncPrototypeAccountFingerprint(
  accountId: string | undefined,
): string | undefined {
  if (!accountId) return undefined;

  let hash = 0x811c9dc5;
  for (const character of accountId.trim().toLowerCase()) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }

  return `acct-${(hash >>> 0).toString(16).padStart(8, '0').toUpperCase()}`;
}

function registeredLegacyFingerprint(
  accountId: string,
): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const legacy = createLegacySyncPrototypeAccountFingerprint(accountId);
  if (!legacy) return undefined;

  try {
    const raw = window.localStorage.getItem(LEGACY_DATA_SPACE_REGISTRY_KEY);
    if (!raw) return undefined;
    const registry = JSON.parse(raw) as {
      readonly spaces?: readonly {
        readonly accountFingerprint?: string;
      }[];
    };
    return registry.spaces?.some(
      (space) =>
        space.accountFingerprint?.toLowerCase() === legacy.toLowerCase(),
    )
      ? legacy
      : undefined;
  } catch {
    return undefined;
  }
}

export function createSyncPrototypeAccountFingerprint(
  accountId: string | undefined,
): string | undefined {
  if (!accountId) return undefined;

  const normalized = accountId.trim().toLowerCase();
  const legacy = registeredLegacyFingerprint(normalized);
  if (legacy) return legacy;

  const first = fnv1a64(normalized, 0xcbf29ce484222325n);
  const second = fnv1a64(
    `sportpilot-account-space:${normalized}`,
    0x84222325cbf29ce4n,
  );
  return `acct-${`${first}${second}`.toUpperCase()}`;
}

export function createEmptySyncPrototypeDiagnostics(
  accountId?: string,
): SyncPrototypeDiagnosticsSnapshot {
  const accountFingerprint =
    createSyncPrototypeAccountFingerprint(accountId);

  return {
    databaseName: SYNC_PROTOTYPE_DATABASE_NAME,
    databaseVersion: SYNC_PROTOTYPE_DATABASE_VERSION,
    visibleWeightCount: 0,
    deletedWeightCount: 0,
    ...(accountFingerprint ? { accountFingerprint } : {}),
  };
}

export function createSyncPrototypeDiagnosticReport(
  snapshot: SyncPrototypeSnapshot,
  generatedAt = new Date().toISOString(),
): SyncPrototypeDiagnosticReport {
  const diagnostics = snapshot.diagnostics;

  return {
    generatedAt,
    database: {
      name: diagnostics.databaseName,
      version: diagnostics.databaseVersion,
      realDatabaseIncluded: false,
    },
    account: {
      isLoggedIn: snapshot.account.isLoggedIn,
      ...(diagnostics.accountFingerprint
        ? { fingerprint: diagnostics.accountFingerprint }
        : {}),
    },
    sync: {
      status: snapshot.sync.status,
      phase: snapshot.sync.phase,
      ...(typeof snapshot.sync.progress === 'number'
        ? { progress: snapshot.sync.progress }
        : {}),
      ...(diagnostics.lastSyncCompletedAt
        ? { lastCompletedAt: diagnostics.lastSyncCompletedAt }
        : {}),
    },
    weights: {
      visibleCount: diagnostics.visibleWeightCount,
      deletedCount: diagnostics.deletedWeightCount,
      ...(diagnostics.latestWeightUpdatedAt
        ? { latestUpdatedAt: diagnostics.latestWeightUpdatedAt }
        : {}),
      ...(diagnostics.lastRefreshAt
        ? { lastRefreshAt: diagnostics.lastRefreshAt }
        : {}),
    },
    conflictPolicy: {
      differentProperties: 'merge',
      sameProperty: 'latest-operation-wins',
      staleEntityAfterDeletion: 'hidden-by-deletion-record',
    },
    security: {
      containsEmail: false,
      containsCredentials: false,
      containsRealSportPilotData: false,
    },
  };
}
