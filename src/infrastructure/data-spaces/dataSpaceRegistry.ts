import {
  DATA_SPACE_REGISTRY_VERSION,
  GUEST_DATA_SPACE_ID,
  accountDataSpaceId,
  type DataSpaceDescriptor,
  type DataSpaceId,
  type DataSpaceRegistry,
} from '@/domain/data-spaces/dataSpace';
import {
  DEFAULT_DATABASE_NAME,
  accountDatabaseNameForFingerprint,
} from '@/infrastructure/database/databaseNames';

export const DATA_SPACE_REGISTRY_STORAGE_KEY =
  'sportpilot:data-spaces:v1';

export interface DataSpaceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function resolveStorage(): DataSpaceStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

function isoNow(now: Date | string | undefined): string {
  if (typeof now === 'string') return now;
  return (now ?? new Date()).toISOString();
}

function createGuestSpace(now: string): DataSpaceDescriptor {
  return {
    id: GUEST_DATA_SPACE_ID,
    kind: 'guest',
    databaseName: DEFAULT_DATABASE_NAME,
    label: 'Espace local invité',
    createdAt: now,
    lastActivatedAt: now,
  };
}

export function createDefaultDataSpaceRegistry(
  now?: Date | string,
): DataSpaceRegistry {
  const timestamp = isoNow(now);

  return {
    version: DATA_SPACE_REGISTRY_VERSION,
    activeSpaceId: GUEST_DATA_SPACE_ID,
    spaces: [createGuestSpace(timestamp)],
  };
}

function isIsoDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isDataSpaceId(value: unknown): value is DataSpaceId {
  return (
    value === GUEST_DATA_SPACE_ID ||
    (typeof value === 'string' && value.startsWith('account:acct-'))
  );
}

function isValidSpace(value: unknown): value is DataSpaceDescriptor {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<DataSpaceDescriptor>;
  if (
    !isDataSpaceId(candidate.id) ||
    (candidate.kind !== 'guest' && candidate.kind !== 'account') ||
    typeof candidate.databaseName !== 'string' ||
    candidate.databaseName.length === 0 ||
    typeof candidate.label !== 'string' ||
    candidate.label.length === 0 ||
    !isIsoDateTime(candidate.createdAt) ||
    !isIsoDateTime(candidate.lastActivatedAt)
  ) {
    return false;
  }

  if (candidate.kind === 'guest') {
    return (
      candidate.id === GUEST_DATA_SPACE_ID &&
      candidate.databaseName === DEFAULT_DATABASE_NAME &&
      candidate.accountFingerprint === undefined &&
      candidate.linkedToCurrentDevice === undefined
    );
  }

  if (
    typeof candidate.accountFingerprint !== 'string' ||
    candidate.accountFingerprint.length === 0 ||
    (candidate.linkedToCurrentDevice !== undefined &&
      typeof candidate.linkedToCurrentDevice !== 'boolean')
  ) {
    return false;
  }

  try {
    return (
      candidate.id === accountDataSpaceId(candidate.accountFingerprint) &&
      candidate.databaseName ===
        accountDatabaseNameForFingerprint(candidate.accountFingerprint)
    );
  } catch {
    return false;
  }
}

function normalizeAccountSpace(
  space: DataSpaceDescriptor,
): DataSpaceDescriptor {
  if (space.kind !== 'account') return space;
  return {
    ...space,
    linkedToCurrentDevice: space.linkedToCurrentDevice !== false,
  };
}

function normalizeRegistry(
  value: unknown,
  now?: Date | string,
): DataSpaceRegistry {
  if (!value || typeof value !== 'object') {
    return createDefaultDataSpaceRegistry(now);
  }

  const candidate = value as Partial<DataSpaceRegistry>;
  if (
    candidate.version !== DATA_SPACE_REGISTRY_VERSION ||
    !isDataSpaceId(candidate.activeSpaceId) ||
    !Array.isArray(candidate.spaces)
  ) {
    return createDefaultDataSpaceRegistry(now);
  }

  const spaces = candidate.spaces
    .filter(isValidSpace)
    .map(normalizeAccountSpace);
  const guest = spaces.find((space) => space.id === GUEST_DATA_SPACE_ID);
  const active = spaces.find(
    (space) => space.id === candidate.activeSpaceId,
  );

  if (!guest || !active) {
    return createDefaultDataSpaceRegistry(now);
  }

  const uniqueSpaces = [...new Map(
    spaces.map((space) => [space.id, space]),
  ).values()];

  return {
    version: DATA_SPACE_REGISTRY_VERSION,
    activeSpaceId: active.id,
    spaces: uniqueSpaces,
  };
}

export function readDataSpaceRegistry(
  storage: DataSpaceStorage | undefined = resolveStorage(),
  now?: Date | string,
): DataSpaceRegistry {
  if (!storage) return createDefaultDataSpaceRegistry(now);

  try {
    const raw = storage.getItem(DATA_SPACE_REGISTRY_STORAGE_KEY);
    if (!raw) return createDefaultDataSpaceRegistry(now);
    return normalizeRegistry(JSON.parse(raw), now);
  } catch {
    return createDefaultDataSpaceRegistry(now);
  }
}

export function writeDataSpaceRegistry(
  registry: DataSpaceRegistry,
  storage: DataSpaceStorage | undefined = resolveStorage(),
): void {
  if (!storage) return;
  storage.setItem(
    DATA_SPACE_REGISTRY_STORAGE_KEY,
    JSON.stringify(registry),
  );
}

