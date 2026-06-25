import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityId, NewEntity } from '@/domain/models/common';
import type { ProgressionSuggestion } from '@/domain/models/strength';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type {
  ProgressionSuggestionRepository,
  ProgressionSuggestionUpdate,
} from '@/infrastructure/repositories/contracts/ProgressionSuggestionRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { createEntity, updateEntity } from '@/shared/utils/entities';

export class DexieProgressionSuggestionRepository implements ProgressionSuggestionRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getById(id: EntityId): Promise<ProgressionSuggestion | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire cette suggestion de progression.',
      () => this.database.progressionSuggestions.get(id),
    );
  }

  listBySession(sessionId: EntityId): Promise<ProgressionSuggestion[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire les suggestions de cette séance.',
      async () => {
        const suggestions = await this.database.progressionSuggestions
          .where('sessionId')
          .equals(sessionId)
          .toArray();
        return suggestions.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      },
    );
  }

  createMany(inputs: Array<NewEntity<ProgressionSuggestion>>): Promise<ProgressionSuggestion[]> {
    return runRepositoryOperation(
      'create',
      'Impossible de créer les suggestions de progression.',
      async () => {
        const suggestions = inputs.map((input) => createEntity<ProgressionSuggestion>(input));
        if (suggestions.length > 0) {
          await this.database.progressionSuggestions.bulkAdd(suggestions);
        }
        return suggestions;
      },
    );
  }

  update(id: EntityId, changes: ProgressionSuggestionUpdate): Promise<ProgressionSuggestion> {
    return runRepositoryOperation(
      'update',
      'Impossible de modifier cette suggestion de progression.',
      async () => {
        const current = await this.database.progressionSuggestions.get(id);
        if (!current) {
          throw new RepositoryError('Suggestion de progression introuvable.', 'update');
        }
        const updated = updateEntity(current, changes as never);
        if ('decidedAt' in changes && changes.decidedAt === undefined) delete updated.decidedAt;
        if ('appliedAt' in changes && changes.appliedAt === undefined) delete updated.appliedAt;
        await this.database.progressionSuggestions.put(updated);
        return updated;
      },
    );
  }
}
