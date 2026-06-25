import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ExerciseDefinition, WorkoutSession, WorkoutSessionExercise } from '@/domain/models/strength';
import {
  abandonWorkoutSession,
  addExerciseToWorkoutSession,
  availableExercisesForSession,
  completeWorkoutSession,
  getWorkoutSessionView,
  moveWorkoutSessionExercise,
  removeExerciseFromWorkoutSession,
  updateWorkoutSessionNotes,
} from '@/application/strength/workoutSessionService';
import { listExerciseDefinitions } from '@/application/strength/exerciseDefinitionService';
import { repositories } from '@/infrastructure/repositories/repositories';

export function useWorkoutSession(sessionId: string) {
  const [session, setSession] = useState<WorkoutSession>();
  const [exercises, setExercises] = useState<WorkoutSessionExercise[]>([]);
  const [definitions, setDefinitions] = useState<ExerciseDefinition[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [action, setAction] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      const [view, catalog] = await Promise.all([
        getWorkoutSessionView(repositories.workoutSessions, sessionId),
        listExerciseDefinitions(repositories.strengthExercises),
      ]);
      setSession(view.session);
      setExercises(view.exercises);
      setDefinitions(catalog);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger cette séance.');
      setStatus('error');
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = useCallback(async <T,>(name: string, operation: () => Promise<T>): Promise<T | undefined> => {
    setAction(name);
    setErrorMessage(undefined);
    try {
      const result = await operation();
      await refresh();
      return result;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'L’action demandée a échoué.');
      return undefined;
    } finally {
      setAction(undefined);
    }
  }, [refresh]);

  const addExercise = useCallback((exerciseDefinitionId: string) => runAction(
    'addExercise',
    () => addExerciseToWorkoutSession(
      repositories.workoutSessions,
      repositories.strengthExercises,
      sessionId,
      exerciseDefinitionId,
    ),
  ), [runAction, sessionId]);

  const removeExercise = useCallback((sessionExerciseId: string) => runAction(
    `remove:${sessionExerciseId}`,
    () => removeExerciseFromWorkoutSession(repositories.workoutSessions, sessionId, sessionExerciseId),
  ), [runAction, sessionId]);

  const moveExercise = useCallback((sessionExerciseId: string, direction: -1 | 1) => runAction(
    `move:${sessionExerciseId}`,
    () => moveWorkoutSessionExercise(repositories.workoutSessions, sessionId, sessionExerciseId, direction),
  ), [runAction, sessionId]);

  const saveNotes = useCallback((notes: string) => runAction(
    'notes',
    () => updateWorkoutSessionNotes(repositories.workoutSessions, sessionId, notes),
  ), [runAction, sessionId]);

  const complete = useCallback(() => runAction(
    'complete',
    () => completeWorkoutSession(repositories.workoutSessions, sessionId),
  ), [runAction, sessionId]);

  const abandon = useCallback(() => runAction(
    'abandon',
    () => abandonWorkoutSession(repositories.workoutSessions, sessionId),
  ), [runAction, sessionId]);

  const availableExercises = useMemo(
    () => availableExercisesForSession(definitions, exercises),
    [definitions, exercises],
  );

  return {
    session,
    exercises,
    availableExercises,
    status,
    errorMessage,
    action,
    refresh,
    addExercise,
    removeExercise,
    moveExercise,
    saveNotes,
    complete,
    abandon,
  };
}
