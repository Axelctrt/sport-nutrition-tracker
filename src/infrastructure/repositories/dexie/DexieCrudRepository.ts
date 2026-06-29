import type { Table } from 'dexie';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import type {
  EntityChanges,
  EntityId,
  EntityMetadata,
  NewEntity,
} from '@/domain/models/common';
import type { CrudRepository } from '@/infrastructure/repositories/contracts/CrudRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { updateStoredEntity } from '@/infrastructure/repositories/dexie/updateStoredEntity';
import { createEntity } from '@/shared/utils/entities';

export class DexieCrudRepository<T extends EntityMetadata> implements CrudRepository<T> {
  protected readonly table: Table<T, EntityId>;
  protected readonly entityLabel: string;

  constructor(table: Table<T, EntityId>, entityLabel: string) {
    this.table = table;
    this.entityLabel = entityLabel;
  }

  getById(id: EntityId): Promise<T | undefined> {
    return runRepositoryOperation(
      'read',
      `Impossible de lire ${this.entityLabel}.`,
      () => this.table.get(id),
    );
  }

  listAll(): Promise<T[]> {
    return runRepositoryOperation(
      'read',
      `Impossible de lister ${this.entityLabel}.`,
      () => this.table.toArray(),
    );
  }

  create(data: NewEntity<T>): Promise<T> {
    return runRepositoryOperation(
      'create',
      `Impossible de créer ${this.entityLabel}.`,
      async () => {
        const entity = createEntity<T>(data);
        await this.table.add(entity);
        return entity;
      },
    );
  }

  update(id: EntityId, changes: EntityChanges<T>): Promise<T> {
    return runRepositoryOperation(
      'update',
      `Impossible de modifier ${this.entityLabel}.`,
      async () => {
        const current = await this.table.get(id);

        if (!current) {
          throw new RepositoryError(`${this.entityLabel} introuvable.`, 'update');
        }

        return updateStoredEntity(this.table, current, changes);
      },
    );
  }

  delete(id: EntityId): Promise<void> {
    return runRepositoryOperation(
      'delete',
      `Impossible de supprimer ${this.entityLabel}.`,
      () => this.table.delete(id),
    );
  }
}
