import type { EntityId, IsoDateTime, LocalDate } from '@/domain/models/common';
import type {
  DailyActivityDecision,
  DailyCheckIn,
  DailyCheckOut,
  DailyContextFlag,
  DailyContextSyncPreference,
  DailySignalLevel,
} from '@/domain/models/dailyCoaching';
import type { DailyCoachingRepository } from '@/infrastructure/repositories/contracts/DailyCoachingRepository';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import type { StepsRepository } from '@/infrastructure/repositories/contracts/StepsRepository';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { isValidLocalDate } from '@/shared/validation/localDate';

export interface DailyCoachingDay {
  checkIn: DailyCheckIn | undefined;
  activityDecision: DailyActivityDecision | undefined;
  checkOut: DailyCheckOut | undefined;
}

export interface CompleteDailyCheckInInput {
  date: LocalDate;
  weightKg?: number | null;
  sleepDurationMinutes?: number;
  sleepQuality?: DailyCheckIn['sleepQuality'];
  readiness?: DailySignalLevel;
  waistCm?: number;
  contextFlags?: readonly DailyContextFlag[];
  contextSyncPreference?: DailyContextSyncPreference;
  completedAt?: IsoDateTime;
}

export interface SetDailyActivityDecisionInput {
  date: LocalDate;
  decision: DailyActivityDecision['decision'];
  confirmedAt?: IsoDateTime;
}

export interface CompleteDailyCheckOutInput {
  date: LocalDate;
  actualSteps?: number | null;
  hunger?: DailySignalLevel;
  energy?: DailySignalLevel;
  foodJournalComplete: boolean;
  contextFlags?: readonly DailyContextFlag[];
  contextSyncPreference?: DailyContextSyncPreference;
  completedAt?: IsoDateTime;
}

export interface DailyCoachingServiceDependencies {
  dailyCoaching: DailyCoachingRepository;
  weight: Pick<WeightRepository, 'getByDate' | 'upsert'>;
  steps: Pick<StepsRepository, 'getByDate' | 'upsert'>;
  food: Pick<FoodRepository, 'upsertJournalStatus'>;
  now?: () => IsoDateTime;
}

const defaultDependencies: DailyCoachingServiceDependencies = {
  dailyCoaching: repositories.dailyCoaching,
  weight: repositories.weight,
  steps: repositories.steps,
  food: repositories.food,
};

function validateDate(date: LocalDate): void {
  if (!isValidLocalDate(date)) {
    throw new Error('La date du suivi quotidien est invalide.');
  }
}

function validateOptionalRange(
  value: number | undefined,
  field: string,
  minimum: number,
  maximum: number,
): void {
  if (
    value !== undefined
    && (!Number.isFinite(value) || value < minimum || value > maximum)
  ) {
    throw new Error(`${field} doit être compris entre ${minimum} et ${maximum}.`);
  }
}

function uniqueFlags(
  flags: readonly DailyContextFlag[] | undefined,
): DailyContextFlag[] {
  return [...new Set(flags ?? [])];
}

function resolveCompletedAt(
  value: IsoDateTime | undefined,
  dependencies: DailyCoachingServiceDependencies,
): IsoDateTime {
  return value ?? dependencies.now?.() ?? new Date().toISOString();
}

async function resolveWeightEntryId(
  input: CompleteDailyCheckInInput,
  dependencies: DailyCoachingServiceDependencies,
): Promise<EntityId | undefined> {
  if (input.weightKg === null) return undefined;
  if (input.weightKg !== undefined) {
    const entry = await dependencies.weight.upsert({
      date: input.date,
      weightKg: input.weightKg,
    });
    return entry.id;
  }

  return (await dependencies.weight.getByDate(input.date))?.id;
}

async function resolveStepsEntryId(
  input: CompleteDailyCheckOutInput,
  dependencies: DailyCoachingServiceDependencies,
): Promise<EntityId | undefined> {
  if (input.actualSteps === null) return undefined;
  if (input.actualSteps !== undefined) {
    const entry = await dependencies.steps.upsert({
      date: input.date,
      totalSteps: input.actualSteps,
      source: 'manual',
    });
    return entry.id;
  }

  return (await dependencies.steps.getByDate(input.date))?.id;
}

