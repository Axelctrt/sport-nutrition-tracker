import type { Table } from 'dexie';
import { DEVICE_SETTINGS_ID } from '@/domain/defaults/identifiers';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  sameEntity,
  stableValue,
} from '@/infrastructure/sync-prototype/cloudSyncValue';

export interface LogicalSyncFields {
  readonly syncRevision?: number;
  readonly syncActorId?: string;
}

export interface LogicalSyncStamp {
  readonly revision: number;
  readonly actorId: string;
}

export interface LogicalSyncBaseline {
  readonly id: string;
  readonly accountUserId: string;
  readonly domainId: string;
  readonly entityId: string;
  readonly localDigest: string;
  readonly cloudDigest: string;
  readonly revision: number;
  readonly actorId: string;
  readonly updatedAt: string;
}

export interface LogicalSyncResolution<T> {
  readonly value: T;
  readonly stamp: LogicalSyncStamp;
  readonly baseline: LogicalSyncBaseline;
  readonly source: 'equal' | 'local' | 'cloud' | 'legacy';
}

export interface DatabaseLogicalSyncResolution<T>
  extends Omit<LogicalSyncResolution<T>, 'baseline'> {
  readonly baseline?: LogicalSyncBaseline;
}

const ZERO_STAMP: LogicalSyncStamp = {
  revision: 0,
  actorId: '',
};

export function logicalSyncBaselineId(
  accountUserId: string,
  domainId: string,
  entityId: string,
): string {
  return `${accountUserId}:${domainId}:${entityId}`;
}

export function logicalSyncStamp(
  value: object | undefined,
): LogicalSyncStamp {
  const fields = value as LogicalSyncFields | undefined;
  const revision = Number.isSafeInteger(fields?.syncRevision)
    && Number(fields?.syncRevision) >= 0
    ? Number(fields?.syncRevision)
    : 0;
  const actorId = typeof fields?.syncActorId === 'string'
    ? fields.syncActorId
    : '';
  return { revision, actorId };
}

export function compareLogicalSyncStamps(
  left: LogicalSyncStamp,
  right: LogicalSyncStamp,
): number {
  if (left.revision !== right.revision) {
    return left.revision > right.revision ? 1 : -1;
  }
  return left.actorId.localeCompare(right.actorId);
}

export function maximumLogicalSyncStamp(
  values: readonly (object | undefined)[],
): LogicalSyncStamp {
  return values.reduce<LogicalSyncStamp>((latest, value) => {
    const candidate = logicalSyncStamp(value);
    return compareLogicalSyncStamps(candidate, latest) > 0
      ? candidate
      : latest;
  }, ZERO_STAMP);
}

export function nextLogicalSyncStamp(
  actorId: string,
  ...observed: readonly LogicalSyncStamp[]
): LogicalSyncStamp {
  const revision = observed.reduce(
    (maximum, stamp) => Math.max(maximum, stamp.revision),
    0,
  );
  return {
    revision: revision + 1,
    actorId,
  };
}

export function stripLogicalSyncFields<T extends object>(
  value: T & LogicalSyncFields,
): T {
  const {
    syncRevision: _syncRevision,
    syncActorId: _syncActorId,
    ...entity
  } = value;
  return entity as T;
}

export function withLogicalSyncStamp<T extends object>(
  value: T,
  stamp: LogicalSyncStamp,
): T & LogicalSyncFields {
  return {
    ...value,
    syncRevision: stamp.revision,
    syncActorId: stamp.actorId,
  };
}

export async function resolveSyncActorId(
  localDatabase: AppDatabase,
): Promise<string> {
  const settings = await localDatabase.deviceSettings
    ?.get(DEVICE_SETTINGS_ID)
    .catch(() => undefined);
  return settings?.deviceId || `database:${localDatabase.name}`;
}

export function logicalSyncBaselineTable(
  cloudDatabase: SyncPrototypeDatabase,
): Table<LogicalSyncBaseline, string> | undefined {
  try {
    return cloudDatabase.table<LogicalSyncBaseline, string>(
      'realSyncBaselines',
    );
  } catch {
    return undefined;
  }
}

function stampFromBaseline(
  baseline: LogicalSyncBaseline | undefined,
): LogicalSyncStamp {
  return baseline
    ? { revision: baseline.revision, actorId: baseline.actorId }
    : ZERO_STAMP;
}

function createBaseline(
  accountUserId: string,
  domainId: string,
  entityId: string,
  value: unknown,
  stamp: LogicalSyncStamp,
  now: Date,
): LogicalSyncBaseline {
  const digest = stableValue(value);
  return {
    id: logicalSyncBaselineId(accountUserId, domainId, entityId),
    accountUserId,
    domainId,
    entityId,
    localDigest: digest,
    cloudDigest: digest,
    revision: stamp.revision,
    actorId: stamp.actorId,
    updatedAt: now.toISOString(),
  };
}

