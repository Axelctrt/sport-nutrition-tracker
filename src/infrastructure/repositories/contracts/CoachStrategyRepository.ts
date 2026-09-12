import type { CoachStrategyState } from '@/domain/coach/coachStrategyState';
import type { UserProfile } from '@/domain/models/profile';
import type { UserSettings, DeviceSettings } from '@/domain/models/settings';
import type { WeightEntry } from '@/domain/models/weight';
import type { FoodEntry, DailyJournalStatus } from '@/domain/models/food';
import type { DailyTarget } from '@/domain/models/targets';
import type { DailySteps } from '@/domain/models/steps';
import type { DailyCheckIn, DailyCheckOut } from '@/domain/models/dailyCoaching';
import type { Activity } from '@/domain/models/activity';
import type { WorkoutSession, WorkoutSessionExercise, StrengthSet, ExerciseDefinition } from '@/domain/models/strength';
import type { AcceptedCalorieAdjustment } from '@/domain/models/weeklyReview';

export interface CoachStrategySources {
  userProfile: UserProfile[];
  userSettings: UserSettings[];
  deviceSettings: DeviceSettings[];
  weights: WeightEntry[];
  foodEntries: FoodEntry[];
  dailyJournalStatuses: DailyJournalStatus[];
  dailyTargets: DailyTarget[];
  dailySteps: DailySteps[];
  dailyCheckIns: DailyCheckIn[];
  dailyCheckOuts: DailyCheckOut[];
  activities: Activity[];
  workoutSessions: WorkoutSession[];
  workoutSessionExercises: WorkoutSessionExercise[];
  strengthSets: StrengthSet[];
  exerciseDefinitions: ExerciseDefinition[];
  acceptedCalorieAdjustments: AcceptedCalorieAdjustment[];
}

export interface CoachStrategyRepository {
  read(): Promise<CoachStrategyState | undefined>;
  /** Callback runs on a consistent snapshot; only its returned Strategy state is written. */
  transact(update: (state: CoachStrategyState | undefined, sources: CoachStrategySources,
    fingerprint: string) => Promise<CoachStrategyState>): Promise<CoachStrategyState>;
}
