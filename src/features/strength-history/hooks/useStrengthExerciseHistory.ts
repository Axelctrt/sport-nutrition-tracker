import { useCallback, useEffect, useState } from 'react';
import { listExerciseHistory, type ExerciseHistoryEntry } from '@/application/strength/strengthHistoryService';
import type { ExerciseDefinition } from '@/domain/models/strength';
import { repositories } from '@/infrastructure/repositories/repositories';

export function useStrengthExerciseHistory(exerciseId: string) {
  const [exercise, setExercise] = useState<ExerciseDefinition>();
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      const [definition, entries] = await Promise.all([
        repositories.strengthExercises.getById(exerciseId),
        listExerciseHistory(repositories.workoutSessions, repositories.strengthSets, exerciseId),
      ]);
      if (!definition) throw new Error('Exercice introuvable.');
      setExercise(definition);
      setHistory(entries);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger cet historique.');
      setStatus('error');
    }
  }, [exerciseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { exercise, history, status, errorMessage, refresh };
}
