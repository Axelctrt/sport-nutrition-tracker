import type {
  DatedEntity,
  EntityId,
  LocalDate,
  NewEntity,
} from '@/domain/models/common';
import type { Table } from 'dexie';
import type {
  DailyActivityDecision,
  DailyCheckIn,
  DailyCheckOut,
} from '@/domain/models/dailyCoaching';
import {
  dailyActivityDecisionIdForDate,
  dailyCheckInIdForDate,
  dailyCheckOutIdForDate,
} from '@/domain/sync/deterministicEntityIds';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { DailyCoachingRepository } from '@/infrastructure/repositories/contracts/DailyCoachingRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { createEntity, currentIsoDateTime } from '@/shared/utils/entities';

const syncOptions = {
  syncDomainIds: ['daily-coaching'] as const,
  syncReason: 'daily-coaching-write',
};

async function replaceDailyEntity<T extends DatedEntity>(
  table: Table<T, EntityId>,
  current: T,
  data: NewEntity<T>,
): Promise<T> {
  const updated = {
    ...data,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: currentIsoDateTime(),
  } as T;
  await table.put(updated);
  return updated;
}

export class DexieDailyCoachingRepository implements DailyCoachingRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getCheckIn(date: LocalDate): Promise<DailyCheckIn | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire le check-in de cette journée.',
      () => this.database.dailyCheckIns.where('date').equals(date).first(),
    );
  }

  getActivityDecision(
    date: LocalDate,
  ): Promise<DailyActivityDecision | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire la décision sportive de cette journée.',
      () => this.database.dailyActivityDecisions.where('date').equals(date).first(),
    );
  }

  getCheckOut(date: LocalDate): Promise<DailyCheckOut | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire le check-out de cette journée.',
      () => this.database.dailyCheckOuts.where('date').equals(date).first(),
    );
  }

  upsertCheckIn(data: NewEntity<DailyCheckIn>): Promise<DailyCheckIn> {
    return runRepositoryOperation(
      'update',
      'Impossible d’enregistrer le check-in.',
      async () => {
        const current = await this.database.dailyCheckIns
          .where('date')
          .equals(data.date)
          .first();
        if (current) {
          return replaceDailyEntity(this.database.dailyCheckIns, current, data);
        }

        const checkIn = createEntity<DailyCheckIn>(
          data,
          dailyCheckInIdForDate(data.date),
        );
        await this.database.dailyCheckIns.add(checkIn);
        return checkIn;
      },
      syncOptions,
    );
  }

  upsertActivityDecision(
    data: NewEntity<DailyActivityDecision>,
  ): Promise<DailyActivityDecision> {
    return runRepositoryOperation(
      'update',
      'Impossible d’enregistrer la décision sportive.',
      async () => {
        const current = await this.database.dailyActivityDecisions
          .where('date')
          .equals(data.date)
          .first();
        if (current) {
          return replaceDailyEntity(
            this.database.dailyActivityDecisions,
            current,
            data,
          );
        }

        const decision = createEntity<DailyActivityDecision>(
          data,
          dailyActivityDecisionIdForDate(data.date),
        );
        await this.database.dailyActivityDecisions.add(decision);
        return decision;
      },
      syncOptions,
    );
  }

  upsertCheckOut(data: NewEntity<DailyCheckOut>): Promise<DailyCheckOut> {
    return runRepositoryOperation(
      'update',
      'Impossible d’enregistrer le check-out.',
      async () => {
        const current = await this.database.dailyCheckOuts
          .where('date')
          .equals(data.date)
          .first();
        if (current) {
          return replaceDailyEntity(this.database.dailyCheckOuts, current, data);
        }

        const checkOut = createEntity<DailyCheckOut>(
          data,
          dailyCheckOutIdForDate(data.date),
        );
        await this.database.dailyCheckOuts.add(checkOut);
        return checkOut;
      },
      syncOptions,
    );
  }
}