export function readDailyCoachingDay(
  date: LocalDate,
  dependencies: DailyCoachingServiceDependencies = defaultDependencies,
): Promise<DailyCoachingDay> {
  validateDate(date);
  return Promise.all([
    dependencies.dailyCoaching.getCheckIn(date),
    dependencies.dailyCoaching.getActivityDecision(date),
    dependencies.dailyCoaching.getCheckOut(date),
  ]).then(([checkIn, activityDecision, checkOut]) => ({
    checkIn,
    activityDecision,
    checkOut,
  }));
}

export async function completeDailyCheckIn(
  input: CompleteDailyCheckInInput,
  dependencies: DailyCoachingServiceDependencies = defaultDependencies,
): Promise<DailyCheckIn> {
  validateDate(input.date);
  validateOptionalRange(input.weightKg ?? undefined, 'Le poids', 20, 500);
  validateOptionalRange(
    input.sleepDurationMinutes,
    'La durée de sommeil',
    0,
    1_440,
  );
  validateOptionalRange(input.waistCm, 'Le tour de taille', 30, 300);

  const weightEntryId = await resolveWeightEntryId(input, dependencies);
  return dependencies.dailyCoaching.upsertCheckIn({
    date: input.date,
    ...(weightEntryId ? { weightEntryId } : {}),
    ...(input.sleepDurationMinutes === undefined
      ? {}
      : { sleepDurationMinutes: input.sleepDurationMinutes }),
    ...(input.sleepQuality ? { sleepQuality: input.sleepQuality } : {}),
    ...(input.readiness ? { readiness: input.readiness } : {}),
    ...(input.waistCm === undefined ? {} : { waistCm: input.waistCm }),
    contextFlags: uniqueFlags(input.contextFlags),
    contextSyncPreference: input.contextSyncPreference ?? 'localOnly',
    completedAt: resolveCompletedAt(input.completedAt, dependencies),
  });
}

export function setDailyActivityDecision(
  input: SetDailyActivityDecisionInput,
  dependencies: DailyCoachingServiceDependencies = defaultDependencies,
): Promise<DailyActivityDecision> {
  validateDate(input.date);
  const confirmedAt = input.decision === 'open'
    ? undefined
    : resolveCompletedAt(input.confirmedAt, dependencies);

  return dependencies.dailyCoaching.upsertActivityDecision({
    date: input.date,
    decision: input.decision,
    ...(confirmedAt ? { confirmedAt } : {}),
  });
}

export async function completeDailyCheckOut(
  input: CompleteDailyCheckOutInput,
  dependencies: DailyCoachingServiceDependencies = defaultDependencies,
): Promise<DailyCheckOut> {
  validateDate(input.date);
  validateOptionalRange(input.actualSteps ?? undefined, 'Le nombre de pas', 0, 100_000);

  const [stepsEntryId] = await Promise.all([
    resolveStepsEntryId(input, dependencies),
    dependencies.food.upsertJournalStatus({
      date: input.date,
      isComplete: input.foodJournalComplete,
      ...(input.foodJournalComplete
        ? { completedAt: resolveCompletedAt(input.completedAt, dependencies) }
        : {}),
    }),
  ]);

  return dependencies.dailyCoaching.upsertCheckOut({
    date: input.date,
    ...(stepsEntryId ? { stepsEntryId } : {}),
    ...(input.hunger ? { hunger: input.hunger } : {}),
    ...(input.energy ? { energy: input.energy } : {}),
    foodJournalComplete: input.foodJournalComplete,
    contextFlags: uniqueFlags(input.contextFlags),
    contextSyncPreference: input.contextSyncPreference ?? 'localOnly',
    completedAt: resolveCompletedAt(input.completedAt, dependencies),
  });
}
