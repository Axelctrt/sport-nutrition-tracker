import { exerciseCatalog } from '@/domain/defaults/exerciseCatalog';
import type { ExerciseDefinition } from '@/domain/models/strength';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { currentIsoDateTime } from '@/shared/utils/entities';

export async function ensureExerciseCatalog(
  database: AppDatabase,
  timestamp: string = currentIsoDateTime(),
): Promise<number> {
  const existingIds = new Set(
    (await database.exerciseDefinitions.bulkGet(exerciseCatalog.map((exercise) => exercise.id)))
      .filter((exercise): exercise is ExerciseDefinition => exercise !== undefined)
      .map((exercise) => exercise.id),
  );

  const missingExercises = exerciseCatalog
    .filter((exercise) => !existingIds.has(exercise.id))
    .map<ExerciseDefinition>((exercise) => ({
      ...exercise,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

  if (missingExercises.length > 0) {
    await database.exerciseDefinitions.bulkAdd(missingExercises);
  }

  return missingExercises.length;
}
