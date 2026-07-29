export interface WorkoutSessionReturnContext {
  path: string;
  scrollKey: string;
}

export interface WorkoutSessionNavigationState {
  workoutSessionReturn?: WorkoutSessionReturnContext;
  workoutSessionFeedback?: {
    title: string;
    sessionId: string;
  };
  scroll?: 'top' | 'restore';
  restoreScrollKey?: string;
}

export function createWorkoutSessionReturnState(
  path: string,
  scrollKey: string,
): WorkoutSessionNavigationState {
  return {
    workoutSessionReturn: { path, scrollKey },
  };
}

export function createWorkoutSessionFeedbackState(
  context: WorkoutSessionReturnContext,
  sessionId: string,
): WorkoutSessionNavigationState {
  return {
    workoutSessionFeedback: {
      title: 'Séance terminée',
      sessionId,
    },
    scroll: 'restore',
    restoreScrollKey: context.scrollKey,
  };
}
