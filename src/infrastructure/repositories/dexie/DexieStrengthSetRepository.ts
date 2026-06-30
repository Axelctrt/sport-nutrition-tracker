import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityId, NewEntity } from '@/domain/models/common';
import type { StrengthSet } from '@/domain/models/strength';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { StrengthSetRepository, StrengthSetUpdate } from '@/infrastructure/repositories/contracts/StrengthSetRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { updateStoredEntity } from '@/infrastructure/repositories/dexie/updateStoredEntity';
import { moveStrengthSetToTrash } from '@/infrastructure/repositories/dexie/trashService';
import { createEntity } from '@/shared/utils/entities';

function sortSets(sets: StrengthSet[]): StrengthSet[] {
  return sets.sort((left, right) => left.setNumber - right.setNumber);
}

export class DexieStrengthSetRepository implements StrengthSetRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getById(id: EntityId): Promise<StrengthSet | undefined> {
    return runRepositoryOperation('read', 'Impossible de lire cette série.', () => this.database.strengthSets.get(id));
  }

  listBySession(sessionId: EntityId): Promise<StrengthSet[]> {
    return runRepositoryOperation('read', 'Impossible de lire les séries de cette séance.', async () => {
      const sets = await this.database.strengthSets.where('sessionId').equals(sessionId).toArray();
      return sets.sort((left, right) => {
        const exerciseComparison = left.sessionExerciseId.localeCompare(right.sessionExerciseId);
        return exerciseComparison === 0 ? left.setNumber - right.setNumber : exerciseComparison;
      });
    });
  }

  listBySessionExercise(sessionExerciseId: EntityId): Promise<StrengthSet[]> {
    return runRepositoryOperation('read', 'Impossible de lire les séries de cet exercice.', async () => {
      const sets = await this.database.strengthSets.where('sessionExerciseId').equals(sessionExerciseId).toArray();
      return sortSets(sets);
    });
  }

  create(input: NewEntity<StrengthSet>): Promise<StrengthSet> {
    return runRepositoryOperation('create', 'Impossible d’ajouter cette série.', async () => {
      const set = createEntity<StrengthSet>(input);
      await this.database.strengthSets.add(set);
      return set;
    });
  }

  createMany(inputs: Array<NewEntity<StrengthSet>>): Promise<StrengthSet[]> {
    return runRepositoryOperation('create', 'Impossible de reprendre les séries précédentes.', async () => {
      const sets = inputs.map((input) => createEntity<StrengthSet>(input));
      if (sets.length > 0) await this.database.strengthSets.bulkAdd(sets);
      return sortSets(sets);
    });
  }

  update(id: EntityId, changes: StrengthSetUpdate): Promise<StrengthSet> {
    return runRepositoryOperation('update', 'Impossible de modifier cette série.', async () => {
      const current = await this.database.strengthSets.get(id);
      if (!current) throw new RepositoryError('Série introuvable.', 'update');
      return updateStoredEntity(
        this.database.strengthSets,
        current,
        changes as never,
      );
    });
  }

  deleteAndRenumber(
    sessionExerciseId: EntityId,
    id: EntityId,
  ): Promise<StrengthSet[]> {
    return runRepositoryOperation(
      'delete',
      'Impossible de supprimer cette série.',
      async () => {
        await moveStrengthSetToTrash(
          this.database,
          sessionExerciseId,
          id,
        );

        const remaining = await this.database.strengthSets
          .where('sessionExerciseId')
          .equals(sessionExerciseId)
          .toArray();

        return sortSets(remaining);
      },
    );
  }
}
