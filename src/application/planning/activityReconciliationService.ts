import type { Activity, ActivityType } from '@/domain/models/activity';
import type { PlannedActivityReference, PlannedActivitySource } from '@/domain/models/plannedActivity';
import {
  plannedActivityReferenceKey,
  samePlannedActivityReference,
} from '@/domain/models/plannedActivity';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import {
  readEndurancePlanningState,
  writeEndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import type { WorkoutSession } from '@/domain/models/strength';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export interface PlannedActivityLinkOption {
  key: string;
  reference: PlannedActivityReference;
  title: string;
  date: string;
  activityType: ActivityType;
  alreadyLinkedActivityId?: string;
}

export interface ActivityReconciliationDependencies {
  activities: Pick<ActivityRepository, 'listAll' | 'save'>;
  workoutSessions: Pick<WorkoutSessionRepository, 'listAll' | 'getById' | 'update'>;
  readEnduranceSessions: () => readonly PlannedEnduranceSession[];
  writeEnduranceSessions: (sessions: readonly PlannedEnduranceSession[]) => void;
}

const defaultDependencies: ActivityReconciliationDependencies = {
  activities: repositories.activities,
  workoutSessions: repositories.workoutSessions,
  readEnduranceSessions: () => readEndurancePlanningState().sessions,
  writeEnduranceSessions: (sessions) => {
    writeEndurancePlanningState({
      version: 1,
      sessions: sessions.map((session) => ({ ...session })),
    });
  },
};

function effectiveStrengthDate(session: WorkoutSession): string {
  return session.plannedDate ?? session.date;
}

function sourceTitle(
  source: PlannedActivitySource,
  strengthSession: WorkoutSession | undefined,
  enduranceSession: PlannedEnduranceSession | undefined,
): string {
  if (source === 'strengthSession') {
    return strengthSession?.sourceTemplateNameSnapshot ?? 'Séance de musculation';
  }
  return enduranceSession?.title ?? 'Activité d’endurance';
}


export async function resolvePlannedActivityLinkOption(
  reference: PlannedActivityReference,
  dependencies: ActivityReconciliationDependencies = defaultDependencies,
): Promise<PlannedActivityLinkOption | undefined> {
  const activities = await dependencies.activities.listAll();
  const linkedActivity = activities.find((activity) =>
    samePlannedActivityReference(activity.plannedActivity, reference)
  );

  if (reference.source === 'strengthSession') {
    const session = await dependencies.workoutSessions.getById(reference.sourceId);
    if (!session || (session.status !== 'planned' && session.completedActivityId === undefined)) {
      return undefined;
    }

    return {
      key: plannedActivityReferenceKey(reference),
      reference,
      title: sourceTitle('strengthSession', session, undefined),
      date: effectiveStrengthDate(session),
      activityType: 'strengthTraining',
      ...((session.completedActivityId ?? linkedActivity?.id)
        ? { alreadyLinkedActivityId: session.completedActivityId ?? linkedActivity!.id }
        : {}),
    };
  }

  const session = dependencies.readEnduranceSessions().find(
    (candidate) => candidate.id === reference.sourceId,
  );
  if (!session || session.status !== 'planned') {
    return undefined;
  }

  return {
    key: plannedActivityReferenceKey(reference),
    reference,
    title: session.title,
    date: session.date,
    activityType: session.activityType,
    ...((session.completedActivityId ?? linkedActivity?.id)
      ? { alreadyLinkedActivityId: session.completedActivityId ?? linkedActivity!.id }
      : {}),
  };
}

export async function listPlannedActivityLinkOptions(
  dependencies: ActivityReconciliationDependencies = defaultDependencies,
): Promise<PlannedActivityLinkOption[]> {
  const [activities, strengthSessions] = await Promise.all([
    dependencies.activities.listAll(),
    dependencies.workoutSessions.listAll(),
  ]);
  const enduranceSessions = dependencies.readEnduranceSessions();
  const linkedBySource = new Map<string, string>();

  for (const activity of activities) {
    if (activity.plannedActivity) {
      linkedBySource.set(
        plannedActivityReferenceKey(activity.plannedActivity),
        activity.id,
      );
    }
  }

  const strengthOptions = strengthSessions
    .filter((session) => session.status === 'planned' || session.completedActivityId !== undefined)
    .map((session): PlannedActivityLinkOption => {
      const reference: PlannedActivityReference = {
        source: 'strengthSession',
        sourceId: session.id,
      };
      return {
        key: plannedActivityReferenceKey(reference),
        reference,
        title: sourceTitle('strengthSession', session, undefined),
        date: effectiveStrengthDate(session),
        activityType: 'strengthTraining',
        ...((session.completedActivityId ?? linkedBySource.get(plannedActivityReferenceKey(reference)))
          ? { alreadyLinkedActivityId: session.completedActivityId ?? linkedBySource.get(plannedActivityReferenceKey(reference))! }
          : {}),
      };
    });

  const enduranceOptions = enduranceSessions
    .filter((session) => session.status === 'planned')
    .map((session): PlannedActivityLinkOption => {
      const reference: PlannedActivityReference = {
        source: 'endurancePlanning',
        sourceId: session.id,
      };
      return {
        key: plannedActivityReferenceKey(reference),
        reference,
        title: session.title,
        date: session.date,
        activityType: session.activityType,
        ...((session.completedActivityId ?? linkedBySource.get(plannedActivityReferenceKey(reference)))
          ? { alreadyLinkedActivityId: session.completedActivityId ?? linkedBySource.get(plannedActivityReferenceKey(reference))! }
          : {}),
      };
    });

  return [...strengthOptions, ...enduranceOptions]
    .sort((left, right) => {
      const dateComparison = left.date.localeCompare(right.date);
      return dateComparison !== 0
        ? dateComparison
        : left.title.localeCompare(right.title, 'fr');
    });
}

async function validateReference(
  activity: Pick<Activity, 'id' | 'date' | 'type' | 'plannedActivity'>,
  dependencies: ActivityReconciliationDependencies,
): Promise<void> {
  const reference = activity.plannedActivity;
  if (!reference) return;

  const duplicate = (await dependencies.activities.listAll()).find(
    (candidate) =>
      candidate.id !== activity.id &&
      samePlannedActivityReference(candidate.plannedActivity, reference),
  );
  if (duplicate) {
    throw new Error('Cette séance prévue est déjà associée à une autre activité réelle.');
  }

  if (reference.source === 'endurancePlanning') {
    const session = dependencies.readEnduranceSessions().find(
      (candidate) => candidate.id === reference.sourceId,
    );
    if (!session) throw new Error('La séance d’endurance prévue est introuvable.');
    if (session.status === 'skipped') {
      throw new Error('Une séance marquée comme non réalisée ne peut pas être associée.');
    }
    if (session.activityType !== activity.type) {
      throw new Error('Le type de l’activité réelle ne correspond pas à la séance prévue.');
    }
    if (session.completedActivityId && session.completedActivityId !== activity.id) {
      throw new Error('Cette séance prévue est déjà associée à une activité réelle.');
    }
    return;
  }

  const session = await dependencies.workoutSessions.getById(reference.sourceId);
  if (!session) throw new Error('La séance de musculation prévue est introuvable.');
  if (activity.type !== 'strengthTraining') {
    throw new Error('Une séance de musculation prévue ne peut être associée qu’à une activité de musculation.');
  }
  if (
    session.completedActivityId === undefined &&
    session.status !== 'planned'
  ) {
    throw new Error('Cette séance de musculation est déjà démarrée ou terminée dans le module détaillé.');
  }
  if (session.completedActivityId && session.completedActivityId !== activity.id) {
    throw new Error('Cette séance prévue est déjà associée à une autre activité réelle.');
  }
}

function clearEnduranceLink(
  activityId: string,
  reference: PlannedActivityReference,
  dependencies: ActivityReconciliationDependencies,
): string | undefined {
  if (reference.source !== 'endurancePlanning') return undefined;
  const sessions = dependencies.readEnduranceSessions();
  let changed = false;
  const next = sessions.map((session) => {
    if (
      session.id !== reference.sourceId ||
      session.completedActivityId !== activityId
    ) {
      return session;
    }
    changed = true;
    const clone = { ...session };
    delete clone.completedActivityId;
    return clone;
  });
  if (changed) dependencies.writeEnduranceSessions(next);
  return changed
    ? sessions.find((session) => session.id === reference.sourceId)?.date
    : undefined;
}

async function clearStrengthLink(
  activityId: string,
  reference: PlannedActivityReference,
  dependencies: ActivityReconciliationDependencies,
): Promise<string | undefined> {
  if (reference.source !== 'strengthSession') return undefined;
  const session = await dependencies.workoutSessions.getById(reference.sourceId);
  if (!session || session.completedActivityId !== activityId) return undefined;
  await dependencies.workoutSessions.update(session.id, {
    status: 'planned',
    date: session.plannedDate ?? session.originalPlannedDate ?? session.date,
    completedActivityId: undefined,
    completedAt: undefined,
    durationMinutes: undefined,
  });
  return effectiveStrengthDate(session);
}

async function setSourceLink(
  activity: Activity,
  dependencies: ActivityReconciliationDependencies,
): Promise<string | undefined> {
  const reference = activity.plannedActivity;
  if (!reference) return undefined;

  if (reference.source === 'endurancePlanning') {
    const sessions = dependencies.readEnduranceSessions();
    const session = sessions.find((candidate) => candidate.id === reference.sourceId);
    dependencies.writeEnduranceSessions(
      sessions.map((session) => session.id === reference.sourceId
        ? {
            ...session,
            completedActivityId: activity.id,
            updatedAt: activity.updatedAt,
          }
        : session),
    );
    return session?.date;
  }

  const session = await dependencies.workoutSessions.getById(reference.sourceId);
  if (!session) return undefined;
  await dependencies.workoutSessions.update(session.id, {
    status: 'completed',
    date: activity.date,
    durationMinutes: activity.durationMinutes,
    completedAt: activity.updatedAt,
    completedActivityId: activity.id,
  });
  return effectiveStrengthDate(session);
}

export async function validateActivityPlannedLink(
  activity: Pick<Activity, 'id' | 'date' | 'type' | 'plannedActivity'>,
  dependencies: ActivityReconciliationDependencies = defaultDependencies,
): Promise<void> {
  await validateReference(activity, dependencies);
}

export async function reconcileActivityPlannedLink(
  previous: Activity | undefined,
  saved: Activity,
  dependencies: ActivityReconciliationDependencies = defaultDependencies,
): Promise<string[]> {
  await validateReference(saved, dependencies);
  const affectedDates = new Set<string>([saved.date]);

  if (
    previous?.plannedActivity &&
    !samePlannedActivityReference(previous.plannedActivity, saved.plannedActivity)
  ) {
    const enduranceDate = clearEnduranceLink(previous.id, previous.plannedActivity, dependencies);
    const strengthDate = await clearStrengthLink(previous.id, previous.plannedActivity, dependencies);
    if (enduranceDate) affectedDates.add(enduranceDate);
    if (strengthDate) affectedDates.add(strengthDate);
  }

  const linkedDate = await setSourceLink(saved, dependencies);
  if (linkedDate) affectedDates.add(linkedDate);
  return [...affectedDates];
}

export async function unlinkDeletedActivity(
  activity: Activity,
  dependencies: ActivityReconciliationDependencies = defaultDependencies,
): Promise<string[]> {
  if (!activity.plannedActivity) return [activity.date];
  const affectedDates = new Set<string>([activity.date]);
  const enduranceDate = clearEnduranceLink(activity.id, activity.plannedActivity, dependencies);
  const strengthDate = await clearStrengthLink(activity.id, activity.plannedActivity, dependencies);
  if (enduranceDate) affectedDates.add(enduranceDate);
  if (strengthDate) affectedDates.add(strengthDate);
  return [...affectedDates];
}


export async function unlinkPlannedSource(
  reference: PlannedActivityReference,
  dependencies: ActivityReconciliationDependencies = defaultDependencies,
): Promise<Activity | undefined> {
  const linkedActivity = (await dependencies.activities.listAll()).find(
    (activity) => samePlannedActivityReference(activity.plannedActivity, reference),
  );
  if (!linkedActivity) return undefined;

  const next = { ...linkedActivity };
  delete next.plannedActivity;
  return dependencies.activities.save(next);
}

export function activityLinkedToSource(
  activity: Activity,
  source: PlannedActivitySource,
  sourceId: string,
): boolean {
  return activity.plannedActivity?.source === source
    && activity.plannedActivity.sourceId === sourceId;
}
