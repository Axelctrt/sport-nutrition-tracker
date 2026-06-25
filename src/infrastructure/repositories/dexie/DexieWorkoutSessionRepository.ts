import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityChanges, EntityId, NewEntity } from '@/domain/models/common';
import type { WorkoutSession, WorkoutSessionExercise } from '@/domain/models/strength';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type {
  WorkoutSessionDetails,
  WorkoutSessionRepository,
} from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { createEntity, updateEntity } from '@/shared/utils/entities';

export class DexieWorkoutSessionRepository implements WorkoutSessionRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getById(id: EntityId): Promise<WorkoutSession | undefined> {
    return runRepositoryOperation('read', 'Impossible de lire cette séance.', () => this.database.workoutSessions.get(id));
  }

  listAll(): Promise<WorkoutSession[]> {
    return runRepositoryOperation('read', 'Impossible de lister les séances.', () => this.database.workoutSessions.toArray());
  }

  getInProgress(): Promise<WorkoutSession | undefined> {
    return runRepositoryOperation('read', 'Impossible de rechercher la séance en cours.', async () => {
      const sessions = await this.database.workoutSessions.where('status').equals('inProgress').toArray();
      return sessions.sort((left, right) => (right.startedAt ?? '').localeCompare(left.startedAt ?? ''))[0];
    });
  }

  listExercises(sessionId: EntityId): Promise<WorkoutSessionExercise[]> {
    return runRepositoryOperation('read', 'Impossible de lire les exercices de cette séance.', async () => {
      const exercises = await this.database.workoutSessionExercises.where('sessionId').equals(sessionId).toArray();
      return exercises.sort((left, right) => left.sortOrder - right.sortOrder);
    });
  }

  createWithExercises(
    sessionInput: NewEntity<WorkoutSession>,
    exerciseInputs: Array<Omit<NewEntity<WorkoutSessionExercise>, 'sessionId'>>,
  ): Promise<WorkoutSessionDetails> {
    return runRepositoryOperation('create', 'Impossible de démarrer cette séance.', () => this.database.transaction(
      'rw',
      this.database.workoutSessions,
      this.database.workoutSessionExercises,
      async () => {
        const session = createEntity<WorkoutSession>(sessionInput);
        const exercises = exerciseInputs.map((exercise) => createEntity<WorkoutSessionExercise>({
          ...exercise,
          sessionId: session.id,
        }));
        await this.database.workoutSessions.add(session);
        if (exercises.length > 0) await this.database.workoutSessionExercises.bulkAdd(exercises);
        return { session, exercises };
      },
    ));
  }

  update(id: EntityId, changes: EntityChanges<WorkoutSession>): Promise<WorkoutSession> {
    return runRepositoryOperation('update', 'Impossible de modifier cette séance.', async () => {
      const current = await this.database.workoutSessions.get(id);
      if (!current) throw new RepositoryError('Séance introuvable.', 'update');
      const updated = updateEntity(current, changes);
      await this.database.workoutSessions.put(updated);
      return updated;
    });
  }

  addExercise(
    sessionId: EntityId,
    exerciseInput: Omit<NewEntity<WorkoutSessionExercise>, 'sessionId'>,
  ): Promise<WorkoutSessionExercise> {
    return runRepositoryOperation('create', 'Impossible d’ajouter cet exercice à la séance.', async () => {
      const session = await this.database.workoutSessions.get(sessionId);
      if (!session) throw new RepositoryError('Séance introuvable.', 'create');
      const exercise = createEntity<WorkoutSessionExercise>({ ...exerciseInput, sessionId });
      await this.database.workoutSessionExercises.add(exercise);
      return exercise;
    });
  }

  replaceExercises(sessionId: EntityId, exercises: WorkoutSessionExercise[]): Promise<WorkoutSessionExercise[]> {
    return runRepositoryOperation('update', 'Impossible de réordonner les exercices.', async () => {
      const session = await this.database.workoutSessions.get(sessionId);
      if (!session) throw new RepositoryError('Séance introuvable.', 'update');
      const updated = exercises.map((exercise, sortOrder) => updateEntity(exercise, { sortOrder }));
      if (updated.length > 0) await this.database.workoutSessionExercises.bulkPut(updated);
      return updated;
    });
  }

  removeExercise(sessionId: EntityId, sessionExerciseId: EntityId): Promise<void> {
    return runRepositoryOperation('delete', 'Impossible de retirer cet exercice.', () => this.database.transaction(
      'rw',
      this.database.workoutSessionExercises,
      this.database.strengthSets,
      async () => {
        const exercise = await this.database.workoutSessionExercises.get(sessionExerciseId);
        if (!exercise || exercise.sessionId !== sessionId) {
          throw new RepositoryError('Exercice de séance introuvable.', 'delete');
        }
        const setIds = (await this.database.strengthSets.where('sessionExerciseId').equals(sessionExerciseId).toArray())
          .map((set) => set.id);
        if (setIds.length > 0) await this.database.strengthSets.bulkDelete(setIds);
        await this.database.workoutSessionExercises.delete(sessionExerciseId);
      },
    ));
  }
}
