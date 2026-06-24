import type { Activity } from '@/domain/models/activity';
import type { EntityId, LocalDate, NewEntity } from '@/domain/models/common';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { createEntity, currentIsoDateTime } from '@/shared/utils/entities';

export class DexieActivityRepository implements ActivityRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getById(id: EntityId): Promise<Activity | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire cette activité.',
      () => this.database.activities.get(id),
    );
  }

  listByDate(date: LocalDate): Promise<Activity[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger les activités de cette journée.',
      () => this.database.activities.where('date').equals(date).sortBy('time'),
    );
  }

  listBetween(from: LocalDate, to: LocalDate): Promise<Activity[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger les activités sur cette période.',
      () => this.database.activities.where('date').between(from, to, true, true).sortBy('date'),
    );
  }

  create(data: NewEntity<Activity>): Promise<Activity> {
    return runRepositoryOperation(
      'create',
      'Impossible d’ajouter cette activité.',
      async () => {
        const activity = createEntity<Activity>(data);
        await this.database.activities.add(activity);
        return activity;
      },
    );
  }

  save(activity: Activity): Promise<Activity> {
    return runRepositoryOperation(
      'update',
      'Impossible de modifier cette activité.',
      async () => {
        const current = await this.database.activities.get(activity.id);
        const saved: Activity = {
          ...activity,
          createdAt: current?.createdAt ?? activity.createdAt,
          updatedAt: currentIsoDateTime(),
        };
        await this.database.activities.put(saved);
        return saved;
      },
    );
  }

  delete(id: EntityId): Promise<void> {
    return runRepositoryOperation(
      'delete',
      'Impossible de supprimer cette activité.',
      () => this.database.activities.delete(id),
    );
  }
}
