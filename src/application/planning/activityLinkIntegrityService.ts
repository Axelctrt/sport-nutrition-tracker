import type { Activity, ActivityType } from '@/domain/models/activity';
import type { EntityChanges } from '@/domain/models/common';
import type { PlannedActivityReference } from '@/domain/models/plannedActivity';
import {
  plannedActivityReferenceKey,
  samePlannedActivityReference,
} from '@/domain/models/plannedActivity';
import type { WorkoutSession } from '@/domain/models/strength';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import {
  readEndurancePlanningState,
  writeEndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export interface ActivityLinkIntegrityDependencies {
  activities: Pick<ActivityRepository, 'listAll' | 'save'>;
  workoutSessions: Pick<WorkoutSessionRepository, 'listAll' | 'update'>;
  readEnduranceSessions: () => readonly PlannedEnduranceSession[];
  writeEnduranceSessions: (sessions: readonly PlannedEnduranceSession[]) => void;
}

export interface ActivityLinkIntegrityOptions {
  removeDanglingActivityReferences?: boolean;
}

export interface ActivityLinkIntegrityReport {
  inspectedActivities: number;
  inspectedPlannedSources: number;
  repairedActivityReferences: number;
  removedInvalidActivityReferences: number;
  repairedSourceMirrors: number;
  clearedInvalidSourceMirrors: number;
  resolvedDuplicateClaims: number;
}

const defaultDependencies: ActivityLinkIntegrityDependencies = {
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

interface PlannedSource {
  reference: PlannedActivityReference;
  activityType: ActivityType;
  completedActivityId?: string;
  strengthSession?: WorkoutSession;
  enduranceSession?: PlannedEnduranceSession;
}

function sourceForStrength(session: WorkoutSession): PlannedSource {
  return {
    reference: { source: 'strengthSession', sourceId: session.id },
    activityType: 'strengthTraining',
    ...(session.completedActivityId ? { completedActivityId: session.completedActivityId } : {}),
    strengthSession: session,
  };
}

function sourceForEndurance(session: PlannedEnduranceSession): PlannedSource {
  return {
    reference: { source: 'endurancePlanning', sourceId: session.id },
    activityType: session.activityType,
    ...(session.completedActivityId ? { completedActivityId: session.completedActivityId } : {}),
    enduranceSession: session,
  };
}

function sourceAcceptsActivity(source: PlannedSource, activity: Activity): boolean {
  if (source.activityType !== activity.type) return false;
  if (source.enduranceSession?.status === 'skipped') return false;
  return true;
}

function newestActivityFirst(left: Activity, right: Activity): number {
  const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);
  return updatedComparison !== 0 ? updatedComparison : left.id.localeCompare(right.id);
}

function withoutPlannedActivity(activity: Activity): Activity {
  const next = { ...activity };
  delete next.plannedActivity;
  return next;
}

function withPlannedActivity(
  activity: Activity,
  reference: PlannedActivityReference,
): Activity {
  return {
    ...activity,
    plannedActivity: { ...reference },
  };
}

export async function reconcilePersistedActivityLinks(
  dependencies: ActivityLinkIntegrityDependencies = defaultDependencies,
  options: ActivityLinkIntegrityOptions = {},
): Promise<ActivityLinkIntegrityReport> {
  const [storedActivities, storedStrengthSessions] = await Promise.all([
    dependencies.activities.listAll(),
    dependencies.workoutSessions.listAll(),
  ]);
  const storedEnduranceSessions = dependencies.readEnduranceSessions().map(
    (session) => ({ ...session }),
  );
  const activities = new Map(
    storedActivities.map((activity) => [activity.id, { ...activity }] as const),
  );
  const strengthSessions = new Map(
    storedStrengthSessions.map((session) => [session.id, { ...session }] as const),
  );
  const enduranceSessions = new Map(
    storedEnduranceSessions.map((session) => [session.id, { ...session }] as const),
  );
  const sources = new Map<string, PlannedSource>();

  for (const session of strengthSessions.values()) {
    const source = sourceForStrength(session);
    sources.set(plannedActivityReferenceKey(source.reference), source);
  }
  for (const session of enduranceSessions.values()) {
    const source = sourceForEndurance(session);
    sources.set(plannedActivityReferenceKey(source.reference), source);
  }

  const changedActivities = new Set<string>();
  const changedStrengthSessions = new Set<string>();
  let enduranceChanged = false;
  const report: ActivityLinkIntegrityReport = {
    inspectedActivities: activities.size,
    inspectedPlannedSources: sources.size,
    repairedActivityReferences: 0,
    removedInvalidActivityReferences: 0,
    repairedSourceMirrors: 0,
    clearedInvalidSourceMirrors: 0,
    resolvedDuplicateClaims: 0,
  };

  for (const activity of activities.values()) {
    if (!activity.plannedActivity) continue;
    const source = sources.get(plannedActivityReferenceKey(activity.plannedActivity));
    const shouldRemove = source
      ? !sourceAcceptsActivity(source, activity)
      : options.removeDanglingActivityReferences === true;
    if (!shouldRemove) continue;

    activities.set(activity.id, withoutPlannedActivity(activity));
    changedActivities.add(activity.id);
    report.removedInvalidActivityReferences += 1;
  }

  const claims = new Map<string, Activity[]>();
  for (const activity of activities.values()) {
    if (!activity.plannedActivity) continue;
    const key = plannedActivityReferenceKey(activity.plannedActivity);
    const values = claims.get(key) ?? [];
    values.push(activity);
    claims.set(key, values);
  }

  for (const [key, source] of sources) {
    const explicitClaims = (claims.get(key) ?? []).sort(newestActivityFirst);
    const mirroredActivity = source.completedActivityId
      ? activities.get(source.completedActivityId)
      : undefined;
    let canonical = explicitClaims.find(
      (activity) => activity.id === source.completedActivityId,
    ) ?? explicitClaims[0];

    if (
      !canonical &&
      mirroredActivity &&
      sourceAcceptsActivity(source, mirroredActivity) &&
      !mirroredActivity.plannedActivity
    ) {
      canonical = withPlannedActivity(mirroredActivity, source.reference);
      activities.set(canonical.id, canonical);
      changedActivities.add(canonical.id);
      report.repairedActivityReferences += 1;
    }

    for (const duplicate of explicitClaims) {
      if (duplicate.id === canonical?.id) continue;
      activities.set(duplicate.id, withoutPlannedActivity(duplicate));
      changedActivities.add(duplicate.id);
      report.resolvedDuplicateClaims += 1;
    }

    if (canonical) {
      if (!samePlannedActivityReference(canonical.plannedActivity, source.reference)) {
        canonical = withPlannedActivity(canonical, source.reference);
        activities.set(canonical.id, canonical);
        changedActivities.add(canonical.id);
        report.repairedActivityReferences += 1;
      }

      if (source.strengthSession && source.strengthSession.completedActivityId !== canonical.id) {
        const session = source.strengthSession;
        strengthSessions.set(session.id, {
          ...session,
          completedActivityId: canonical.id,
          status: 'completed',
          date: canonical.date,
          durationMinutes: canonical.durationMinutes,
          completedAt: canonical.updatedAt,
        });
        changedStrengthSessions.add(session.id);
        report.repairedSourceMirrors += 1;
      }
      if (source.enduranceSession && source.enduranceSession.completedActivityId !== canonical.id) {
        enduranceSessions.set(source.enduranceSession.id, {
          ...source.enduranceSession,
          completedActivityId: canonical.id,
          updatedAt: canonical.updatedAt,
        });
        enduranceChanged = true;
        report.repairedSourceMirrors += 1;
      }
      continue;
    }

    if (!source.completedActivityId) continue;
    if (source.strengthSession) {
      const session = source.strengthSession;
      const restoredDate = session.plannedDate ?? session.originalPlannedDate ?? session.date;
      const restoredSession = {
        ...session,
        status: 'planned' as const,
        date: restoredDate,
      };
      delete restoredSession.completedActivityId;
      delete restoredSession.completedAt;
      delete restoredSession.durationMinutes;
      strengthSessions.set(session.id, restoredSession);
      changedStrengthSessions.add(session.id);
    } else if (source.enduranceSession) {
      const next = { ...source.enduranceSession };
      delete next.completedActivityId;
      enduranceSessions.set(next.id, next);
      enduranceChanged = true;
    }
    report.clearedInvalidSourceMirrors += 1;
  }

  for (const id of changedActivities) {
    await dependencies.activities.save(activities.get(id)!);
  }
  for (const id of changedStrengthSessions) {
    const session = strengthSessions.get(id)!;
    const changes: EntityChanges<WorkoutSession> = {
      completedActivityId: session.completedActivityId,
      status: session.status,
      date: session.date,
      completedAt: session.completedAt,
      durationMinutes: session.durationMinutes,
    };
    await dependencies.workoutSessions.update(id, changes);
  }
  if (enduranceChanged) {
    dependencies.writeEnduranceSessions([...enduranceSessions.values()]);
  }

  return report;
}

export async function reconcilePersistedActivityLinksBestEffort(
  dependencies: ActivityLinkIntegrityDependencies = defaultDependencies,
  options: ActivityLinkIntegrityOptions = {},
): Promise<ActivityLinkIntegrityReport | undefined> {
  try {
    return await reconcilePersistedActivityLinks(dependencies, options);
  } catch {
    return undefined;
  }
}
