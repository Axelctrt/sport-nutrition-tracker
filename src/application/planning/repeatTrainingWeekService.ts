import {
  addDays,
  differenceInCalendarDays,
  parseISO,
} from 'date-fns';

import {
  getWeekStart,
  listWeeklyPlanning,
  planWorkoutSessionFromTemplate,
  planningDateForSession,
} from '@/application/strength/weeklyPlanningService';
import type {
  WorkoutSessionSummary,
} from '@/application/strength/workoutSessionService';
import type {
  EntityId,
  LocalDate,
} from '@/domain/models/common';
import type {
  StrengthExerciseRepository,
} from '@/infrastructure/repositories/contracts/StrengthExerciseRepository';
import type {
  WorkoutSessionRepository,
} from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import type {
  WorkoutTemplateRepository,
} from '@/infrastructure/repositories/contracts/WorkoutTemplateRepository';
import {
  readEndurancePlanningState,
  writeEndurancePlanningState,
  type EndurancePlanningState,
  type PlannedEnduranceSession,
} from '@/domain/planning/endurancePlanningState';
import { createEntityId } from '@/shared/utils/entities';
import { toLocalDate } from '@/shared/utils/dates';

export interface RepeatTrainingWeekDependencies {
  workoutSessions: WorkoutSessionRepository;
  workoutTemplates: WorkoutTemplateRepository;
  strengthExercises: StrengthExerciseRepository;
}

export interface RepeatableStrengthSession {
  templateId: EntityId;
  plannedDate: LocalDate;
}

export interface RepeatTrainingWeekPlan {
  sourceWeekStart: LocalDate;
  targetWeekStart: LocalDate;
  strengthToCreate: RepeatableStrengthSession[];
  enduranceToCreate: PlannedEnduranceSession[];
  ignoredStrengthCount: number;
  ignoredEnduranceCount: number;
}

export interface RepeatTrainingWeekResult {
  sourceWeekStart: LocalDate;
  targetWeekStart: LocalDate;
  createdStrengthCount: number;
  createdEnduranceCount: number;
  ignoredStrengthCount: number;
  ignoredEnduranceCount: number;
  failedStrengthCount: number;
}

function weekOffset(
  date: LocalDate,
  weekStart: LocalDate,
): number {
  return differenceInCalendarDays(
    parseISO(date),
    parseISO(weekStart),
  );
}

function dateAtOffset(
  weekStart: LocalDate,
  offset: number,
): LocalDate {
  return toLocalDate(
    addDays(parseISO(weekStart), offset),
  );
}

function isDateInsideWeek(
  date: LocalDate,
  weekStart: LocalDate,
): boolean {
  const offset = weekOffset(date, weekStart);
  return offset >= 0 && offset <= 6;
}

function strengthKey(
  templateId: EntityId,
  date: LocalDate,
): string {
  return `${templateId}::${date}`;
}

function enduranceKey(
  session: Pick<
    PlannedEnduranceSession,
    'activityType' | 'date' | 'title'
  >,
): string {
  return [
    session.activityType,
    session.date,
    session.title.trim().toLocaleLowerCase('fr'),
  ].join('::');
}

function repeatableStrengthSessions(
  summaries: WorkoutSessionSummary[],
): RepeatableStrengthSession[] {
  return summaries.flatMap(({ session }) => {
    if (
      !session.sourceTemplateId ||
      session.status === 'abandoned'
    ) {
      return [];
    }

    return [
      {
        templateId: session.sourceTemplateId,
        plannedDate:
          planningDateForSession(session),
      },
    ];
  });
}

