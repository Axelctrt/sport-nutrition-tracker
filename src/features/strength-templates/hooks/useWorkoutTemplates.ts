import { useCallback, useEffect, useState } from 'react';
import type { EntityId } from '@/domain/models/common';
import {
  duplicateWorkoutTemplate,
  listWorkoutTemplates,
  setWorkoutTemplateArchived,
  type WorkoutTemplateSummary,
} from '@/application/strength/workoutTemplateService';
import { startWorkoutSessionFromTemplate } from '@/application/strength/workoutSessionService';
import { repositories } from '@/infrastructure/repositories/repositories';

export function useWorkoutTemplates(includeArchived: boolean) {
  const [templates, setTemplates] = useState<WorkoutTemplateSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [actionErrorMessage, setActionErrorMessage] = useState<string>();
  const [actionId, setActionId] = useState<EntityId>();

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setStatus('loading');
    setErrorMessage(undefined);
    try {
      setTemplates(await listWorkoutTemplates(repositories.workoutTemplates, includeArchived));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les séances modèles.');
      setStatus('error');
    }
  }, [includeArchived]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setArchived = useCallback(async (id: EntityId, archived: boolean) => {
    setActionId(id);
    setActionErrorMessage(undefined);
    try {
      const updated = await setWorkoutTemplateArchived(repositories.workoutTemplates, id, archived);
      setTemplates((current) => {
        if (updated.isArchived && !includeArchived) {
          return current.filter(({ template }) => template.id !== id);
        }
        return current.map((summary) => summary.template.id === id
          ? { ...summary, template: updated }
          : summary);
      });
      return true;
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Impossible de modifier cette séance modèle.');
      return false;
    } finally {
      setActionId(undefined);
    }
  }, [includeArchived]);

  const duplicate = useCallback(async (id: EntityId) => {
    setActionId(id);
    setActionErrorMessage(undefined);
    try {
      const created = await duplicateWorkoutTemplate(repositories.workoutTemplates, id);
      return created.template;
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Impossible de dupliquer cette séance modèle.');
      return undefined;
    } finally {
      setActionId(undefined);
    }
  }, []);

  const start = useCallback(async (id: EntityId) => {
    setActionId(id);
    setActionErrorMessage(undefined);
    try {
      const created = await startWorkoutSessionFromTemplate(
        repositories.workoutSessions,
        repositories.workoutTemplates,
        repositories.strengthExercises,
        id,
      );
      return created.session;
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Impossible de démarrer cette séance.');
      return undefined;
    } finally {
      setActionId(undefined);
    }
  }, []);

  return {
    templates,
    status,
    errorMessage,
    actionErrorMessage,
    actionId,
    refresh,
    setArchived,
    duplicate,
    start,
  };
}
