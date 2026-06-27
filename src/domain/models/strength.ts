import type { EntityMetadata, LocalDate } from '@/domain/models/common';

export type ExerciseSource = 'catalog' | 'user';

export type MuscleGroup =
  | 'pectorals'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abdominals'
  | 'lowerBack'
  | 'fullBody'
  | 'other';

export type ExerciseEquipment =
  | 'barbell'
  | 'dumbbells'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'resistanceBand'
  | 'kettlebell'
  | 'other';

export type ExerciseCategory =
  | 'strength'
  | 'bodyweight'
  | 'conditioning'
  | 'mobility'
  | 'other';

export type MovementType = 'compound' | 'isolation' | 'core' | 'carry' | 'other';

export type LoadUnit = 'kg' | 'bodyweight' | 'assistedKg' | 'none';

export type ExerciseGroupType = 'superset' | 'triSet' | 'circuit';

export type StrengthTrackingMode =
  | 'loadRepetitions'
  | 'bodyweightRepetitions'
  | 'assistedRepetitions'
  | 'repetitions'
  | 'duration'
  | 'distance';

export interface ExerciseDefinition extends EntityMetadata {
  name: string;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  equipment: ExerciseEquipment;
  category: ExerciseCategory;
  movementType: MovementType;
  loadUnit: LoadUnit;
  trackingMode?: StrengthTrackingMode;
  description?: string;
  source: ExerciseSource;
  isArchived: boolean;
}

export interface WorkoutTemplate extends EntityMetadata {
  name: string;
  description?: string;
  notes?: string;
  isArchived: boolean;
}

export interface WorkoutTemplateExercise extends EntityMetadata {
  templateId: string;
  exerciseDefinitionId: string;
  sortOrder: number;
  plannedSets: number;
  minRepetitions: number;
  maxRepetitions: number;
  targetLoadKg?: number;
  targetDurationSeconds?: number;
  targetDistanceMeters?: number;
  loadIncrementKg: number;
  restSeconds?: number;
  maximumRecommendedRpe?: number;
  notes?: string;
  isActive: boolean;
  exerciseGroupId?: string;
  exerciseGroupType?: ExerciseGroupType;
  exerciseGroupName?: string;
  exerciseGroupRounds?: number;
  exerciseGroupRestBetweenExercisesSeconds?: number;
  exerciseGroupRestBetweenRoundsSeconds?: number;
}

export type WorkoutSessionStatus = 'planned' | 'inProgress' | 'completed' | 'abandoned' | 'skipped';

export interface WorkoutSession extends EntityMetadata {
  date: LocalDate;
  status: WorkoutSessionStatus;
  plannedDate?: LocalDate;
  originalPlannedDate?: LocalDate;
  plannedAt?: string;
  skippedAt?: string;
  sourceTemplateId?: string;
  sourceTemplateNameSnapshot?: string;
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  notes?: string;
}

export interface WorkoutSessionExercise extends EntityMetadata {
  sessionId: string;
  exerciseDefinitionId: string;
  exerciseNameSnapshot: string;
  sortOrder: number;
  sourceTemplateExerciseId?: string;
  plannedSets?: number;
  minRepetitions?: number;
  maxRepetitions?: number;
  targetLoadKg?: number;
  loadIncrementKg?: number;
  restSeconds?: number;
  maximumRecommendedRpe?: number;
  loadUnitSnapshot: LoadUnit;
  trackingModeSnapshot?: StrengthTrackingMode;
  targetDurationSeconds?: number;
  targetDistanceMeters?: number;
  notes?: string;
  exerciseGroupId?: string;
  exerciseGroupType?: ExerciseGroupType;
  exerciseGroupName?: string;
  exerciseGroupRounds?: number;
  exerciseGroupRestBetweenExercisesSeconds?: number;
  exerciseGroupRestBetweenRoundsSeconds?: number;
}

export type StrengthSetType = 'warmup' | 'working' | 'dropSet' | 'failure' | 'other';

export interface StrengthSet extends EntityMetadata {
  sessionId: string;
  sessionExerciseId: string;
  setNumber: number;
  repetitions: number;
  weightKg: number;
  durationSeconds?: number;
  distanceMeters?: number;
  rpe?: number;
  type: StrengthSetType;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

export type ProgressionSuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'deferred';

export interface ProgressionSuggestion extends EntityMetadata {
  sessionId: string;
  sessionExerciseId: string;
  exerciseDefinitionId: string;
  templateId?: string;
  templateExerciseId?: string;
  currentLoadKg: number;
  suggestedLoadKg: number;
  incrementKg: number;
  status: ProgressionSuggestionStatus;
  reason: 'repetitionRangeCompleted';
  decidedAt?: string;
  appliedAt?: string;
}
