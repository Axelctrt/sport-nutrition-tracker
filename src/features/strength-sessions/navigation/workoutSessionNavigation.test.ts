import {
  createWorkoutSessionFeedbackState,
  createWorkoutSessionReturnState,
} from '@/features/strength-sessions/navigation/workoutSessionNavigation';

describe('workoutSessionNavigation', () => {
  it('prépare le feedback exact de fin de séance pour l’historique par défaut', () => {
    expect(createWorkoutSessionFeedbackState(undefined, 'session-1')).toEqual({
      workoutSessionFeedback: {
        title: 'Séance enregistrée',
        description: 'Ta séance a bien été ajoutée à l’historique.',
        sessionId: 'session-1',
      },
    });
  });

  it('préserve le contexte de retour et la restauration du scroll', () => {
    const context = createWorkoutSessionReturnState('/dashboard', 'sport-stage')
      .workoutSessionReturn;

    expect(createWorkoutSessionFeedbackState(context, 'session-1')).toMatchObject({
      scroll: 'restore',
      restoreScrollKey: 'sport-stage',
      workoutSessionFeedback: {
        sessionId: 'session-1',
      },
    });
  });
});
