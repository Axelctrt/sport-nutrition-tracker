import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EntityId } from '@/domain/models/common';
import type { ExerciseDefinition } from '@/domain/models/strength';
import {
  duplicateExerciseDefinition,
  filterExerciseDefinitions,
  listExerciseDefinitions,
  setCustomExerciseArchived,
  type ExerciseFilters,
} from '@/application/strength/exerciseDefinitionService';
import { repositories } from '@/infrastructure/repositories/repositories';

export function useStrengthExercises(filters: ExerciseFilters) {
  const [allExercises, setAllExercises] = useState<ExerciseDefinition[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [actionErrorMessage, setActionErrorMessage] = useState<string>();
  const [actionId, setActionId] = useState<EntityId>();

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setStatus('loading');
    setErrorMessage(undefined);
    try {
      setAllExercises(await listExerciseDefinitions(
        repositories.strengthExercises,
        { includeArchived: true },
      ));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les exercices.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setArchived = useCallback(async (id: EntityId, isArchived: boolean) => {
    setActionId(id);
    setActionErrorMessage(undefined);
    try {
      const updated = await setCustomExerciseArchived(repositories.strengthExercises, id, isArchived);
      setAllExercises((current) => current.map((exercise) => exercise.id === id ? updated : exercise));
      return true;
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Impossible de modifier cet exercice.');
      return false;
    } finally {
      setActionId(undefined);
    }
  }, []);


  const exercises = useMemo(
    () => filterExerciseDefinitions(allExercises, filters),
    [allExercises, filters],
  );

  const duplicate = useCallback(async (id: EntityId) => {
    setActionId(id);
    setActionErrorMessage(undefined);
    try {
      return await duplicateExerciseDefinition(repositories.strengthExercises, id);
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Impossible de dupliquer cet exercice.');
      return undefined;
    } finally {
      setActionId(undefined);
    }
  }, []);

  return {
    exercises,
    status,
    errorMessage,
    actionErrorMessage,
    actionId,
    refresh,
    setArchived,
    duplicate,
  };
}
