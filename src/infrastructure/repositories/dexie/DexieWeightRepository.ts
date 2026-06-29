import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';
import { weightEntryIdForDate } from '@/domain/sync/deterministicEntityIds';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { updateStoredEntity } from '@/infrastructure/repositories/dexie/updateStoredEntity';
import { moveWeightToTrash } from '@/infrastructure/repositories/dexie/trashService';
import { createEntity } from '@/shared/utils/entities';

export class DexieWeightRepository implements WeightRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getByDate(date: LocalDate): Promise<WeightEntry | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire la pesée demandée.',
      () => this.database.weights.where('date').equals(date).first(),
    );
  }

  getLatestOnOrBefore(date: LocalDate): Promise<WeightEntry | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de déterminer la dernière pesée.',
      () => this.database.weights.where('date').belowOrEqual(date).last(),
    );
  }

  listAll(): Promise<WeightEntry[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger l’historique du poids.',
      () => this.database.weights.orderBy('date').toArray(),
    );
  }

  listBetween(from: LocalDate, to: LocalDate): Promise<WeightEntry[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger les pesées sur cette période.',
      () => this.database.weights.where('date').between(from, to, true, true).toArray(),
    );
  }

  upsert(data: NewEntity<WeightEntry>): Promise<WeightEntry> {
    return runRepositoryOperation(
      'update',
      'Impossible d’enregistrer la pesée.',
      async () => {
        const current = await this.database.weights.where('date').equals(data.date).first();
        if (current) {
          return updateStoredEntity(this.database.weights, current, data);
        }

        const entry = createEntity<WeightEntry>(data, weightEntryIdForDate(data.date));
        await this.database.weights.add(entry);
        return entry;
      },
    );
  }

  deleteByDate(date: LocalDate): Promise<void> {
    return runRepositoryOperation(
      'delete',
      'Impossible de supprimer la pesée.',
      async () => {
        await moveWeightToTrash(this.database, date);
      },
    );
  }
}
