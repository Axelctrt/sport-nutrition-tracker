import { useCallback, useEffect, useState } from 'react';
import {
  listWorkoutSessions,
  startEmptyWorkoutSession,
  type WorkoutSessionSummary,
} from '@/application/strength/workoutSessionService';
import { repositories } from '@/infrastructure/repositories/repositories';

export interface WorkoutSessionSummaryWithProgression extends WorkoutSessionSummary {
  pendingProgressionCount: number;
}

export function useWorkoutSessions() {
  const [sessions, setSessions] = useState<WorkoutSessionSummaryWithProgression[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isStarting, setIsStarting] = useState(false);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      const summaries = await listWorkoutSessions(repositories.workoutSessions);
      const withProgression = await Promise.all(summaries.map(async (summary) => {
        const suggestions = await repositories.progressionSuggestions.listBySession(summary.session.id);
        return {
          ...summary,
          pendingProgressionCount: suggestions.filter(
            (suggestion) => suggestion.status === 'pending' || suggestion.status === 'deferred',
          ).length,
        };
      }));
      setSessions(withProgression);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les séances.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startEmpty = useCallback(async () => {
    setIsStarting(true);
    setErrorMessage(undefined);
    try {
      return await startEmptyWorkoutSession(repositories.workoutSessions);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de démarrer la séance.');
      return undefined;
    } finally {
      setIsStarting(false);
    }
  }, []);

  return { sessions, status, errorMessage, isStarting, refresh, startEmpty };
}
