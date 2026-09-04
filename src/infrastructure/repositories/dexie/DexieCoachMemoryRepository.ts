import {
  coachDecisionMemoryIdForReview,
  type CoachDecisionMemoryRecord,
} from '@/domain/coach/coachMemory';
import type { EntityId, NewEntity } from '@/domain/models/common';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { CoachMemoryRepository } from '@/infrastructure/repositories/contracts/CoachMemoryRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { createEntity } from '@/shared/utils/entities';

export class DexieCoachMemoryRepository implements CoachMemoryRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getByWeeklyReviewId(
    weeklyReviewId: EntityId,
  ): Promise<CoachDecisionMemoryRecord | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire cette décision Coach.',
      () => this.database.coachDecisionMemories
        .where('weeklyReviewId')
        .equals(weeklyReviewId)
        .first(),
    );
  }

  listAll(): Promise<CoachDecisionMemoryRecord[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger l’historique du Coach.',
      () => this.database.coachDecisionMemories
        .orderBy('decisionDate')
        .reverse()
        .toArray(),
    );
  }

  putIfAbsent(
    data: NewEntity<CoachDecisionMemoryRecord>,
  ): Promise<CoachDecisionMemoryRecord> {
    return runRepositoryOperation(
      'create',
      'Impossible d’enregistrer la décision du Coach.',
      () => this.database.transaction(
        'rw',
        this.database.coachDecisionMemories,
        async () => {
          const id = coachDecisionMemoryIdForReview(data.weeklyReviewId);
          const current = await this.database.coachDecisionMemories.get(id);
          if (current) return current;
          const record = createEntity<CoachDecisionMemoryRecord>(
            data,
            id,
            data.decidedAt,
          );
          await this.database.coachDecisionMemories.add(record);
          return record;
        },
      ),
      {
        syncDomainIds: ['nutrition-tracking'],
        syncReason: 'coach-memory-write',
      },
    );
  }
}
