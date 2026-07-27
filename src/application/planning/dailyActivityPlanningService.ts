import {
  listWorkoutSessions,
  type WorkoutSessionSummary,
} from '@/application/strength/workoutSessionService';
import {
  planEmptyWorkoutSession,
  planWorkoutSessionFromTemplate,
  planningDateForSession,
  reschedulePlannedWorkoutSession,
  skipPlannedWorkoutSession,
  startPlannedWorkoutSession,
  type PlannedWorkoutEnergyInput,
} from '@/application/strength/weeklyPlanningService';
import { listWorkoutTemplates, type WorkoutTemplateSummary } from '@/application/strength/workoutTemplateService';
import {
  savePlannedEnduranceSession,
  setPlannedEnduranceStatus,
  type PlannedEnduranceInput,
} from '@/application/planning/endurancePlanningService';
import { recalculatePlannedActivityTargetsForCurrentProfile } from '@/application/planning/plannedActivityTargetService';
import type { Activity } from '@/domain/models/activity';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type { StrengthSessionStyle, WorkoutSession } from '@/domain/models/strength';
import {
  readEndurancePlanningState,
  type PlannedEnduranceSession,
} from '@/domain/planning/endurancePlanningState';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import type { StrengthExerciseRepository } from '@/infrastructure/repositories/contracts/StrengthExerciseRepository';
import type { StrengthSetRepository } from '@/infrastructure/repositories/contracts/StrengthSetRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import type { WorkoutTemplateRepository } from '@/infrastructure/repositories/contracts/WorkoutTemplateRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export interface DailyEndurancePlan {
  session: PlannedEnduranceSession;
  completedActivity?: Activity;
}

export interface DailyActivityPlanningSnapshot {
  strengthSessions: WorkoutSessionSummary[];
  enduranceSessions: DailyEndurancePlan[];
  templates: WorkoutTemplateSummary[];
}

export interface PlanDailyStrengthInput extends PlannedWorkoutEnergyInput {
  date: LocalDate;
  templateId?: EntityId;
}

export interface UpdateDailyStrengthInput {
  sessionId: EntityId;
  date: LocalDate;
  plannedDurationMinutes: number;
  strengthSessionStyle: StrengthSessionStyle;
}

export interface DailyActivityPlanningDependencies {
  workoutSessions: WorkoutSessionRepository;
  workoutTemplates: WorkoutTemplateRepository;
  strengthExercises: StrengthExerciseRepository;
  strengthSets: StrengthSetRepository;
  activities: Pick<ActivityRepository, 'listByDate'>;
  readEnduranceSessions: () => readonly PlannedEnduranceSession[];
  recalculateTargets: (dates: readonly LocalDate[]) => Promise<void>;
}

const defaultDependencies: DailyActivityPlanningDependencies = {
  workoutSessions: repositories.workoutSessions,
  workoutTemplates: repositories.workoutTemplates,
  strengthExercises: repositories.strengthExercises,
  strengthSets: repositories.strengthSets,
  activities: repositories.activities,
  readEnduranceSessions: () => readEndurancePlanningState().sessions,
  recalculateTargets: recalculatePlannedActivityTargetsForCurrentProfile,
};

export async function loadDailyActivityPlanning(
  date: LocalDate,
  dependencies: DailyActivityPlanningDependencies = defaultDependencies,
): Promise<DailyActivityPlanningSnapshot> {
  const [strengthSessions, templates, activities] = await Promise.all([
    listWorkoutSessions(dependencies.workoutSessions),
    listWorkoutTemplates(dependencies.workoutTemplates, false),
    dependencies.activities.listByDate(date),
  ]);
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));

  return {
    strengthSessions: strengthSessions.filter(({ session }) => (
      planningDateForSession(session) === date
      && session.status !== 'skipped'
      && session.status !== 'abandoned'
    )),
    enduranceSessions: dependencies.readEnduranceSessions()
      .filter((session) => session.date === date && session.status !== 'skipped')
      .map((session) => {
        const completedActivity = session.completedActivityId
          ? activitiesById.get(session.completedActivityId)
          : undefined;
        return {
          session,
          ...(completedActivity ? { completedActivity } : {}),
        };
      }),
    templates,
  };
}

