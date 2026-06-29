import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { DailySteps } from '@/domain/models/steps';
import { dailyStepsIdForDate } from '@/domain/sync/deterministicEntityIds';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { StepsRepository } from '@/infrastructure/repositories/contracts/StepsRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { updateStoredEntity } from '@/infrastructure/repositories/dexie/updateStoredEntity';
import { createEntity } from '@/shared/utils/entities';

export class DexieStepsRepository implements StepsRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getByDate(date: LocalDate): Promise<DailySteps | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire les pas de cette journée.',
      () => this.database.dailySteps.where('date').equals(date).first(),
    );
  }

  listBetween(from: LocalDate, to: LocalDate): Promise<DailySteps[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger les pas sur cette période.',
      () => this.database.dailySteps.where('date').between(from, to, true, true).toArray(),
    );
  }

  upsert(data: NewEntity<DailySteps>): Promise<DailySteps> {
    return runRepositoryOperation(
      'update',
      'Impossible d’enregistrer les pas.',
      async () => {
        const current = await this.database.dailySteps.where('date').equals(data.date).first();
        if (current) {
          return updateStoredEntity(this.database.dailySteps, current, data);
        }

        const entry = createEntity<DailySteps>(data, dailyStepsIdForDate(data.date));
        await this.database.dailySteps.add(entry);
        return entry;
      },
    );
  }

  deleteByDate(date: LocalDate): Promise<void> {
    return runRepositoryOperation(
      'delete',
      'Impossible de supprimer les pas.',
      async () => {
        await this.database.dailySteps.where('date').equals(date).delete();
      },
    );
  }
}
