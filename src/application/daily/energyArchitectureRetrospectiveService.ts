import { parseISO, subDays } from 'date-fns';
import { calculateDailyNutrition } from '@/domain/calculations/nutrition';
import { compareEnergyArchitectures } from '@/domain/calculations/energyArchitectureShadow';
import {
  restoreDailyTargetEnergyContext,
} from '@/domain/calculations/dailyTargetInputSnapshot';
import {
  buildEnergyArchitectureRetrospective,
  type EnergyArchitectureRetrospectiveDay,
  type EnergyArchitectureRetrospectiveReport,
} from '@/domain/calculations/energyArchitectureRetrospective';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import type { DailyCoachingRepository } from '@/infrastructure/repositories/contracts/DailyCoachingRepository';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type { StepsRepository } from '@/infrastructure/repositories/contracts/StepsRepository';
import type { TargetRepository } from '@/infrastructure/repositories/contracts/TargetRepository';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { toLocalDate } from '@/shared/utils/dates';

export const ENERGY_ARCHITECTURE_RETROSPECTIVE_ANALYSIS_DAYS = 28;

export interface EnergyArchitectureRetrospectiveDependencies {
  settings: Pick<SettingsRepository, 'get'>;
  weights: Pick<WeightRepository, 'listBetween'>;
  food: Pick<
    FoodRepository,
    'listEntriesBetween' | 'listJournalStatusesBetween'
  >;
  steps: Pick<StepsRepository, 'listBetween'>;
  targets: Pick<TargetRepository, 'listTargetsBetween'>;
  dailyCoaching: Pick<DailyCoachingRepository, 'listCheckOutsBetween'>;
  activities: Pick<ActivityRepository, 'listBetween'>;
}

const defaultDependencies: EnergyArchitectureRetrospectiveDependencies = {
  settings: repositories.settings,
  weights: repositories.weight,
  food: repositories.food,
  steps: repositories.steps,
  targets: repositories.targets,
  dailyCoaching: repositories.dailyCoaching,
  activities: repositories.activities,
};

function indexByDate<T extends { date: LocalDate }>(
  values: readonly T[],
): Map<LocalDate, T> {
  return new Map(values.map((value) => [value.date, value]));
}

function groupByDate<T extends { date: LocalDate }>(
  values: readonly T[],
): Map<LocalDate, T[]> {
  const grouped = new Map<LocalDate, T[]>();
  for (const value of values) {
    grouped.set(value.date, [...(grouped.get(value.date) ?? []), value]);
  }
  return grouped;
}

export async function loadEnergyArchitectureRetrospective(
  analysisEnd: LocalDate,
  profile: UserProfile,
  dependencies: EnergyArchitectureRetrospectiveDependencies =
    defaultDependencies,
): Promise<EnergyArchitectureRetrospectiveReport> {
  const analysisStart = toLocalDate(subDays(
    parseISO(analysisEnd),
    ENERGY_ARCHITECTURE_RETROSPECTIVE_ANALYSIS_DAYS - 1,
  ));
  const [
    settings,
    weights,
    foodEntries,
    journalStatuses,
    steps,
    targets,
    checkOuts,
    activities,
  ] = await Promise.all([
    dependencies.settings.get(),
    dependencies.weights.listBetween(analysisStart, analysisEnd),
    dependencies.food.listEntriesBetween(analysisStart, analysisEnd),
    dependencies.food.listJournalStatusesBetween(analysisStart, analysisEnd),
    dependencies.steps.listBetween(analysisStart, analysisEnd),
    dependencies.targets.listTargetsBetween(analysisStart, analysisEnd),
    dependencies.dailyCoaching.listCheckOutsBetween(analysisStart, analysisEnd),
    dependencies.activities.listBetween(analysisStart, analysisEnd),
  ]);
  const entriesByDate = groupByDate(foodEntries);
  const activitiesByDate = groupByDate(activities);
  const statusesByDate = indexByDate(journalStatuses);
  const stepsByDate = indexByDate(steps);
  const targetsByDate = indexByDate(targets);
  const checkOutsByDate = indexByDate(checkOuts);
  const dates = Array.from(
    { length: ENERGY_ARCHITECTURE_RETROSPECTIVE_ANALYSIS_DAYS },
    (_, index) => toLocalDate(subDays(
      parseISO(analysisEnd),
      ENERGY_ARCHITECTURE_RETROSPECTIVE_ANALYSIS_DAYS - 1 - index,
    )),
  );

  const days = dates.map<EnergyArchitectureRetrospectiveDay>((date) => {
    const checkOut = checkOutsByDate.get(date);
    const stepEntry = stepsByDate.get(date);
    const linkedSteps = checkOut?.stepsEntryId === stepEntry?.id
      ? stepEntry
      : undefined;
    const target = targetsByDate.get(date);
    const dayEntries = entriesByDate.get(date) ?? [];
    const consumedCaloriesKcal = dayEntries.length > 0
      ? calculateDailyNutrition(dayEntries).caloriesKcal
      : undefined;
    const historicalContext = target?.energyInputSnapshot
      ? restoreDailyTargetEnergyContext(
          target.energyInputSnapshot,
          profile,
          settings,
        )
      : undefined;
    const comparison = linkedSteps && target && historicalContext
      ? compareEnergyArchitectures({
          date,
          profile: historicalContext.profile,
          settings: historicalContext.settings,
          weightKg: target.calculationWeightKg,
          totalSteps: linkedSteps.totalSteps,
          activities: activitiesByDate.get(date) ?? [],
        })
      : undefined;

    return {
      date,
      checkOutCompleted: Boolean(checkOut),
      journalComplete:
        statusesByDate.get(date)?.isComplete
        ?? checkOut?.foodJournalComplete
        ?? false,
      linkedStepsAvailable: Boolean(linkedSteps),
      dailyTargetAvailable: Boolean(target),
      historicalInputsAvailable: Boolean(historicalContext),
      ...(consumedCaloriesKcal === undefined
        ? {}
        : { consumedCaloriesKcal }),
      ...(comparison
        ? {
            currentExpenditureKcal: comparison.currentTotalKcal,
            candidateExpenditureKcal: comparison.candidateTotalKcal,
          }
        : {}),
      hasTemporaryContext: (checkOut?.contextFlags.length ?? 0) > 0,
    };
  });

  return buildEnergyArchitectureRetrospective({
    analysisStart,
    analysisEnd,
    days,
    weights,
  });
}