export async function planDailyStrengthActivity(
  input: PlanDailyStrengthInput,
  dependencies: DailyActivityPlanningDependencies = defaultDependencies,
): Promise<WorkoutSession> {
  const energy = {
    plannedDurationMinutes: input.plannedDurationMinutes,
    strengthSessionStyle: input.strengthSessionStyle,
  };
  const created = input.templateId
    ? await planWorkoutSessionFromTemplate(
        dependencies.workoutSessions,
        dependencies.workoutTemplates,
        dependencies.strengthExercises,
        input.templateId,
        input.date,
        energy,
      )
    : await planEmptyWorkoutSession(
        dependencies.workoutSessions,
        input.date,
        energy,
      );
  await dependencies.recalculateTargets([input.date]);
  return created.session;
}

export async function updateDailyStrengthActivity(
  input: UpdateDailyStrengthInput,
  dependencies: DailyActivityPlanningDependencies = defaultDependencies,
): Promise<WorkoutSession> {
  const previous = await dependencies.workoutSessions.getById(input.sessionId);
  if (!previous || previous.status !== 'planned') {
    throw new Error('Seule une séance encore prévue peut être modifiée.');
  }
  const previousDate = planningDateForSession(previous);
  const rescheduled = previousDate === input.date
    ? previous
    : await reschedulePlannedWorkoutSession(
        dependencies.workoutSessions,
        input.sessionId,
        input.date,
      );
  const updated = await dependencies.workoutSessions.update(rescheduled.id, {
    plannedDurationMinutes: input.plannedDurationMinutes,
    strengthSessionStyle: input.strengthSessionStyle,
  });
  await dependencies.recalculateTargets([previousDate, input.date]);
  return updated;
}

export async function startDailyStrengthActivity(
  sessionId: EntityId,
  dependencies: DailyActivityPlanningDependencies = defaultDependencies,
): Promise<WorkoutSession> {
  const previous = await dependencies.workoutSessions.getById(sessionId);
  const started = await startPlannedWorkoutSession(
    dependencies.workoutSessions,
    sessionId,
    dependencies.strengthSets,
  );
  await dependencies.recalculateTargets([
    ...(previous ? [planningDateForSession(previous)] : []),
    started.date,
  ]);
  return started;
}

export async function skipDailyStrengthActivity(
  sessionId: EntityId,
  dependencies: DailyActivityPlanningDependencies = defaultDependencies,
): Promise<void> {
  const previous = await dependencies.workoutSessions.getById(sessionId);
  await skipPlannedWorkoutSession(dependencies.workoutSessions, sessionId);
  if (previous) {
    await dependencies.recalculateTargets([planningDateForSession(previous)]);
  }
}

export async function restoreDailyStrengthActivity(
  sessionId: EntityId,
  dependencies: DailyActivityPlanningDependencies = defaultDependencies,
): Promise<WorkoutSession> {
  const previous = await dependencies.workoutSessions.getById(sessionId);
  if (!previous || previous.status !== 'skipped') {
    throw new Error('La séance retirée ne peut plus être restaurée.');
  }
  const restored = await dependencies.workoutSessions.update(sessionId, {
    status: 'planned',
    skippedAt: undefined,
  });
  await dependencies.recalculateTargets([planningDateForSession(restored)]);
  return restored;
}

export async function saveDailyEnduranceActivity(
  input: PlannedEnduranceInput,
  sessionId?: string,
  dependencies: DailyActivityPlanningDependencies = defaultDependencies,
): Promise<PlannedEnduranceSession> {
  const previous = sessionId
    ? dependencies.readEnduranceSessions().find((session) => session.id === sessionId)
    : undefined;
  const saved = savePlannedEnduranceSession(input, sessionId);
  await dependencies.recalculateTargets([
    ...(previous ? [previous.date] : []),
    saved.date,
  ]);
  return saved;
}

export async function skipDailyEnduranceActivity(
  sessionId: string,
  dependencies: DailyActivityPlanningDependencies = defaultDependencies,
): Promise<void> {
  const previous = dependencies.readEnduranceSessions()
    .find((session) => session.id === sessionId);
  setPlannedEnduranceStatus(sessionId, 'skipped');
  if (previous) await dependencies.recalculateTargets([previous.date]);
}

export async function restoreDailyEnduranceActivity(
  sessionId: string,
  dependencies: DailyActivityPlanningDependencies = defaultDependencies,
): Promise<PlannedEnduranceSession> {
  const previous = dependencies.readEnduranceSessions()
    .find((session) => session.id === sessionId);
  if (!previous || previous.status !== 'skipped') {
    throw new Error('L’activité retirée ne peut plus être restaurée.');
  }
  setPlannedEnduranceStatus(sessionId, 'planned');
  await dependencies.recalculateTargets([previous.date]);
  const restored = dependencies.readEnduranceSessions()
    .find((session) => session.id === sessionId);
  if (!restored) throw new Error('L’activité restaurée est introuvable.');
  return restored;
}
