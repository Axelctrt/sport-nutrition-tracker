import type { Activity } from '@/domain/models/activity';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { Goal, GoalState } from '@/domain/goals/goalState';
import type {
  EndurancePlanningState,
  PlannedEnduranceSession,
} from '@/domain/planning/endurancePlanningState';
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
import type { AppSettings, UserSettings } from '@/domain/models/settings';
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
import type {
  AcceptedCalorieAdjustment,
  WeeklyReview,
} from '@/domain/models/weeklyReview';
import type { WeightEntry } from '@/domain/models/weight';
import type { AchievementState } from '@/domain/rewards/achievements';
import type { VisualThemeState } from '@/domain/rewards/visualThemes';
import type { WeeklyMissionHistoryState } from '@/domain/rewards/weeklyMissionHistory';
import type {
  CompletedWeeklyMissionRecord,
  EarnedAchievementRecord,
  RoutineReminderCompletionRecord,
  UnlockedVisualThemeRecord,
  VisualThemePreferenceRecord,
} from '@/infrastructure/user-state/userStateModels';

export const BACKUP_USER_STATE_TABLE_NAMES = [
  'goals',
  'endurancePlanningSessions',
  'earnedAchievements',
  'unlockedVisualThemes',
  'visualThemePreferences',
  'weeklyMissionCompletions',
  'routineReminderCompletions',
  'deletionRecords',
] as const;

export type BackupUserStateTableName =
  (typeof BACKUP_USER_STATE_TABLE_NAMES)[number];

export interface BackupData {
  userProfile: UserProfile[];
  appSettings?: AppSettings[];
  userSettings?: UserSettings[];
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
  goals?: Goal[];
  endurancePlanningSessions?: PlannedEnduranceSession[];
  earnedAchievements?: EarnedAchievementRecord[];
  unlockedVisualThemes?: UnlockedVisualThemeRecord[];
  visualThemePreferences?: VisualThemePreferenceRecord[];
  weeklyMissionCompletions?: CompletedWeeklyMissionRecord[];
  routineReminderCompletions?: RoutineReminderCompletionRecord[];
  deletionRecords?: DeletionRecord[];
}

export interface RewardBackupState {
  achievements: AchievementState;
  visualThemes: VisualThemeState;
  weeklyMissions: WeeklyMissionHistoryState;
  goals?: GoalState;
  endurancePlanning?: EndurancePlanningState;
}

export interface BackupEnvelope {
  format: 'sportpilot-backup';
  schemaVersion: number;
  exportedAt: IsoDateTime;
  appVersion?: string;
  includedUserStateTables?: BackupUserStateTableName[];
  rewardState?: RewardBackupState;
  data: BackupData;
}
