import type { EntityChanges, EntityId, NewEntity } from '@/domain/models/common';
import type { WorkoutTemplate, WorkoutTemplateExercise } from '@/domain/models/strength';

export interface WorkoutTemplateDetails {
  template: WorkoutTemplate;
  exercises: WorkoutTemplateExercise[];
}

export interface WorkoutTemplateRepository {
  getById(id: EntityId): Promise<WorkoutTemplate | undefined>;
  listAll(): Promise<WorkoutTemplate[]>;
  listExercises(templateId: EntityId): Promise<WorkoutTemplateExercise[]>;
  createWithExercises(
    template: NewEntity<WorkoutTemplate>,
    exercises: Array<Omit<NewEntity<WorkoutTemplateExercise>, 'templateId'>>,
  ): Promise<WorkoutTemplateDetails>;
  updateWithExercises(
    id: EntityId,
    changes: EntityChanges<WorkoutTemplate>,
    exercises: Array<Omit<NewEntity<WorkoutTemplateExercise>, 'templateId'>>,
  ): Promise<WorkoutTemplateDetails>;
  update(id: EntityId, changes: EntityChanges<WorkoutTemplate>): Promise<WorkoutTemplate>;
}
