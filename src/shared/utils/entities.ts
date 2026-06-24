import type {
  EntityChanges,
  EntityId,
  EntityMetadata,
  IsoDateTime,
  NewEntity,
} from '@/domain/models/common';

export function createEntityId(): EntityId {
  return crypto.randomUUID();
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
