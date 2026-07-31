import Dexie, { type Table } from 'dexie';

import { DEFAULT_DATABASE_NAME } from '@/infrastructure/database/databaseNames';

import type { Activity } from '@/domain/models/activity';
import type {
  DailyActivityDecision,
  DailyCheckIn,
  DailyCheckOut,
} from '@/domain/models/dailyCoaching';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { Goal } from '@/domain/goals/goalState';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import type { EntityId } from '@/domain/models/common';
import type {
  StoredFriendActivityPermission,
  StoredFriendProfile,
  StoredFriendRequest,
  StoredFriendsPrivacySettings,
} from '@/domain/friends/friendship';
import type {
  DailyJournalStatus,
  FavoriteMeal,
  FoodEntry,
  FoodProduct,
  Meal,
} from '@/domain/models/food';
import type { UserProfile } from '@/domain/models/profile';
import type {
  ProgressPhoto,
  ProgressPhotoAsset,
} from '@/domain/models/progressPhoto';
import type { Recipe, RecipeIngredient } from '@/domain/models/recipe';
import type { DeviceSettings, UserSettings } from '@/domain/models/settings';
import type {
  ExerciseDefinition,
  ProgressionSuggestion,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from '@/domain/models/strength';
import type { DailySteps } from '@/domain/models/steps';
import type { DailyTarget } from '@/domain/models/targets';
import type {
  AcceptedCalorieAdjustment,
  WeeklyReview,
} from '@/domain/models/weeklyReview';
import type { WeightEntry } from '@/domain/models/weight';
import type {
  CompletedWeeklyMissionRecord,
  EarnedAchievementRecord,
  RoutineReminderCompletionRecord,
  UnlockedVisualThemeRecord,
  VisualThemePreferenceRecord,
} from '@/infrastructure/user-state/userStateModels';

import type { TrashItem } from '@/domain/models/trash';
import type { DatabaseIntegrityReport } from '@/infrastructure/database/databaseIntegrityModels';
import type { MigrationJournalEntry } from '@/infrastructure/database/migrationJournal';
import { registerVersion1 } from '@/infrastructure/database/migrations/version1';
import { registerVersion2 } from '@/infrastructure/database/migrations/version2';
import { registerVersion3 } from '@/infrastructure/database/migrations/version3';
import { registerVersion4 } from '@/infrastructure/database/migrations/version4';
import { registerVersion5 } from '@/infrastructure/database/migrations/version5';
import { registerVersion6 } from '@/infrastructure/database/migrations/version6';
import { registerVersion7 } from '@/infrastructure/database/migrations/version7';
import { registerVersion8 } from '@/infrastructure/database/migrations/version8';
import { registerVersion9 } from '@/infrastructure/database/migrations/version9';
import { registerVersion10 } from '@/infrastructure/database/migrations/version10';
import { registerVersion11 } from '@/infrastructure/database/migrations/version11';
import { registerVersion12 } from '@/infrastructure/database/migrations/version12';

export { DEFAULT_DATABASE_NAME } from '@/infrastructure/database/databaseNames';

export class AppDatabase extends Dexie {
  declare userProfile: Table<UserProfile, EntityId>;
  declare userSettings: Table<UserSettings, EntityId>;
  declare deviceSettings: Table<DeviceSettings, EntityId>;
  declare weights: Table<WeightEntry, EntityId>;
  declare progressPhotos: Table<ProgressPhoto, EntityId>;
  declare progressPhotoAssets: Table<ProgressPhotoAsset, EntityId>;
  declare dailySteps: Table<DailySteps, EntityId>;
  declare dailyCheckIns: Table<DailyCheckIn, EntityId>;
  declare dailyActivityDecisions: Table<DailyActivityDecision, EntityId>;
  declare dailyCheckOuts: Table<DailyCheckOut, EntityId>;
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
  declare goals: Table<Goal, EntityId>;
  declare endurancePlanningSessions: Table<
    PlannedEnduranceSession,
    EntityId
  >;
  declare earnedAchievements: Table<EarnedAchievementRecord, EntityId>;
  declare unlockedVisualThemes: Table<UnlockedVisualThemeRecord, EntityId>;
  declare visualThemePreferences: Table<VisualThemePreferenceRecord, EntityId>;
  declare weeklyMissionCompletions: Table<
    CompletedWeeklyMissionRecord,
    EntityId
  >;
  declare routineReminderCompletions: Table<
    RoutineReminderCompletionRecord,
    EntityId
  >;
  declare deletionRecords: Table<DeletionRecord, EntityId>;
  declare friendProfiles: Table<StoredFriendProfile, EntityId>;
  declare friendRequests: Table<StoredFriendRequest, EntityId>;
  declare friendActivityPermissions: Table<StoredFriendActivityPermission, EntityId>;
  declare friendsPrivacySettings: Table<StoredFriendsPrivacySettings, EntityId>;
  declare migrationJournal: Table<MigrationJournalEntry, string>;
  declare databaseDiagnostics: Table<DatabaseIntegrityReport, string>;

  declare trashItems: Table<TrashItem, string>;

  constructor(databaseName: string = DEFAULT_DATABASE_NAME) {
    super(databaseName);
    registerVersion1(this);
    registerVersion2(this);
    registerVersion3(this);
    registerVersion4(this);
    registerVersion5(this);
    registerVersion6(this);
    registerVersion7(this);
    registerVersion8(this);
    registerVersion9(this);
    registerVersion10(this);
    registerVersion11(this);
    registerVersion12(this);
  }
}
