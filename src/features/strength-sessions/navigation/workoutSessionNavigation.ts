export interface WorkoutSessionReturnContext {
  path: string;
  scrollKey: string;
}

export interface WorkoutSessionNavigationState {
  workoutSessionReturn?: WorkoutSessionReturnContext;
  workoutSessionFeedback?: {
    title: string;
    description: string;
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
  context: WorkoutSessionReturnContext | undefined,
  sessionId: string,
): WorkoutSessionNavigationState {
  return {
    workoutSessionFeedback: {
      title: 'Séance enregistrée',
      description: 'Ta séance a bien été ajoutée à l’historique.',
      sessionId,
    },
    ...(context ? {
      scroll: 'restore' as const,
      restoreScrollKey: context.scrollKey,
    } : {}),
  };
}
