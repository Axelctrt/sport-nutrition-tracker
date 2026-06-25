import type { Activity } from '@/domain/models/activity';
import type { IsoDateTime } from '@/domain/models/common';
import type {
  DailyJournalStatus,
  FavoriteMeal,
  FoodEntry,
  FoodProduct,
  Meal,
} from '@/domain/models/food';
import type { UserProfile } from '@/domain/models/profile';
import type { Recipe, RecipeIngredient } from '@/domain/models/recipe';
import type { AppSettings } from '@/domain/models/settings';
import type { DailySteps } from '@/domain/models/steps';
import type {
  ExerciseDefinition,
  ProgressionSuggestion,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from '@/domain/models/strength';
import type { DailyTarget } from '@/domain/models/targets';
import type { AcceptedCalorieAdjustment, WeeklyReview } from '@/domain/models/weeklyReview';
import type { WeightEntry } from '@/domain/models/weight';

export interface BackupData {
  userProfile: UserProfile[];
  appSettings: AppSettings[];
  weights: WeightEntry[];
  dailySteps: DailySteps[];
  activities: Activity[];
  foodProducts: FoodProduct[];
  meals: Meal[];
  foodEntries: FoodEntry[];
  favoriteMeals: FavoriteMeal[];
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  dailyTargets: DailyTarget[];
  dailyJournalStatuses: DailyJournalStatus[];
  weeklyReviews: WeeklyReview[];
  acceptedCalorieAdjustments: AcceptedCalorieAdjustment[];
  exerciseDefinitions: ExerciseDefinition[];
  workoutTemplates: WorkoutTemplate[];
  workoutTemplateExercises: WorkoutTemplateExercise[];
  workoutSessions: WorkoutSession[];
  workoutSessionExercises: WorkoutSessionExercise[];
  strengthSets: StrengthSet[];
  progressionSuggestions: ProgressionSuggestion[];
}

export interface BackupEnvelope {
  format: 'sportpilot-backup';
  schemaVersion: number;
  exportedAt: IsoDateTime;
  data: BackupData;
}
