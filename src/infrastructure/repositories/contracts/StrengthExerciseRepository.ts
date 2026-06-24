import type { EntityChanges, EntityId, NewEntity } from '@/domain/models/common';
import type { ExerciseDefinition } from '@/domain/models/strength';

export interface StrengthExerciseRepository {
  getById(id: EntityId): Promise<ExerciseDefinition | undefined>;
  listAll(): Promise<ExerciseDefinition[]>;
  create(data: NewEntity<ExerciseDefinition>): Promise<ExerciseDefinition>;
  update(id: EntityId, changes: EntityChanges<ExerciseDefinition>): Promise<ExerciseDefinition>;
}
