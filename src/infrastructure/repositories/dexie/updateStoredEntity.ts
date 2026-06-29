import type { Table } from 'dexie';

import { RepositoryError } from '@/domain/errors/RepositoryError';
import type {
  EntityChanges,
  EntityId,
  EntityMetadata,
  IsoDateTime,
} from '@/domain/models/common';
import { currentIsoDateTime } from '@/shared/utils/entities';

export async function updateStoredEntity<T extends EntityMetadata>(
  table: Table<T, EntityId>,
  current: T,
  changes: EntityChanges<T>,
  timestamp: IsoDateTime = currentIsoDateTime(),
): Promise<T> {
  const updatedCount = await table.update(
    current.id,
    {
      ...changes,
      updatedAt: timestamp,
    } as never,
  );

  if (updatedCount === 0) {
    throw new RepositoryError(
      'Entité introuvable pendant la mise à jour.',
      'update',
    );
  }

  const stored = await table.get(current.id);

  if (!stored) {
    throw new RepositoryError(
      'Entité introuvable après la mise à jour.',
      'update',
    );
  }

  return stored;
}
