import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { DailyJournalStatus } from '@/domain/models/food';
import type { DailyTarget } from '@/domain/models/targets';
import {
  dailyJournalStatusIdForDate,
  dailyTargetIdForDate,
} from '@/domain/sync/deterministicEntityIds';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { TargetRepository } from '@/infrastructure/repositories/contracts/TargetRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { updateStoredEntity } from '@/infrastructure/repositories/dexie/updateStoredEntity';
import { createEntity } from '@/shared/utils/entities';

export class DexieTargetRepository implements TargetRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getTargetByDate(date: LocalDate): Promise<DailyTarget | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire l’objectif de cette journée.',
      () => this.database.dailyTargets.where('date').equals(date).first(),
    );
  }

  listTargetsBetween(from: LocalDate, to: LocalDate): Promise<DailyTarget[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger l’historique des objectifs quotidiens.',
      () => this.database.dailyTargets.where('date').between(from, to, true, true).sortBy('date'),
    );
  }

  upsertTarget(data: NewEntity<DailyTarget>): Promise<DailyTarget> {
    return runRepositoryOperation(
      'update',
      'Impossible d’enregistrer l’objectif quotidien.',
      async () => {
        const current = await this.database.dailyTargets.where('date').equals(data.date).first();
        if (current) {
          return updateStoredEntity(this.database.dailyTargets, current, data);
        }

        const target = createEntity<DailyTarget>(
          data,
          dailyTargetIdForDate(data.date),
        );
        await this.database.dailyTargets.add(target);
        return target;
      },
    );
  }

  getJournalStatus(date: LocalDate): Promise<DailyJournalStatus | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire l’état du journal alimentaire.',
      () => this.database.dailyJournalStatuses.where('date').equals(date).first(),
    );
  }

  upsertJournalStatus(data: NewEntity<DailyJournalStatus>): Promise<DailyJournalStatus> {
    return runRepositoryOperation(
      'update',
      'Impossible de modifier l’état du journal alimentaire.',
      async () => {
        const current = await this.database.dailyJournalStatuses
          .where('date')
          .equals(data.date)
          .first();
        if (current) {
          return updateStoredEntity(
            this.database.dailyJournalStatuses,
            current,
            data,
          );
        }

        const status = createEntity<DailyJournalStatus>(
          data,
          dailyJournalStatusIdForDate(data.date),
        );
        await this.database.dailyJournalStatuses.add(status);
        return status;
      },
    );
  }
}
