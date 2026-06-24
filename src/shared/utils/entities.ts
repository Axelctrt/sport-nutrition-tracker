import type {
  EntityChanges,
  EntityId,
  EntityMetadata,
  IsoDateTime,
  NewEntity,
} from '@/domain/models/common';

interface EntityIdSource {
  randomUUID?: () => string;
  fillRandomBytes?: (bytes: Uint8Array<ArrayBuffer>) => void;
}

function formatUuidV4(bytes: Uint8Array<ArrayBuffer>): EntityId {
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20),
  ].join('-') as EntityId;
}

function fillFallbackRandomBytes(bytes: Uint8Array<ArrayBuffer>): void {
  const timestamp = Date.now();
  for (let index = 0; index < bytes.length; index += 1) {
    const timestampByte = (timestamp >> ((index % 6) * 8)) & 0xff;
    bytes[index] = timestampByte ^ Math.floor(Math.random() * 256);
  }
}

function getDefaultEntityIdSource(): EntityIdSource | undefined {
  if (typeof globalThis.crypto === 'undefined') {
    return undefined;
  }

  const browserCrypto = globalThis.crypto;
  const source: EntityIdSource = {
    fillRandomBytes: (bytes) => {
      browserCrypto.getRandomValues(bytes);
    },
  };

  if (typeof browserCrypto.randomUUID === 'function') {
    source.randomUUID = () => browserCrypto.randomUUID();
  }

  return source;
}

export function createEntityId(
  source: EntityIdSource | undefined = getDefaultEntityIdSource(),
): EntityId {
  if (typeof source?.randomUUID === 'function') {
    return source.randomUUID() as EntityId;
  }

  const bytes = new Uint8Array(new ArrayBuffer(16));
  if (typeof source?.fillRandomBytes === 'function') {
    source.fillRandomBytes(bytes);
  } else {
    fillFallbackRandomBytes(bytes);
  }

  return formatUuidV4(bytes);
}


export function currentIsoDateTime(): IsoDateTime {
  return new Date().toISOString();
}

export function createEntity<T extends EntityMetadata>(
  data: NewEntity<T>,
  id: EntityId = createEntityId(),
  timestamp: IsoDateTime = currentIsoDateTime(),
): T {
  return {
    ...data,
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
  } as T;
}

export function updateEntity<T extends EntityMetadata>(
  current: T,
  changes: EntityChanges<T>,
  timestamp: IsoDateTime = currentIsoDateTime(),
): T {
  return {
    ...current,
    ...changes,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: timestamp,
  } as T;
}