export function resolveLogicalSyncState<T>(input: {
  readonly accountUserId: string;
  readonly domainId: string;
  readonly entityId: string;
  readonly actorId: string;
  readonly localValue: T;
  readonly cloudValue: T;
  readonly cloudStamp: LogicalSyncStamp;
  readonly baseline?: LogicalSyncBaseline;
  readonly legacyResolve: (localValue: T, cloudValue: T) => T;
  readonly concurrentResolve?: (localValue: T, cloudValue: T) => T;
  readonly now?: Date;
}): LogicalSyncResolution<T> {
  const {
    accountUserId,
    domainId,
    entityId,
    actorId,
    localValue,
    cloudValue,
    cloudStamp,
    baseline,
    legacyResolve,
    concurrentResolve,
    now = new Date(),
  } = input;
  const localDigest = stableValue(localValue);
  const cloudDigest = stableValue(cloudValue);
  const baselineStamp = stampFromBaseline(baseline);

  let value: T;
  let stamp: LogicalSyncStamp;
  let source: LogicalSyncResolution<T>['source'];

  if (!baseline) {
    value = legacyResolve(localValue, cloudValue);
    source = 'legacy';
    if (sameEntity(value, cloudValue) && cloudStamp.revision > 0) {
      stamp = cloudStamp;
    } else {
      stamp = nextLogicalSyncStamp(actorId, cloudStamp);
    }
  } else if (localDigest === cloudDigest) {
    value = localValue;
    stamp = compareLogicalSyncStamps(cloudStamp, baselineStamp) > 0
      ? cloudStamp
      : baselineStamp;
    source = 'equal';
  } else {
    const localChanged = localDigest !== baseline.localDigest;
    const cloudChanged = cloudDigest !== baseline.cloudDigest
      || compareLogicalSyncStamps(cloudStamp, baselineStamp) > 0;

    if (!localChanged && cloudChanged) {
      value = cloudValue;
      stamp = cloudStamp.revision > 0
        ? cloudStamp
        : nextLogicalSyncStamp(actorId, baselineStamp);
      source = 'cloud';
    } else {
      value = localChanged && cloudChanged && concurrentResolve
        ? concurrentResolve(localValue, cloudValue)
        : localValue;
      stamp = nextLogicalSyncStamp(actorId, baselineStamp, cloudStamp);
      source = 'local';
    }
  }

  return {
    value,
    stamp,
    baseline: createBaseline(
      accountUserId,
      domainId,
      entityId,
      value,
      stamp,
      now,
    ),
    source,
  };
}

export async function resolveDatabaseLogicalSyncState<T>(input: {
  readonly cloudDatabase: SyncPrototypeDatabase;
  readonly accountUserId: string;
  readonly domainId: string;
  readonly entityId: string;
  readonly actorId: string;
  readonly localValue: T;
  readonly cloudValue: T;
  readonly cloudStamp: LogicalSyncStamp;
  readonly legacyResolve: (localValue: T, cloudValue: T) => T;
  readonly concurrentResolve?: (localValue: T, cloudValue: T) => T;
  readonly now?: Date;
}): Promise<DatabaseLogicalSyncResolution<T>> {
  const table = logicalSyncBaselineTable(input.cloudDatabase);
  if (!table) {
    return {
      value: input.legacyResolve(input.localValue, input.cloudValue),
      stamp: input.cloudStamp,
      source: 'legacy',
    };
  }
  const baseline = await table.get(logicalSyncBaselineId(
    input.accountUserId,
    input.domainId,
    input.entityId,
  ));
  return resolveLogicalSyncState({
    ...input,
    ...(baseline ? { baseline } : {}),
  });
}

export async function persistLogicalSyncBaseline(
  cloudDatabase: SyncPrototypeDatabase,
  baseline: LogicalSyncBaseline | undefined,
): Promise<void> {
  if (!baseline) return;
  await logicalSyncBaselineTable(cloudDatabase)?.put(baseline);
}

export async function upsertLogicalCloudValue<T extends { id: string }>(
  table: Table<T, string>,
  current: T | undefined,
  currentCloudValue: object | undefined,
  target: T,
  stamp: LogicalSyncStamp,
  toCloudValue: (value: T) => T,
): Promise<boolean> {
  const entityChanged = !current || !sameEntity(current, target);
  if (
    !entityChanged
    && compareLogicalSyncStamps(
      logicalSyncStamp(currentCloudValue),
      stamp,
    ) === 0
  ) {
    return false;
  }
  await table.put(withLogicalSyncStamp(toCloudValue(target), stamp) as T);
  return entityChanged;
}
