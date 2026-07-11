import { format } from 'date-fns';
import { resolveAcceptedCalibrationAdjustment } from '@/application/daily/dailyTargetCoordinator';
import { buildPlannedActivityCalories } from '@/application/planning/plannedActivityCalories';
import { calculateDailyTarget } from '@/domain/calculations/dailyTarget';
import { getPreviousCalendarWeekRange, resolveReferenceWeight } from '@/domain/calculations/referenceWeight';
import type { LocalDate, NewEntity } from '@/domain/models/common';
import type {
  ProfileImpactField,
  ProfileImpactHistoryEntry,
  UserProfile,
} from '@/domain/models/profile';
import type { DailyMacroTargets } from '@/domain/models/targets';
import { readEndurancePlanningState } from '@/domain/planning/endurancePlanningState';
import { repositories } from '@/infrastructure/repositories/repositories';
import { createEntityId } from '@/shared/utils/entities';

export const MAX_PROFILE_IMPACT_HISTORY_ENTRIES = 12;

const fieldLabels: Record<ProfileImpactField, string> = {
  sexForEnergyEquation: 'sexe utilisé pour les calculs',
  ageInformation: 'âge ou date de naissance',
  heightCm: 'taille',
  initialWeightKg: 'poids initial',
  goal: 'objectif',
  targetWeeklyWeightChangePercent: 'variation hebdomadaire',
  occupationalActivity: 'activité professionnelle',
  dailyStepGoal: 'objectif de pas',
  proteinGramsPerKg: 'cible de protéines',
  fatGramsPerKg: 'cible de lipides',
};

export function profileImpactFieldLabel(field: ProfileImpactField): string {
  return fieldLabels[field];
}

export interface ProfileImpactTargetSnapshot {
  targetCaloriesKcal: number;
  macros: DailyMacroTargets;
  calculationWeightKg: number;
}

export interface ProfileImpactPreview {
  date: LocalDate;
  changedFields: ProfileImpactField[];
  changedFieldLabels: string[];
  before: ProfileImpactTargetSnapshot;
  after: ProfileImpactTargetSnapshot;
}

export function detectProfileImpactFields(
  current: UserProfile,
  next: NewEntity<UserProfile>,
): ProfileImpactField[] {
  const changed: ProfileImpactField[] = [];
  const scalarFields: readonly ProfileImpactField[] = [
    'sexForEnergyEquation',
    'heightCm',
    'initialWeightKg',
    'goal',
    'targetWeeklyWeightChangePercent',
    'occupationalActivity',
    'dailyStepGoal',
    'proteinGramsPerKg',
    'fatGramsPerKg',
  ];

  const ageChanged = current.ageInformation.mode !== next.ageInformation.mode
    || (current.ageInformation.mode === 'birthDate'
      && next.ageInformation.mode === 'birthDate'
      && current.ageInformation.birthDate !== next.ageInformation.birthDate)
    || (current.ageInformation.mode === 'age'
      && next.ageInformation.mode === 'age'
      && current.ageInformation.ageYears !== next.ageInformation.ageYears);
  if (ageChanged) changed.push('ageInformation');

  for (const field of scalarFields) {
    if (current[field] !== next[field]) changed.push(field);
  }

  return changed;
}

async function calculateProfileTarget(
  date: LocalDate,
  profile: UserProfile,
): Promise<ProfileImpactTargetSnapshot> {
  const referencePeriod = getPreviousCalendarWeekRange(date);
  const [
    settings,
    previousWeekEntries,
    stepsEntry,
    activities,
    adjustments,
    strengthSessions,
  ] = await Promise.all([
    repositories.settings.get(),
    repositories.weight.listBetween(referencePeriod.start, referencePeriod.end),
    repositories.steps.getByDate(date),
    repositories.activities.listByDate(date),
    repositories.weeklyReviews.listAdjustments(),
    repositories.workoutSessions.listAll(),
  ]);
  const enduranceSessions = readEndurancePlanningState().sessions;
  const weight = resolveReferenceWeight(date, profile.initialWeightKg, previousWeekEntries);
  const acceptedCalibrationAdjustmentKcal = resolveAcceptedCalibrationAdjustment(
    adjustments,
    date,
  );
  const plannedActivities = buildPlannedActivityCalories({
    date,
    weightKg: weight.weightKg,
    settings,
    activities,
    strengthSessions,
    enduranceSessions,
  });
  const result = calculateDailyTarget({
    date,
    profile,
    settings,
    weightKg: weight.weightKg,
    totalSteps: stepsEntry?.totalSteps ?? 0,
    activities,
    plannedActivities,
    acceptedCalibrationAdjustmentKcal,
  });

  return {
    targetCaloriesKcal: result.targetCaloriesKcal,
    macros: result.macros,
    calculationWeightKg: result.calculationWeightKg,
  };
}

export async function previewProfileImpact(
  current: UserProfile,
  next: NewEntity<UserProfile>,
  date: LocalDate = format(new Date(), 'yyyy-MM-dd'),
): Promise<ProfileImpactPreview> {
  const nextProfile: UserProfile = {
    ...current,
    ...next,
    updatedAt: current.updatedAt,
  };
  const changedFields = detectProfileImpactFields(current, next);
  const [before, after] = await Promise.all([
    calculateProfileTarget(date, current),
    calculateProfileTarget(date, nextProfile),
  ]);

  return {
    date,
    changedFields,
    changedFieldLabels: changedFields.map(profileImpactFieldLabel),
    before,
    after,
  };
}

export function createProfileImpactHistoryEntry(
  preview: ProfileImpactPreview,
  changedAt = new Date().toISOString(),
): ProfileImpactHistoryEntry {
  const caloriesChanged = preview.before.targetCaloriesKcal !== preview.after.targetCaloriesKcal;
  const macroChanged = JSON.stringify(preview.before.macros) !== JSON.stringify(preview.after.macros);
  const summary = caloriesChanged || macroChanged
    ? 'La modification a changé les objectifs nutritionnels calculés pour la journée.'
    : 'La modification n’a pas changé les objectifs nutritionnels calculés pour la journée.';

  return {
    id: createEntityId(),
    changedAt,
    effectiveDate: preview.date,
    changedFields: preview.changedFields,
    summary,
    beforeTargetCaloriesKcal: preview.before.targetCaloriesKcal,
    afterTargetCaloriesKcal: preview.after.targetCaloriesKcal,
    beforeMacros: preview.before.macros,
    afterMacros: preview.after.macros,
  };
}

export function appendProfileImpactHistory(
  current: readonly ProfileImpactHistoryEntry[] | undefined,
  entry: ProfileImpactHistoryEntry,
): ProfileImpactHistoryEntry[] {
  return [entry, ...(current ?? [])]
    .sort((left, right) => right.changedAt.localeCompare(left.changedAt))
    .slice(0, MAX_PROFILE_IMPACT_HISTORY_ENTRIES);
}
