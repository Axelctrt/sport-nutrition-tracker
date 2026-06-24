import { appDatabase } from '@/infrastructure/database/database';
import { DexieActivityRepository } from '@/infrastructure/repositories/dexie/DexieActivityRepository';
import { DexieFoodRepository } from '@/infrastructure/repositories/dexie/DexieFoodRepository';
import { DexieProfileRepository } from '@/infrastructure/repositories/dexie/DexieProfileRepository';
import { DexieRecipeRepository } from '@/infrastructure/repositories/dexie/DexieRecipeRepository';
import { DexieSettingsRepository } from '@/infrastructure/repositories/dexie/DexieSettingsRepository';
import { DexieStrengthExerciseRepository } from '@/infrastructure/repositories/dexie/DexieStrengthExerciseRepository';
import { DexieStepsRepository } from '@/infrastructure/repositories/dexie/DexieStepsRepository';
import { DexieTargetRepository } from '@/infrastructure/repositories/dexie/DexieTargetRepository';
import { DexieWeeklyReviewRepository } from '@/infrastructure/repositories/dexie/DexieWeeklyReviewRepository';
import { DexieWorkoutTemplateRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutTemplateRepository';
import { DexieWeightRepository } from '@/infrastructure/repositories/dexie/DexieWeightRepository';

export const repositories = {
  profile: new DexieProfileRepository(appDatabase),
  settings: new DexieSettingsRepository(appDatabase),
  weight: new DexieWeightRepository(appDatabase),
  steps: new DexieStepsRepository(appDatabase),
  activities: new DexieActivityRepository(appDatabase),
  strengthExercises: new DexieStrengthExerciseRepository(appDatabase),
  workoutTemplates: new DexieWorkoutTemplateRepository(appDatabase),
  food: new DexieFoodRepository(appDatabase),
  recipes: new DexieRecipeRepository(appDatabase),
  targets: new DexieTargetRepository(appDatabase),
  weeklyReviews: new DexieWeeklyReviewRepository(appDatabase),
} as const;
