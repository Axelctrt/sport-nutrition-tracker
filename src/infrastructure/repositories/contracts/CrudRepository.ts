import type {
  EntityChanges,
  EntityId,
  EntityMetadata,
  NewEntity,
} from '@/domain/models/common';

export interface CrudRepository<T extends EntityMetadata> {
  getById(id: EntityId): Promise<T | undefined>;
  listAll(): Promise<T[]>;
  create(data: NewEntity<T>): Promise<T>;
  update(id: EntityId, changes: EntityChanges<T>): Promise<T>;
  delete(id: EntityId): Promise<void>;
}
