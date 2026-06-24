import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityChanges, EntityId, NewEntity } from '@/domain/models/common';
import type { WorkoutTemplate, WorkoutTemplateExercise } from '@/domain/models/strength';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type {
  WorkoutTemplateDetails,
  WorkoutTemplateRepository,
} from '@/infrastructure/repositories/contracts/WorkoutTemplateRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { createEntity, updateEntity } from '@/shared/utils/entities';

export class DexieWorkoutTemplateRepository implements WorkoutTemplateRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  getById(id: EntityId): Promise<WorkoutTemplate | undefined> {
    return runRepositoryOperation('read', 'Impossible de lire cette séance modèle.', () => this.database.workoutTemplates.get(id));
  }

  listAll(): Promise<WorkoutTemplate[]> {
    return runRepositoryOperation('read', 'Impossible de lister les séances modèles.', () => this.database.workoutTemplates.toArray());
  }

  listExercises(templateId: EntityId): Promise<WorkoutTemplateExercise[]> {
    return runRepositoryOperation('read', 'Impossible de lire les exercices de cette séance.', async () => {
      const exercises = await this.database.workoutTemplateExercises.where('templateId').equals(templateId).toArray();
      return exercises.sort((left, right) => left.sortOrder - right.sortOrder);
    });
  }

  createWithExercises(
    templateInput: NewEntity<WorkoutTemplate>,
    exerciseInputs: Array<Omit<NewEntity<WorkoutTemplateExercise>, 'templateId'>>,
  ): Promise<WorkoutTemplateDetails> {
    return runRepositoryOperation('create', 'Impossible de créer cette séance modèle.', () => this.database.transaction(
      'rw',
      this.database.workoutTemplates,
      this.database.workoutTemplateExercises,
      async () => {
        const template = createEntity<WorkoutTemplate>(templateInput);
        const exercises = exerciseInputs.map((exercise) => createEntity<WorkoutTemplateExercise>({
          ...exercise,
          templateId: template.id,
        }));
        await this.database.workoutTemplates.add(template);
        if (exercises.length > 0) await this.database.workoutTemplateExercises.bulkAdd(exercises);
        return { template, exercises };
      },
    ));
  }

  updateWithExercises(
    id: EntityId,
    changes: EntityChanges<WorkoutTemplate>,
    exerciseInputs: Array<Omit<NewEntity<WorkoutTemplateExercise>, 'templateId'>>,
  ): Promise<WorkoutTemplateDetails> {
    return runRepositoryOperation('update', 'Impossible de modifier cette séance modèle.', () => this.database.transaction(
      'rw',
      this.database.workoutTemplates,
      this.database.workoutTemplateExercises,
      async () => {
        const current = await this.database.workoutTemplates.get(id);
        if (!current) throw new RepositoryError('Séance modèle introuvable.', 'update');
        const template = updateEntity(current, changes);
        const existingExercises = await this.database.workoutTemplateExercises.where('templateId').equals(id).toArray();
        const existingByDefinition = new Map(existingExercises.map((exercise) => [exercise.exerciseDefinitionId, exercise]));
        const exercises = exerciseInputs.map((exercise) => {
          const existing = existingByDefinition.get(exercise.exerciseDefinitionId);
          return existing
            ? updateEntity(existing, exercise)
            : createEntity<WorkoutTemplateExercise>({ ...exercise, templateId: id });
        });
        const retainedIds = new Set(exercises.map((exercise) => exercise.id));
        const removedIds = existingExercises.filter((exercise) => !retainedIds.has(exercise.id)).map((exercise) => exercise.id);
        await this.database.workoutTemplates.put(template);
        if (exercises.length > 0) await this.database.workoutTemplateExercises.bulkPut(exercises);
        if (removedIds.length > 0) await this.database.workoutTemplateExercises.bulkDelete(removedIds);
        return { template, exercises };
      },
    ));
  }

  update(id: EntityId, changes: EntityChanges<WorkoutTemplate>): Promise<WorkoutTemplate> {
    return runRepositoryOperation('update', 'Impossible de modifier cette séance modèle.', async () => {
      const current = await this.database.workoutTemplates.get(id);
      if (!current) throw new RepositoryError('Séance modèle introuvable.', 'update');
      const updated = updateEntity(current, changes);
      await this.database.workoutTemplates.put(updated);
      return updated;
    });
  }
}
