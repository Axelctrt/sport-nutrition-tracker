import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ExerciseDefinition,
  ProgressionSuggestion,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import {
  decideProgressionSuggestion,
  generateProgressionSuggestions,
  listProgressionSuggestionsForSession,
  type ProgressionDecision,
} from '@/application/strength/strengthProgressionService';
import {
  copyPreviousExerciseSets,
  getPreviousExercisePerformance,
  type ExerciseHistoryEntry,
} from '@/application/strength/strengthHistoryService';
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
import {
  addStrengthSet,
  deleteStrengthSet,
  duplicateStrengthSet,
  listStrengthSetsForSession,
  setStrengthSetCompletion,
  updateStrengthSet,
  type StrengthSetChanges,
} from '@/application/strength/strengthSetService';
import { repositories } from '@/infrastructure/repositories/repositories';
import { useToast } from '@/shared/toast/useToast';
import type { SaveStatusValue } from '@/shared/ui/SaveStatus';

interface RefreshOptions {
  showLoading?: boolean;
}

export function useWorkoutSession(sessionId: string) {
  const toast = useToast();
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [session, setSession] = useState<WorkoutSession>();
  const [exercises, setExercises] = useState<WorkoutSessionExercise[]>([]);
  const [definitions, setDefinitions] = useState<ExerciseDefinition[]>([]);
  const [strengthSets, setStrengthSets] = useState<StrengthSet[]>([]);
  const [progressionSuggestions, setProgressionSuggestions] = useState<ProgressionSuggestion[]>([]);
  const [previousPerformances, setPreviousPerformances] = useState<Record<string, ExerciseHistoryEntry | undefined>>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [action, setAction] = useState<string>();
  const [saveStatus, setSaveStatus] = useState<SaveStatusValue>('idle');

  const markSaved = useCallback(() => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSaveStatus('saved');
    savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2_500);
  }, []);

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  const refresh = useCallback(async ({ showLoading = true }: RefreshOptions = {}): Promise<boolean> => {
    if (showLoading) setStatus('loading');
    setErrorMessage(undefined);
    try {
      const [view, catalog, sets, suggestions] = await Promise.all([
        getWorkoutSessionView(repositories.workoutSessions, sessionId),
        listExerciseDefinitions(repositories.strengthExercises),
        listStrengthSetsForSession(repositories.strengthSets, sessionId),
        listProgressionSuggestionsForSession(repositories.progressionSuggestions, sessionId),
      ]);
      const performanceEntries = await Promise.all(view.exercises.map(async (exercise) => ([
        exercise.id,
        await getPreviousExercisePerformance(
          repositories.workoutSessions,
          repositories.strengthSets,
          sessionId,
          exercise.exerciseDefinitionId,
        ),
      ] as const)));
      setSession(view.session);
      setExercises(view.exercises);
      setDefinitions(catalog);
      setStrengthSets(sets);
      setProgressionSuggestions(suggestions);
      setPreviousPerformances(Object.fromEntries(performanceEntries));
      setStatus('ready');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de charger cette séance.';
      setErrorMessage(message);
      if (showLoading) setStatus('error');
      return false;
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = useCallback(async <T,>(name: string, operation: () => Promise<T>): Promise<T | undefined> => {
    setAction(name);
    setSaveStatus('saving');
    try {
      const result = await operation();
      const refreshed = await refresh({ showLoading: false });
      if (!refreshed) {
        setSaveStatus('error');
        toast.error('Données enregistrées, affichage non actualisé', 'Recharge la séance pour afficher les dernières modifications.');
        return result;
      }
      markSaved();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'L’action demandée a échoué.';
      setSaveStatus('error');
      toast.error('Action impossible', message);
      return undefined;
    } finally {
      setAction(undefined);
    }
  }, [markSaved, refresh, toast]);

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
    async () => {
      const completed = await completeWorkoutSession(repositories.workoutSessions, sessionId);
      await generateProgressionSuggestions(
        repositories.workoutSessions,
        repositories.strengthSets,
        repositories.progressionSuggestions,
        sessionId,
      );
      return completed;
    },
  ), [runAction, sessionId]);

  const abandon = useCallback(() => runAction(
    'abandon',
    () => abandonWorkoutSession(repositories.workoutSessions, sessionId),
  ), [runAction, sessionId]);

  const addSet = useCallback((sessionExerciseId: string) => runAction(
    `addSet:${sessionExerciseId}`,
    () => addStrengthSet(
      repositories.workoutSessions,
      repositories.strengthSets,
      sessionId,
      sessionExerciseId,
    ),
  ), [runAction, sessionId]);

  const saveSet = useCallback((
    sessionExerciseId: string,
    setId: string,
    values: StrengthSetChanges,
  ) => runAction(
    `saveSet:${setId}`,
    () => updateStrengthSet(
      repositories.workoutSessions,
      repositories.strengthSets,
      sessionId,
      sessionExerciseId,
      setId,
      values,
    ),
  ), [runAction, sessionId]);

  const completeSet = useCallback((
    sessionExerciseId: string,
    setId: string,
    values: StrengthSetChanges,
    isCompleted: boolean,
  ) => runAction(
    `completeSet:${setId}`,
    () => setStrengthSetCompletion(
      repositories.workoutSessions,
      repositories.strengthSets,
      sessionId,
      sessionExerciseId,
      setId,
      values,
      isCompleted,
    ),
  ), [runAction, sessionId]);

  const duplicateSet = useCallback((sessionExerciseId: string, setId: string) => runAction(
    `duplicateSet:${setId}`,
    () => duplicateStrengthSet(
      repositories.workoutSessions,
      repositories.strengthSets,
      sessionId,
      sessionExerciseId,
      setId,
    ),
  ), [runAction, sessionId]);

  const removeSet = useCallback((sessionExerciseId: string, setId: string) => runAction(
    `deleteSet:${setId}`,
    () => deleteStrengthSet(
      repositories.workoutSessions,
      repositories.strengthSets,
      sessionId,
      sessionExerciseId,
      setId,
    ),
  ), [runAction, sessionId]);

  const reusePreviousSets = useCallback((sessionExerciseId: string) => runAction(
    `reusePreviousSets:${sessionExerciseId}`,
    () => copyPreviousExerciseSets(
      repositories.workoutSessions,
      repositories.strengthSets,
      sessionId,
      sessionExerciseId,
    ),
  ), [runAction, sessionId]);

  const decideProgression = useCallback((
    suggestionId: string,
    decision: ProgressionDecision,
    acceptedLoadKg?: number,
  ) => runAction(
    `progression:${suggestionId}`,
    () => decideProgressionSuggestion(
      repositories.progressionSuggestions,
      repositories.workoutTemplates,
      suggestionId,
      decision,
      acceptedLoadKg,
    ),
  ), [runAction]);

  const availableExercises = useMemo(
    () => availableExercisesForSession(definitions, exercises),
    [definitions, exercises],
  );

  return {
    session,
    exercises,
    strengthSets,
    progressionSuggestions,
    previousPerformances,
    availableExercises,
    status,
    errorMessage,
    action,
    saveStatus,
    refresh,
    addExercise,
    removeExercise,
    moveExercise,
    saveNotes,
    complete,
    abandon,
    addSet,
    saveSet,
    completeSet,
    duplicateSet,
    removeSet,
    reusePreviousSets,
    decideProgression,
  };
}
