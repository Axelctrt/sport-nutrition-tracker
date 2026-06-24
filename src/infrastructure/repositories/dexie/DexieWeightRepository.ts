import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { createEntity, updateEntity } from '@/shared/utils/entities';

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
        const entry = current ? updateEntity(current, data) : createEntity<WeightEntry>(data);
        await this.database.weights.put(entry);
        return entry;
      },
    );
  }

  deleteByDate(date: LocalDate): Promise<void> {
    return runRepositoryOperation(
      'delete',
      'Impossible de supprimer la pesée.',
      async () => {
        await this.database.weights.where('date').equals(date).delete();
      },
    );
  }
}
