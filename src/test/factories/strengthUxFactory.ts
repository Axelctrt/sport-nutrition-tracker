import type { WorkoutTemplateSummary } from '@/application/strength/workoutTemplateService';
import type { ExerciseHistoryEntry } from '@/application/strength/strengthHistoryService';
import type {
  ExerciseDefinition,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutTemplate,
} from '@/domain/models/strength';
import type { WorkoutSessionSummaryWithProgression } from '@/features/strength-sessions/hooks/useWorkoutSessions';
import { createEntity } from '@/shared/utils/entities';

export function createStrengthExercise(overrides: Partial<ExerciseDefinition> = {}): ExerciseDefinition {
  const base = createEntity<ExerciseDefinition>({
    name: 'Développé couché',
    primaryMuscleGroup: 'pectorals',
    secondaryMuscleGroups: ['triceps'],
    equipment: 'barbell',
    category: 'strength',
    movementType: 'compound',
    loadUnit: 'kg',
    description: 'Garder les omoplates serrées.',
    source: 'user',
    isArchived: false,
  }, overrides.id ?? 'exercise-1');
  return { ...base, ...overrides };
}

export function createWorkoutTemplateSummary(
  overrides: Partial<WorkoutTemplateSummary> = {},
): WorkoutTemplateSummary {
  const template = createEntity<WorkoutTemplate>({
    name: 'Push A',
    description: 'Pectoraux, épaules et triceps.',
    notes: 'Rester à RPE 8 maximum.',
    isArchived: false,
  }, 'template-1');
  return {
    template,
    exerciseCount: 5,
    ...overrides,
  };
}

export function createWorkoutSessionSummary(
  overrides: Partial<WorkoutSessionSummaryWithProgression> = {},
): WorkoutSessionSummaryWithProgression {
  const session = createEntity<WorkoutSession>({
    date: '2026-06-25',
    status: 'completed',
    sourceTemplateId: 'template-1',
    sourceTemplateNameSnapshot: 'Push A',
    startedAt: '2026-06-25T16:00:00.000Z',
    completedAt: '2026-06-25T17:05:00.000Z',
    durationMinutes: 65,
  }, 'session-1');
  return {
    session,
    exerciseCount: 5,
    pendingProgressionCount: 1,
    ...overrides,
  };
}

export function createExerciseHistoryEntry(
  overrides: Partial<ExerciseHistoryEntry> = {},
): ExerciseHistoryEntry {
  const session = createWorkoutSessionSummary().session;
  const sessionExercise = createEntity<WorkoutSessionExercise>({
    sessionId: session.id,
    exerciseDefinitionId: 'exercise-1',
    exerciseNameSnapshot: 'Développé couché',
    sortOrder: 0,
    loadUnitSnapshot: 'kg',
  }, 'session-exercise-1');
  const workingSet = createEntity<StrengthSet>({
    sessionId: session.id,
    sessionExerciseId: sessionExercise.id,
    setNumber: 1,
    repetitions: 8,
    weightKg: 80,
    rpe: 8,
    type: 'working',
    isCompleted: true,
    completedAt: '2026-06-25T16:20:00.000Z',
  }, 'set-1');
  const warmupSet = createEntity<StrengthSet>({
    sessionId: session.id,
    sessionExerciseId: sessionExercise.id,
    setNumber: 2,
    repetitions: 10,
    weightKg: 40,
    type: 'warmup',
    isCompleted: true,
    completedAt: '2026-06-25T16:15:00.000Z',
  }, 'set-2');

  return {
    session,
    sessionExercise,
    sets: [workingSet, warmupSet],
    workingSets: [workingSet],
    hasEffectiveLoadData: true,
    totalVolumeKg: 640,
    totalAdditionalVolumeKg: 0,
    totalDurationSeconds: 0,
    totalDistanceMeters: 0,
    ...overrides,
  };
}
