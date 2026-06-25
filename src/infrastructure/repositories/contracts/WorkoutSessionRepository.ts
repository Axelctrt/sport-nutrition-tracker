import type { EntityChanges, EntityId, NewEntity } from '@/domain/models/common';
import type { WorkoutSession, WorkoutSessionExercise } from '@/domain/models/strength';

export interface WorkoutSessionDetails {
  session: WorkoutSession;
  exercises: WorkoutSessionExercise[];
}

export interface WorkoutSessionRepository {
  getById(id: EntityId): Promise<WorkoutSession | undefined>;
  listAll(): Promise<WorkoutSession[]>;
  getInProgress(): Promise<WorkoutSession | undefined>;
  listExercises(sessionId: EntityId): Promise<WorkoutSessionExercise[]>;
  createWithExercises(
    session: NewEntity<WorkoutSession>,
    exercises: Array<Omit<NewEntity<WorkoutSessionExercise>, 'sessionId'>>,
  ): Promise<WorkoutSessionDetails>;
  update(id: EntityId, changes: EntityChanges<WorkoutSession>): Promise<WorkoutSession>;
  addExercise(
    sessionId: EntityId,
    exercise: Omit<NewEntity<WorkoutSessionExercise>, 'sessionId'>,
  ): Promise<WorkoutSessionExercise>;
  replaceExercises(sessionId: EntityId, exercises: WorkoutSessionExercise[]): Promise<WorkoutSessionExercise[]>;
  removeExercise(sessionId: EntityId, sessionExerciseId: EntityId): Promise<void>;
}
