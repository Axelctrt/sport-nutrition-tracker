import Dexie, { type Table } from "dexie";

import type { Activity } from "@/domain/models/activity";
import type { EntityId } from "@/domain/models/common";
import type {
  DailyJournalStatus,
  FavoriteMeal,
  FoodEntry,
  FoodProduct,
  Meal,
} from "@/domain/models/food";
import type { UserProfile } from "@/domain/models/profile";
import type { Recipe, RecipeIngredient } from "@/domain/models/recipe";
import type { AppSettings } from "@/domain/models/settings";
import type {
  ExerciseDefinition,
  ProgressionSuggestion,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from "@/domain/models/strength";
import type { DailySteps } from "@/domain/models/steps";
import type { DailyTarget } from "@/domain/models/targets";
import type {
  AcceptedCalorieAdjustment,
  WeeklyReview,
} from "@/domain/models/weeklyReview";
import type { WeightEntry } from "@/domain/models/weight";
import type { TrashItem } from '@/domain/models/trash';
import type { DatabaseIntegrityReport } from "@/infrastructure/database/databaseIntegrityModels";
import type { MigrationJournalEntry } from "@/infrastructure/database/migrationJournal";
import { registerVersion1 } from "@/infrastructure/database/migrations/version1";
import { registerVersion2 } from "@/infrastructure/database/migrations/version2";
import { registerVersion3 } from "@/infrastructure/database/migrations/version3";
import { registerVersion4 } from '@/infrastructure/database/migrations/version4';

export const DEFAULT_DATABASE_NAME = "sportpilot-local-database";

export class AppDatabase extends Dexie {
  declare userProfile: Table<UserProfile, EntityId>;
  declare appSettings: Table<AppSettings, EntityId>;
  declare weights: Table<WeightEntry, EntityId>;
  declare dailySteps: Table<DailySteps, EntityId>;
  declare activities: Table<Activity, EntityId>;
  declare foodProducts: Table<FoodProduct, EntityId>;
  declare meals: Table<Meal, EntityId>;
  declare foodEntries: Table<FoodEntry, EntityId>;
  declare favoriteMeals: Table<FavoriteMeal, EntityId>;
  declare recipes: Table<Recipe, EntityId>;
  declare recipeIngredients: Table<RecipeIngredient, EntityId>;
  declare dailyTargets: Table<DailyTarget, EntityId>;
  declare dailyJournalStatuses: Table<DailyJournalStatus, EntityId>;
  declare weeklyReviews: Table<WeeklyReview, EntityId>;
  declare acceptedCalorieAdjustments: Table<
    AcceptedCalorieAdjustment,
    EntityId
  >;

  declare exerciseDefinitions: Table<ExerciseDefinition, EntityId>;
  declare workoutTemplates: Table<WorkoutTemplate, EntityId>;
  declare workoutTemplateExercises: Table<WorkoutTemplateExercise, EntityId>;
  declare workoutSessions: Table<WorkoutSession, EntityId>;
  declare workoutSessionExercises: Table<WorkoutSessionExercise, EntityId>;
  declare strengthSets: Table<StrengthSet, EntityId>;
  declare progressionSuggestions: Table<ProgressionSuggestion, EntityId>;
  declare migrationJournal: Table<MigrationJournalEntry, string>;
  declare databaseDiagnostics: Table<DatabaseIntegrityReport, string>;
  declare trashItems: Table<TrashItem, string>;

  constructor(databaseName: string = DEFAULT_DATABASE_NAME) {
    super(databaseName);
    registerVersion1(this);
    registerVersion2(this);
    registerVersion3(this);
    registerVersion4(this);
  }
}
