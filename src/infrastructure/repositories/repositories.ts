import { appDatabase } from '@/infrastructure/database/database';
import { DexieActivityRepository } from '@/infrastructure/repositories/dexie/DexieActivityRepository';
import { DexieDailyCoachingRepository } from '@/infrastructure/repositories/dexie/DexieDailyCoachingRepository';
import { DexieCoachMemoryRepository } from '@/infrastructure/repositories/dexie/DexieCoachMemoryRepository';
import { DexieFoodRepository } from '@/infrastructure/repositories/dexie/DexieFoodRepository';
import { DexieProgressPhotoRepository } from '@/infrastructure/repositories/dexie/DexieProgressPhotoRepository';
import { DexieProgressionSuggestionRepository } from '@/infrastructure/repositories/dexie/DexieProgressionSuggestionRepository';
import { DexieProfileRepository } from '@/infrastructure/repositories/dexie/DexieProfileRepository';
import { DexieRecipeRepository } from '@/infrastructure/repositories/dexie/DexieRecipeRepository';
import { DexieSettingsRepository } from '@/infrastructure/repositories/dexie/DexieSettingsRepository';
import { DexieStrengthExerciseRepository } from '@/infrastructure/repositories/dexie/DexieStrengthExerciseRepository';
import { DexieStrengthSetRepository } from '@/infrastructure/repositories/dexie/DexieStrengthSetRepository';
import { DexieStepsRepository } from '@/infrastructure/repositories/dexie/DexieStepsRepository';
import { DexieTargetRepository } from '@/infrastructure/repositories/dexie/DexieTargetRepository';
import { DexieWeeklyReviewRepository } from '@/infrastructure/repositories/dexie/DexieWeeklyReviewRepository';
import { DexieWorkoutTemplateRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutTemplateRepository';
import { DexieWorkoutSessionRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutSessionRepository';
import { DexieWeightRepository } from '@/infrastructure/repositories/dexie/DexieWeightRepository';

export const repositories = {
  profile: new DexieProfileRepository(appDatabase),
  settings: new DexieSettingsRepository(appDatabase),
  weight: new DexieWeightRepository(appDatabase),
  progressPhotos: new DexieProgressPhotoRepository(appDatabase),
  steps: new DexieStepsRepository(appDatabase),
  dailyCoaching: new DexieDailyCoachingRepository(appDatabase),
  coachMemory: new DexieCoachMemoryRepository(appDatabase),
  activities: new DexieActivityRepository(appDatabase),
  strengthExercises: new DexieStrengthExerciseRepository(appDatabase),
  strengthSets: new DexieStrengthSetRepository(appDatabase),
  progressionSuggestions: new DexieProgressionSuggestionRepository(appDatabase),
  workoutTemplates: new DexieWorkoutTemplateRepository(appDatabase),
  workoutSessions: new DexieWorkoutSessionRepository(appDatabase),
  food: new DexieFoodRepository(appDatabase),
  recipes: new DexieRecipeRepository(appDatabase),
  targets: new DexieTargetRepository(appDatabase),
  weeklyReviews: new DexieWeeklyReviewRepository(appDatabase),
} as const;
