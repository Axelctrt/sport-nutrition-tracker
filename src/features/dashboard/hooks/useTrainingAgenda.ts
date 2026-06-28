import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  buildTrainingAgenda,
  trainingAgendaEndDate,
  type TrainingAgendaSnapshot,
  type TrainingAgendaStrengthSource,
} from '@/application/planning/trainingAgendaService';
import {
  getWorkoutSessionTitle,
} from '@/application/strength/workoutSessionService';
import {
  planningDateForSession,
} from '@/application/strength/weeklyPlanningService';
import {
  ENDURANCE_PLANNING_CHANGED_EVENT,
  readEndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import { repositories } from '@/infrastructure/repositories/repositories';
import { toLocalDate } from '@/shared/utils/dates';

export type TrainingAgendaLoader = (
  today: string,
) => Promise<TrainingAgendaSnapshot>;

export async function loadTrainingAgenda(
  today: string,
): Promise<TrainingAgendaSnapshot> {
  const enduranceState =
    readEndurancePlanningState();
  const endDate =
    trainingAgendaEndDate(today);
  const plannedEnduranceDates =
    enduranceState.sessions
      .filter(
        ({ status, date }) =>
          status === 'planned' &&
          date <= endDate,
      )
      .map(({ date }) => date)
      .sort();
  const activityStart =
    plannedEnduranceDates[0] ?? today;

  const [workoutSessions, activities] =
    await Promise.all([
      repositories.workoutSessions.listAll(),
      repositories.activities.listBetween(
        activityStart,
        endDate,
      ),
    ]);

  const strengthSources:
    TrainingAgendaStrengthSource[] =
      workoutSessions.map((session) => ({
        id: session.id,
        title:
          getWorkoutSessionTitle(session),
        date:
          planningDateForSession(session),
        status: session.status,
      }));

  return buildTrainingAgenda(
    strengthSources,
    enduranceState.sessions,
    activities,
    today,
  );
}

export function useTrainingAgenda(
  loader: TrainingAgendaLoader =
    loadTrainingAgenda,
) {
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [agenda, setAgenda] =
    useState<TrainingAgendaSnapshot>();
  const [errorMessage, setErrorMessage] =
    useState<string>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);

    try {
      setAgenda(
        await loader(toLocalDate()),
      );
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Le planning à venir ne peut pas être chargé.',
      );
      setStatus('error');
    }
  }, [loader]);

  useEffect(() => {
    void refresh();

    const handlePlanningChange = () => {
      void refresh();
    };

    window.addEventListener(
      ENDURANCE_PLANNING_CHANGED_EVENT,
      handlePlanningChange,
    );
    window.addEventListener(
      'focus',
      handlePlanningChange,
    );

    return () => {
      window.removeEventListener(
        ENDURANCE_PLANNING_CHANGED_EVENT,
        handlePlanningChange,
      );
      window.removeEventListener(
        'focus',
        handlePlanningChange,
      );
    };
  }, [refresh]);

  return {
    status,
    agenda,
    errorMessage,
    refresh,
  };
}
