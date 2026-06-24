import type { NewEntity } from '@/domain/models/common';
import type {
  ExerciseDefinition,
  ProgressionSuggestion,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from '@/domain/models/strength';

export function createExerciseDefinitionInput(
  overrides: Partial<NewEntity<ExerciseDefinition>> = {},
): NewEntity<ExerciseDefinition> {
  return {
    name: 'Développé couché',
    primaryMuscleGroup: 'pectorals',
    secondaryMuscleGroups: ['triceps', 'shoulders'],
    equipment: 'barbell',
    category: 'strength',
    movementType: 'compound',
    loadUnit: 'kg',
    source: 'user',
    isArchived: false,
    ...overrides,
  };
}

export function createWorkoutTemplateInput(
  overrides: Partial<NewEntity<WorkoutTemplate>> = {},
): NewEntity<WorkoutTemplate> {
  return {
    name: 'Push A',
    isArchived: false,
    ...overrides,
  };
}

export function createWorkoutTemplateExerciseInput(
  overrides: Partial<NewEntity<WorkoutTemplateExercise>> = {},
): NewEntity<WorkoutTemplateExercise> {
  return {
    templateId: 'template-1',
    exerciseDefinitionId: 'exercise-1',
    sortOrder: 0,
    plannedSets: 4,
    minRepetitions: 8,
    maxRepetitions: 12,
    targetLoadKg: 60,
    loadIncrementKg: 2.5,
    restSeconds: 120,
    maximumRecommendedRpe: 9,
    isActive: true,
    ...overrides,
  };
}

export function createWorkoutSessionInput(
  overrides: Partial<NewEntity<WorkoutSession>> = {},
): NewEntity<WorkoutSession> {
  return {
    date: '2026-06-25',
    status: 'completed',
    sourceTemplateId: 'template-1',
    sourceTemplateNameSnapshot: 'Push A',
    startedAt: '2026-06-25T17:00:00.000Z',
    completedAt: '2026-06-25T18:00:00.000Z',
    durationMinutes: 60,
    ...overrides,
  };
}

export function createWorkoutSessionExerciseInput(
  overrides: Partial<NewEntity<WorkoutSessionExercise>> = {},
): NewEntity<WorkoutSessionExercise> {
  return {
    sessionId: 'session-1',
    exerciseDefinitionId: 'exercise-1',
    exerciseNameSnapshot: 'Développé couché',
    sortOrder: 0,
    sourceTemplateExerciseId: 'template-exercise-1',
    plannedSets: 4,
    minRepetitions: 8,
    maxRepetitions: 12,
    targetLoadKg: 60,
    loadIncrementKg: 2.5,
    restSeconds: 120,
    maximumRecommendedRpe: 9,
    loadUnitSnapshot: 'kg',
    ...overrides,
  };
}

export function createStrengthSetInput(
  overrides: Partial<NewEntity<StrengthSet>> = {},
): NewEntity<StrengthSet> {
  return {
    sessionId: 'session-1',
    sessionExerciseId: 'session-exercise-1',
    setNumber: 1,
    repetitions: 12,
    weightKg: 60,
    rpe: 8,
    type: 'working',
    isCompleted: true,
    completedAt: '2026-06-25T17:15:00.000Z',
    ...overrides,
  };
}

export function createProgressionSuggestionInput(
  overrides: Partial<NewEntity<ProgressionSuggestion>> = {},
): NewEntity<ProgressionSuggestion> {
  return {
    sessionId: 'session-1',
    sessionExerciseId: 'session-exercise-1',
    exerciseDefinitionId: 'exercise-1',
    templateId: 'template-1',
    templateExerciseId: 'template-exercise-1',
    currentLoadKg: 60,
    suggestedLoadKg: 62.5,
    incrementKg: 2.5,
    status: 'pending',
    reason: 'repetitionRangeCompleted',
    ...overrides,
  };
}