function cloneEnduranceSession(
  session: PlannedEnduranceSession,
  targetDate: LocalDate,
  timestamp: string,
): PlannedEnduranceSession {
  const {
    id: _id,
    date: _date,
    status: _status,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    skippedAt: _skippedAt,
    ...content
  } = session;

  return {
    ...content,
    id: createEntityId(),
    date: targetDate,
    status: 'planned',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildRepeatTrainingWeekPlan(
  sourceStrength: RepeatableStrengthSession[],
  targetStrength: RepeatableStrengthSession[],
  enduranceState: EndurancePlanningState,
  sourceWeekStartInput: LocalDate,
  targetWeekStartInput: LocalDate,
  now = new Date(),
): RepeatTrainingWeekPlan {
  const sourceWeekStart = getWeekStart(
    sourceWeekStartInput,
  );
  const targetWeekStart = getWeekStart(
    targetWeekStartInput,
  );

  if (sourceWeekStart === targetWeekStart) {
    throw new Error(
      'Choisis une semaine cible différente.',
    );
  }

  const existingStrengthKeys = new Set(
    targetStrength.map(({ templateId, plannedDate }) =>
      strengthKey(templateId, plannedDate),
    ),
  );

  const strengthToCreate: RepeatableStrengthSession[] =
    [];
  let ignoredStrengthCount = 0;

  for (const source of sourceStrength) {
    if (
      !isDateInsideWeek(
        source.plannedDate,
        sourceWeekStart,
      )
    ) {
      continue;
    }

    const targetDate = dateAtOffset(
      targetWeekStart,
      weekOffset(
        source.plannedDate,
        sourceWeekStart,
      ),
    );
    const key = strengthKey(
      source.templateId,
      targetDate,
    );

    if (existingStrengthKeys.has(key)) {
      ignoredStrengthCount += 1;
      continue;
    }

    existingStrengthKeys.add(key);
    strengthToCreate.push({
      templateId: source.templateId,
      plannedDate: targetDate,
    });
  }

  const existingEnduranceKeys = new Set(
    enduranceState.sessions
      .filter(({ date }) =>
        isDateInsideWeek(
          date,
          targetWeekStart,
        ),
      )
      .map(enduranceKey),
  );
  const timestamp = now.toISOString();
  const enduranceToCreate:
    PlannedEnduranceSession[] = [];
  let ignoredEnduranceCount = 0;

  for (const source of enduranceState.sessions) {
    if (
      !isDateInsideWeek(
        source.date,
        sourceWeekStart,
      )
    ) {
      continue;
    }

    const targetDate = dateAtOffset(
      targetWeekStart,
      weekOffset(source.date, sourceWeekStart),
    );
    const candidate = {
      ...source,
      date: targetDate,
    };
    const key = enduranceKey(candidate);

    if (existingEnduranceKeys.has(key)) {
      ignoredEnduranceCount += 1;
      continue;
    }

    existingEnduranceKeys.add(key);
    enduranceToCreate.push(
      cloneEnduranceSession(
        source,
        targetDate,
        timestamp,
      ),
    );
  }

  return {
    sourceWeekStart,
    targetWeekStart,
    strengthToCreate,
    enduranceToCreate,
    ignoredStrengthCount,
    ignoredEnduranceCount,
  };
}

export async function repeatTrainingWeek(
  dependencies: RepeatTrainingWeekDependencies,
  sourceWeekStartInput: LocalDate,
  targetWeekStartInput: LocalDate,
  now = new Date(),
): Promise<RepeatTrainingWeekResult> {
  const sourceWeekStart = getWeekStart(
    sourceWeekStartInput,
  );
  const targetWeekStart = getWeekStart(
    targetWeekStartInput,
  );

  const [sourceDays, targetDays] =
    await Promise.all([
      listWeeklyPlanning(
        dependencies.workoutSessions,
        sourceWeekStart,
      ),
      listWeeklyPlanning(
        dependencies.workoutSessions,
        targetWeekStart,
      ),
    ]);

  const sourceStrength = repeatableStrengthSessions(
    sourceDays.flatMap(({ sessions }) => sessions),
  );
  const targetStrength = repeatableStrengthSessions(
    targetDays.flatMap(({ sessions }) => sessions),
  );
  const enduranceState =
    readEndurancePlanningState();
  const plan = buildRepeatTrainingWeekPlan(
    sourceStrength,
    targetStrength,
    enduranceState,
    sourceWeekStart,
    targetWeekStart,
    now,
  );

  let createdStrengthCount = 0;
  let failedStrengthCount = 0;

  for (const item of plan.strengthToCreate) {
    try {
      await planWorkoutSessionFromTemplate(
        dependencies.workoutSessions,
        dependencies.workoutTemplates,
        dependencies.strengthExercises,
        item.templateId,
        item.plannedDate,
        now,
      );
      createdStrengthCount += 1;
    } catch {
      failedStrengthCount += 1;
    }
  }

  if (plan.enduranceToCreate.length > 0) {
    writeEndurancePlanningState({
      version: 1,
      sessions: [
        ...enduranceState.sessions,
        ...plan.enduranceToCreate,
      ],
    });
  }

  return {
    sourceWeekStart: plan.sourceWeekStart,
    targetWeekStart: plan.targetWeekStart,
    createdStrengthCount,
    createdEnduranceCount:
      plan.enduranceToCreate.length,
    ignoredStrengthCount:
      plan.ignoredStrengthCount,
    ignoredEnduranceCount:
      plan.ignoredEnduranceCount,
    failedStrengthCount,
  };
}