export function getActiveDataSpace(
  storage: DataSpaceStorage | undefined = resolveStorage(),
  now?: Date | string,
): DataSpaceDescriptor {
  const registry = readDataSpaceRegistry(storage, now);
  return (
    registry.spaces.find(
      (space) => space.id === registry.activeSpaceId,
    ) ?? registry.spaces[0]!
  );
}

export function registerAccountDataSpace(
  accountFingerprint: string,
  storage: DataSpaceStorage | undefined = resolveStorage(),
  now?: Date | string,
): DataSpaceDescriptor {
  const timestamp = isoNow(now);
  const normalizedFingerprint = accountFingerprint.trim().toLowerCase();
  const id = accountDataSpaceId(normalizedFingerprint);
  const databaseName = accountDatabaseNameForFingerprint(
    normalizedFingerprint,
  );
  const registry = readDataSpaceRegistry(storage, timestamp);
  const existing = registry.spaces.find((space) => space.id === id);

  if (existing) return existing;

  const created: DataSpaceDescriptor = {
    id,
    kind: 'account',
    databaseName,
    label: 'Espace de compte',
    accountFingerprint: normalizedFingerprint,
    linkedToCurrentDevice: true,
    createdAt: timestamp,
    lastActivatedAt: timestamp,
  };

  writeDataSpaceRegistry(
    {
      ...registry,
      spaces: [...registry.spaces, created],
    },
    storage,
  );

  return created;
}

export function activateDataSpace(
  spaceId: DataSpaceId,
  storage: DataSpaceStorage | undefined = resolveStorage(),
  now?: Date | string,
): DataSpaceDescriptor {
  const timestamp = isoNow(now);
  const registry = readDataSpaceRegistry(storage, timestamp);
  const selected = registry.spaces.find((space) => space.id === spaceId);

  if (!selected) {
    throw new Error('L’espace de données demandé n’existe pas sur cet appareil.');
  }

  const updated: DataSpaceDescriptor = {
    ...selected,
    ...(selected.kind === 'account'
      ? { linkedToCurrentDevice: true }
      : {}),
    lastActivatedAt: timestamp,
  };

  writeDataSpaceRegistry(
    {
      ...registry,
      activeSpaceId: updated.id,
      spaces: registry.spaces.map((space) =>
        space.id === updated.id ? updated : space,
      ),
    },
    storage,
  );

  return updated;
}

export function activateGuestDataSpace(
  storage: DataSpaceStorage | undefined = resolveStorage(),
  now?: Date | string,
): DataSpaceDescriptor {
  return activateDataSpace(GUEST_DATA_SPACE_ID, storage, now);
}

export function activateAccountDataSpace(
  accountFingerprint: string,
  storage: DataSpaceStorage | undefined = resolveStorage(),
  now?: Date | string,
): DataSpaceDescriptor {
  const accountSpace = registerAccountDataSpace(
    accountFingerprint,
    storage,
    now,
  );
  return activateDataSpace(accountSpace.id, storage, now);
}

export function detachAccountDataSpaceFromCurrentDevice(
  accountFingerprint: string,
  storage: DataSpaceStorage | undefined = resolveStorage(),
  now?: Date | string,
): DataSpaceDescriptor {
  const timestamp = isoNow(now);
  const registry = readDataSpaceRegistry(storage, timestamp);
  const normalizedFingerprint = accountFingerprint.trim().toLowerCase();
  const targetId = accountDataSpaceId(normalizedFingerprint);
  const target = registry.spaces.find((space) => space.id === targetId);
  const guest = registry.spaces.find((space) => space.id === GUEST_DATA_SPACE_ID);

  if (!target || target.kind !== 'account' || !guest) {
    throw new Error('Aucun espace local de ce compte n’existe sur cet appareil.');
  }

  const detached: DataSpaceDescriptor = {
    ...target,
    linkedToCurrentDevice: false,
  };
  const activeGuest: DataSpaceDescriptor = {
    ...guest,
    lastActivatedAt: timestamp,
  };

  writeDataSpaceRegistry(
    {
      ...registry,
      activeSpaceId: GUEST_DATA_SPACE_ID,
      spaces: registry.spaces.map((space) => {
        if (space.id === detached.id) return detached;
        if (space.id === GUEST_DATA_SPACE_ID) return activeGuest;
        return space;
      }),
    },
    storage,
  );

  return detached;
}

export function removeAccountDataSpace(
  accountFingerprint: string,
  storage: DataSpaceStorage | undefined = resolveStorage(),
  now?: Date | string,
): void {
  const timestamp = isoNow(now);
  const registry = readDataSpaceRegistry(storage, timestamp);
  const normalizedFingerprint = accountFingerprint.trim().toLowerCase();
  const targetId = accountDataSpaceId(normalizedFingerprint);
  const guest = registry.spaces.find((space) => space.id === GUEST_DATA_SPACE_ID);

  if (!guest) {
    throw new Error('L’espace invité local est indisponible.');
  }

  const activeGuest: DataSpaceDescriptor = {
    ...guest,
    lastActivatedAt: timestamp,
  };

  writeDataSpaceRegistry(
    {
      ...registry,
      activeSpaceId: GUEST_DATA_SPACE_ID,
      spaces: registry.spaces
        .filter((space) => space.id !== targetId)
        .map((space) =>
          space.id === GUEST_DATA_SPACE_ID ? activeGuest : space,
        ),
    },
    storage,
  );
}
