import { addDays, addWeeks, endOfWeek, format, parseISO, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type { StrengthSessionStyle, WorkoutSession } from '@/domain/models/strength';
import { planningDateForSession } from '@/domain/strength/strengthPlanning';
import type { StrengthExerciseRepository } from '@/infrastructure/repositories/contracts/StrengthExerciseRepository';
import type { StrengthSetRepository } from '@/infrastructure/repositories/contracts/StrengthSetRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import type { WorkoutTemplateRepository } from '@/infrastructure/repositories/contracts/WorkoutTemplateRepository';
import {
  createWorkoutTemplateSessionSnapshot,
  listWorkoutSessions,
  type WorkoutSessionSummary,
  type WorkoutSessionView,
} from '@/application/strength/workoutSessionService';
import { compareLocalDates, toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';
import { ensurePlannedStrengthSetsForSession } from '@/application/strength/strengthSetService';


export interface PlannedWorkoutEnergyInput {
  plannedDurationMinutes: number;
  strengthSessionStyle: StrengthSessionStyle;
}

function validatePlannedWorkoutEnergy(
  energy: PlannedWorkoutEnergyInput | undefined,
): void {
  if (
    energy &&
    (!Number.isFinite(energy.plannedDurationMinutes) ||
      energy.plannedDurationMinutes <= 0 ||
      energy.plannedDurationMinutes > 1_440)
  ) {
    throw new RepositoryError(
      'La durée prévue doit être comprise entre 1 minute et 24 heures.',
      'create',
    );
  }
}

export interface WeeklyPlanningDay {
  date: LocalDate;
  label: string;
  sessions: WorkoutSessionSummary[];
}

function requireValidDate(date: LocalDate): void {
  if (!isValidLocalDate(date)) {
    throw new RepositoryError('La date choisie est invalide.', 'update');
  }
}

export { planningDateForSession };

export function getWeekStart(date: LocalDate = toLocalDate()): LocalDate {
  requireValidDate(date);
  return toLocalDate(startOfWeek(parseISO(date), { weekStartsOn: 1 }));
}

export function shiftWeek(weekStart: LocalDate, amount: number): LocalDate {
  requireValidDate(weekStart);
  return toLocalDate(addWeeks(parseISO(weekStart), amount));
}

export function formatWeekRange(weekStart: LocalDate): string {
  requireValidDate(weekStart);
  const start = parseISO(weekStart);
  const end = endOfWeek(start, { weekStartsOn: 1 });
  return `Du ${format(start, 'd MMMM', { locale: fr })} au ${format(end, 'd MMMM yyyy', { locale: fr })}`;
}

export function buildPlanningDays(
  weekStart: LocalDate,
  sessions: WorkoutSessionSummary[],
): WeeklyPlanningDay[] {
  requireValidDate(weekStart);
  return Array.from({ length: 7 }, (_, index) => {
    const date = toLocalDate(addDays(parseISO(weekStart), index));
    return {
      date,
      label: format(parseISO(date), 'EEEE d MMMM', { locale: fr }),
      sessions: sessions
        .filter(({ session }) => planningDateForSession(session) === date)
        .sort((left, right) => {
          const leftStarted = left.session.startedAt ?? '';
          const rightStarted = right.session.startedAt ?? '';
          return leftStarted.localeCompare(rightStarted);
        }),
    };
  });
}

export async function listWeeklyPlanning(
  repository: WorkoutSessionRepository,
  weekStart: LocalDate,
): Promise<WeeklyPlanningDay[]> {
  const normalizedWeekStart = getWeekStart(weekStart);
  const weekEnd = toLocalDate(addDays(parseISO(normalizedWeekStart), 6));
  const sessions = (await listWorkoutSessions(repository)).filter(({ session }) => {
    const date = planningDateForSession(session);
    return compareLocalDates(date, normalizedWeekStart) >= 0
      && compareLocalDates(date, weekEnd) <= 0
      && (session.status === 'planned'
        || session.status === 'inProgress'
        || session.status === 'completed'
        || session.status === 'abandoned'
        || session.status === 'skipped');
  });
  return buildPlanningDays(normalizedWeekStart, sessions);
}

export async function planWorkoutSessionFromTemplate(
  sessionRepository: WorkoutSessionRepository,
  templateRepository: WorkoutTemplateRepository,
  exerciseRepository: StrengthExerciseRepository,
  templateId: EntityId,
  scheduledDate: LocalDate,
  energyOrNow?: PlannedWorkoutEnergyInput | Date,
  now = new Date(),
): Promise<WorkoutSessionView> {
  requireValidDate(scheduledDate);
  const energy = energyOrNow instanceof Date ? undefined : energyOrNow;
  const effectiveNow = energyOrNow instanceof Date ? energyOrNow : now;
  validatePlannedWorkoutEnergy(energy);
  const { template, exercises } = await createWorkoutTemplateSessionSnapshot(
    templateRepository,
    exerciseRepository,
    templateId,
  );

  const existing = (await sessionRepository.listAll()).some((session) => (
    session.status === 'planned'
    && session.sourceTemplateId === templateId
    && planningDateForSession(session) === scheduledDate
  ));
  if (existing) {
    throw new RepositoryError('Cette séance est déjà prévue à cette date.', 'create');
  }

  return sessionRepository.createWithExercises({
    date: scheduledDate,
    status: 'planned',
    plannedDate: scheduledDate,
    originalPlannedDate: scheduledDate,
    plannedAt: effectiveNow.toISOString(),
    sourceTemplateId: template.id,
    sourceTemplateNameSnapshot: template.name,
    ...(energy
      ? {
          plannedDurationMinutes: energy.plannedDurationMinutes,
          strengthSessionStyle: energy.strengthSessionStyle,
        }
      : {}),
    ...(template.notes ? { notes: template.notes } : {}),
  }, exercises);
}

export async function planEmptyWorkoutSession(
  sessionRepository: WorkoutSessionRepository,
  scheduledDate: LocalDate,
  energy?: PlannedWorkoutEnergyInput,
  now = new Date(),
): Promise<WorkoutSessionView> {
  requireValidDate(scheduledDate);
  validatePlannedWorkoutEnergy(energy);

  return sessionRepository.createWithExercises({
    date: scheduledDate,
    status: 'planned',
    plannedDate: scheduledDate,
    originalPlannedDate: scheduledDate,
    plannedAt: now.toISOString(),
    ...(energy
      ? {
          plannedDurationMinutes: energy.plannedDurationMinutes,
          strengthSessionStyle: energy.strengthSessionStyle,
        }
      : {}),
  }, []);
}

export async function startPlannedWorkoutSession(
  repository: WorkoutSessionRepository,
  sessionId: EntityId,
  setRepositoryOrNow?: StrengthSetRepository | Date,
  now = new Date(),
): Promise<WorkoutSession> {
  const setRepository = setRepositoryOrNow instanceof Date ? undefined : setRepositoryOrNow;
  const effectiveNow = setRepositoryOrNow instanceof Date ? setRepositoryOrNow : now;
  const current = await repository.getInProgress();
  if (current && current.id !== sessionId) {
    throw new RepositoryError(
      'Une autre séance est déjà en cours. Termine-la ou abandonne-la avant de démarrer la séance prévue.',
      'update',
    );
  }

  const session = await repository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance prévue introuvable.', 'update');
  if (session.status !== 'planned') {
    throw new RepositoryError('Cette séance ne peut plus être démarrée depuis le planning.', 'update');
  }

  const scheduledDate = planningDateForSession(session);
  const started = await repository.update(sessionId, {
    status: 'inProgress',
    plannedDate: scheduledDate,
    date: toLocalDate(effectiveNow),
    startedAt: effectiveNow.toISOString(),
  });
  if (setRepository) {
    await ensurePlannedStrengthSetsForSession(repository, setRepository, sessionId);
  }
  return started;
}

export async function reschedulePlannedWorkoutSession(
  repository: WorkoutSessionRepository,
  sessionId: EntityId,
  scheduledDate: LocalDate,
): Promise<WorkoutSession> {
  requireValidDate(scheduledDate);
  const session = await repository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance prévue introuvable.', 'update');
  if (session.status !== 'planned') {
    throw new RepositoryError('Seule une séance encore prévue peut être reportée.', 'update');
  }
  if (planningDateForSession(session) === scheduledDate) return session;

  const duplicate = (await repository.listAll()).some((candidate) => (
    candidate.id !== sessionId
    && candidate.status === 'planned'
    && candidate.sourceTemplateId === session.sourceTemplateId
    && planningDateForSession(candidate) === scheduledDate
  ));
  if (duplicate) {
    throw new RepositoryError('Cette séance est déjà prévue à la nouvelle date.', 'update');
  }

  return repository.update(sessionId, {
    date: scheduledDate,
    plannedDate: scheduledDate,
    originalPlannedDate: session.originalPlannedDate ?? planningDateForSession(session),
  });
}

export async function skipPlannedWorkoutSession(
  repository: WorkoutSessionRepository,
  sessionId: EntityId,
  now = new Date(),
): Promise<WorkoutSession> {
  const session = await repository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance prévue introuvable.', 'update');
  if (session.status !== 'planned') {
    throw new RepositoryError('Seule une séance encore prévue peut être marquée comme non réalisée.', 'update');
  }

  return repository.update(sessionId, {
    status: 'skipped',
    skippedAt: now.toISOString(),
  });
}
