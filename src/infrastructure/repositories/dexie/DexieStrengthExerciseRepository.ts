import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { StrengthExerciseRepository } from '@/infrastructure/repositories/contracts/StrengthExerciseRepository';
import { DexieCrudRepository } from '@/infrastructure/repositories/dexie/DexieCrudRepository';
import type { ExerciseDefinition } from '@/domain/models/strength';

export class DexieStrengthExerciseRepository
  extends DexieCrudRepository<ExerciseDefinition>
  implements StrengthExerciseRepository {
  constructor(database: AppDatabase) {
    super(database.exerciseDefinitions, 'cet exercice');
  }
}
