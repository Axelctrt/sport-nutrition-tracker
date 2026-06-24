import { useCallback, useEffect, useState } from 'react';
import type { EntityId } from '@/domain/models/common';
import type { ExerciseDefinition } from '@/domain/models/strength';
import {
  duplicateExerciseDefinition,
  listExerciseDefinitions,
  setCustomExerciseArchived,
  type ExerciseFilters,
} from '@/application/strength/exerciseDefinitionService';
import { repositories } from '@/infrastructure/repositories/repositories';

export function useStrengthExercises(filters: ExerciseFilters) {
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [actionId, setActionId] = useState<EntityId>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      setExercises(await listExerciseDefinitions(repositories.strengthExercises, filters));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les exercices.');
      setStatus('error');
    }
  }, [filters]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setArchived = useCallback(async (id: EntityId, isArchived: boolean) => {
    setActionId(id);
    try {
      await setCustomExerciseArchived(repositories.strengthExercises, id, isArchived);
      await refresh();
    } finally {
      setActionId(undefined);
    }
  }, [refresh]);

  const duplicate = useCallback(async (id: EntityId) => {
    setActionId(id);
    try {
      const created = await duplicateExerciseDefinition(repositories.strengthExercises, id);
      await refresh();
      return created;
    } finally {
      setActionId(undefined);
    }
  }, [refresh]);

  return { exercises, status, errorMessage, actionId, refresh, setArchived, duplicate };
}
