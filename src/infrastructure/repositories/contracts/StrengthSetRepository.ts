import type { EntityId, NewEntity } from '@/domain/models/common';
import type { StrengthSet, StrengthSetType } from '@/domain/models/strength';

export interface StrengthSetUpdate {
  repetitions?: number;
  weightKg?: number;
  rpe?: number | undefined;
  type?: StrengthSetType;
  isCompleted?: boolean;
  completedAt?: string | undefined;
  notes?: string | undefined;
}

export interface StrengthSetRepository {
  getById(id: EntityId): Promise<StrengthSet | undefined>;
  listBySession(sessionId: EntityId): Promise<StrengthSet[]>;
  listBySessionExercise(sessionExerciseId: EntityId): Promise<StrengthSet[]>;
  create(set: NewEntity<StrengthSet>): Promise<StrengthSet>;
  createMany(sets: Array<NewEntity<StrengthSet>>): Promise<StrengthSet[]>;
  update(id: EntityId, changes: StrengthSetUpdate): Promise<StrengthSet>;
  deleteAndRenumber(sessionExerciseId: EntityId, id: EntityId): Promise<StrengthSet[]>;
}
