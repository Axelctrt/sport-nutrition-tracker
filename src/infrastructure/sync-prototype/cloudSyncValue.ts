export type CloudOwned<T extends object> = T & {
  readonly owner?: string;
  readonly realmId?: string;
  readonly $ts?: unknown;
  readonly _hasBlobRefs?: 1;
};

export function belongsToCurrentUser<T extends object>(
  entity: CloudOwned<T>,
  currentUserId: string,
): boolean {
  return !entity.owner || entity.owner === currentUserId;
}

export function stripCloudFields<T extends object>(
  entity: CloudOwned<T>,
): T {
  const {
    owner: _owner,
    realmId: _realmId,
    $ts: _cloudTimestamp,
    _hasBlobRefs: _hasBlobReferences,
    ...value
  } = entity;
  return value as T;
}

export function cloudPrivateId(localId: string): string {
  return localId.startsWith('#') ? localId : `#${localId}`;
}

export function localIdFromCloud(cloudId: string): string | undefined {
  return cloudId.startsWith('#') ? cloudId.slice(1) : undefined;
}

function normalizeStableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeStableValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, normalizeStableValue(nested)]),
  );
}

export function stableValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  return JSON.stringify(normalizeStableValue(value));
}

export function sameEntity(left: unknown, right: unknown): boolean {
  return stableValue(left) === stableValue(right);
}

export function chooseLatest<T extends { updatedAt: string }>(
  local: T | undefined,
  cloud: T | undefined,
): T | undefined {
  if (!local) return cloud;
  if (!cloud) return local;
  if (local.updatedAt > cloud.updatedAt) return local;
  if (cloud.updatedAt > local.updatedAt) return cloud;
  return stableValue(local) >= stableValue(cloud) ? local : cloud;
}
