import type Dexie from 'dexie';
import type { TrashItem } from '@/domain/models/trash';
import {
  createDeletedDeletionRecord,
  deletionTargetsForTrashItem,
  type DeletionRecord,
} from '@/domain/models/deletion';
import { createMigrationJournalEntry } from '@/infrastructure/database/migrationJournal';
import {
  DATABASE_VERSION_7,
  DATABASE_VERSION_8,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion8 } from '@/infrastructure/database/schema';

export function registerVersion8(database: Dexie): void {
  database
    .version(DATABASE_VERSION_8)
    .stores(schemaVersion8)
    .upgrade(async (transaction) => {
      const trashItems = await transaction
        .table<TrashItem, string>('trashItems')
        .toArray();
      const recordsById = new Map<string, DeletionRecord>();

      for (const trashItem of trashItems) {
        for (const target of deletionTargetsForTrashItem(trashItem)) {
          const candidate = createDeletedDeletionRecord(
            target,
            trashItem.deletedAt,
          );
          const current = recordsById.get(candidate.id);

          if (!current || candidate.updatedAt > current.updatedAt) {
            recordsById.set(candidate.id, candidate);
          }
        }
      }

      if (recordsById.size > 0) {
        await transaction
          .table('deletionRecords')
          .bulkPut([...recordsById.values()]);
      }

      await transaction.table('migrationJournal').put(
        createMigrationJournalEntry({
          version: DATABASE_VERSION_8,
          previousVersion: DATABASE_VERSION_7,
          source: 'migration',
          description:
            'Ajout des marqueurs de suppression synchronisables et reprise de la corbeille locale existante.',
        }),
      );
    });
}
