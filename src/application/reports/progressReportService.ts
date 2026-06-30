import {
  calculateDailyNutrition,
  type DailyNutritionSummary,
} from '@/domain/calculations/nutrition';
import type { ActivityType } from '@/domain/models/activity';
import type { BackupData } from '@/domain/models/backup';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { appDatabase } from '@/infrastructure/database/database';
import { readBackupData } from '@/infrastructure/backup/backupService';

export type ProgressReportSection =
  | 'weight'
  | 'steps'
  | 'activities'
  | 'nutrition'
  | 'strength';

export interface ProgressReportOptions {
  from: string;
  to: string;
  sections: readonly ProgressReportSection[];
  includeIdentity: boolean;
}

export interface ProgressReportProfile {
  firstName?: string;
  goal: 'loss' | 'maintenance' | 'gain';
  dailyStepGoal: number;
}

export interface WeightReportSummary {
  entryCount: number;
  averageWeightKg?: number;
  startWeightKg?: number;
  endWeightKg?: number;
  changeKg?: number;
}

export interface StepsReportSummary {
  trackedDays: number;
  totalSteps: number;
  averageSteps: number;
  targetReachedDays: number;
  targetSteps?: number;
}

export interface ActivityBreakdownItem {
  type: ActivityType;
  sessionCount: number;
  durationMinutes: number;
}

export interface ActivitiesReportSummary {
  sessionCount: number;
  durationMinutes: number;
  estimatedCaloriesKcal: number;
  runningDistanceKm: number;
  cyclingDistanceKm: number;
  swimmingDistanceMeters: number;
  breakdown: ActivityBreakdownItem[];
}

export interface NutritionReportSummary {
  trackedDays: number;
  completedJournalDays: number;
  averageCaloriesKcal: number;
  averageProteinGrams: number;
  averageCarbohydratesGrams: number;
  averageFatGrams: number;
  averageCalorieAdherencePercent?: number;
}

export interface StrengthReportSummary {
  completedSessionCount: number;
  durationMinutes: number;
  completedSetCount: number;
  workingSetCount: number;
  exerciseCount: number;
  totalVolumeKg: number;
  averageRpe?: number;
}

export interface ProgressReport {
  generatedAt: string;
  period: {
    from: string;
    to: string;
    dayCount: number;
  };
  sections: readonly ProgressReportSection[];
  profile?: ProgressReportProfile;
  weight?: WeightReportSummary;
  steps?: StepsReportSummary;
  activities?: ActivitiesReportSummary;
  nutrition?: NutritionReportSummary;
  strength?: StrengthReportSummary;
}

const activityTypeLabels: Record<ActivityType, string> = {
  running: 'Course',
  swimming: 'Natation',
  strengthTraining: 'Musculation',
  cycling: 'Vélo',
  walking: 'Marche',
  otherCardio: 'Autre cardio',
};

const goalLabels: Record<ProgressReportProfile['goal'], string> = {
  loss: 'Perte de poids',
  maintenance: 'Maintien',
  gain: 'Prise de poids',
};

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function isWithinPeriod(
  date: string,
  options: Pick<ProgressReportOptions, 'from' | 'to'>,
): boolean {
  return date >= options.from && date <= options.to;
}

function calculateInclusiveDayCount(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('La période du rapport est invalide.');
  }

  return Math.floor((end - start) / 86_400_000) + 1;
}

function validateOptions(options: ProgressReportOptions): void {
  if (options.from > options.to) {
    throw new Error(
      'La date de début du rapport doit précéder la date de fin.',
    );
  }

  if (options.sections.length === 0) {
    throw new Error(
      'Sélectionne au moins une rubrique pour créer le rapport.',
    );
  }

  const dayCount = calculateInclusiveDayCount(
    options.from,
    options.to,
  );

  if (dayCount > 366) {
    throw new Error(
      'Un rapport peut couvrir au maximum 366 jours.',
    );
  }
}

function createWeightSummary(
  data: BackupData,
  options: ProgressReportOptions,
): WeightReportSummary {
  const entries = data.weights
    .filter((entry) => isWithinPeriod(entry.date, options))
    .sort((left, right) => left.date.localeCompare(right.date));

  if (entries.length === 0) {
    return { entryCount: 0 };
  }

  const startWeightKg = entries[0]!.weightKg;
  const endWeightKg = entries.at(-1)!.weightKg;

  return {
    entryCount: entries.length,
    averageWeightKg: round(
      average(entries.map((entry) => entry.weightKg)),
      2,
    ),
    startWeightKg,
    endWeightKg,
    changeKg: round(endWeightKg - startWeightKg, 2),
  };
}

function createStepsSummary(
  data: BackupData,
  options: ProgressReportOptions,
): StepsReportSummary {
  const entries = data.dailySteps.filter((entry) =>
    isWithinPeriod(entry.date, options),
  );
  const profile = data.userProfile[0];
  const targetSteps = profile?.dailyStepGoal;
  const totalSteps = entries.reduce(
    (total, entry) => total + entry.totalSteps,
    0,
  );

  return {
    trackedDays: entries.length,
    totalSteps,
    averageSteps:
      entries.length === 0
        ? 0
        : Math.round(totalSteps / entries.length),
    targetReachedDays:
      targetSteps === undefined
        ? 0
        : entries.filter((entry) => entry.totalSteps >= targetSteps)
            .length,
    ...(targetSteps === undefined ? {} : { targetSteps }),
  };
}

function createActivitiesSummary(
  data: BackupData,
  options: ProgressReportOptions,
): ActivitiesReportSummary {
  const activities = data.activities.filter((activity) =>
    isWithinPeriod(activity.date, options),
  );
  const breakdownMap = new Map<
    ActivityType,
    ActivityBreakdownItem
  >();

  let runningDistanceKm = 0;
  let cyclingDistanceKm = 0;
  let swimmingDistanceMeters = 0;

  for (const activity of activities) {
    const current = breakdownMap.get(activity.type) ?? {
      type: activity.type,
      sessionCount: 0,
      durationMinutes: 0,
    };

    current.sessionCount += 1;
    current.durationMinutes += activity.durationMinutes;
    breakdownMap.set(activity.type, current);

    if (activity.type === 'running') {
      runningDistanceKm += activity.distanceKm;
    } else if (activity.type === 'cycling') {
      cyclingDistanceKm += activity.distanceKm ?? 0;
    } else if (activity.type === 'swimming') {
      swimmingDistanceMeters += activity.distanceMeters;
    }
  }

  return {
    sessionCount: activities.length,
    durationMinutes: round(
      activities.reduce(
        (total, activity) =>
          total + activity.durationMinutes,
        0,
      ),
      1,
    ),
    estimatedCaloriesKcal: Math.round(
      activities.reduce(
        (total, activity) =>
          total +
          (activity.manualCaloriesKcal ??
            activity.calculation.estimatedCaloriesKcal),
        0,
      ),
    ),
    runningDistanceKm: round(runningDistanceKm, 2),
    cyclingDistanceKm: round(cyclingDistanceKm, 2),
    swimmingDistanceMeters: Math.round(swimmingDistanceMeters),
    breakdown: [...breakdownMap.values()]
      .map((item) => ({
        ...item,
        durationMinutes: round(item.durationMinutes, 1),
      }))
      .sort(
        (left, right) =>
          right.durationMinutes - left.durationMinutes,
      ),
  };
}

function groupNutritionByDate(
  data: BackupData,
  options: ProgressReportOptions,
): Map<string, DailyNutritionSummary> {
  const entriesByDate = new Map<
    string,
    BackupData['foodEntries']
  >();

  for (const entry of data.foodEntries) {
    if (!isWithinPeriod(entry.date, options)) continue;

    const current = entriesByDate.get(entry.date) ?? [];
    current.push(entry);
    entriesByDate.set(entry.date, current);
  }

  return new Map(
    [...entriesByDate.entries()].map(([date, entries]) => [
      date,
      calculateDailyNutrition(entries),
    ]),
  );
}

function createNutritionSummary(
  data: BackupData,
  options: ProgressReportOptions,
): NutritionReportSummary {
  const dailyNutrition = groupNutritionByDate(data, options);
  const days = [...dailyNutrition.values()];
  const targets = new Map(
    data.dailyTargets
      .filter((target) => isWithinPeriod(target.date, options))
      .map((target) => [target.date, target]),
  );
  const adherenceValues = [...dailyNutrition.entries()]
    .map(([date, nutrition]) => {
      const target = targets.get(date);
      if (!target || target.targetCaloriesKcal <= 0) {
        return undefined;
      }

      return (
        (nutrition.caloriesKcal / target.targetCaloriesKcal) *
        100
      );
    })
    .filter(
      (value): value is number => value !== undefined,
    );

  const completedJournalDays =
    data.dailyJournalStatuses.filter(
      (status) =>
        status.isComplete &&
        isWithinPeriod(status.date, options),
    ).length;

  return {
    trackedDays: days.length,
    completedJournalDays,
    averageCaloriesKcal: Math.round(
      average(days.map((day) => day.caloriesKcal)),
    ),
    averageProteinGrams: round(
      average(days.map((day) => day.proteinGrams)),
      1,
    ),
    averageCarbohydratesGrams: round(
      average(days.map((day) => day.carbohydratesGrams)),
      1,
    ),
    averageFatGrams: round(
      average(days.map((day) => day.fatGrams)),
      1,
    ),
    ...(adherenceValues.length === 0
      ? {}
      : {
          averageCalorieAdherencePercent: round(
            average(adherenceValues),
            1,
          ),
        }),
  };
}

function createStrengthSummary(
  data: BackupData,
  options: ProgressReportOptions,
): StrengthReportSummary {
  const sessions = data.workoutSessions.filter(
    (session) =>
      session.status === 'completed' &&
      isWithinPeriod(session.date, options),
  );
  const sessionIds = new Set(
    sessions.map((session) => session.id),
  );
  const sets = data.strengthSets.filter(
    (set) => sessionIds.has(set.sessionId) && set.isCompleted,
  );
  const exercises = data.workoutSessionExercises.filter(
    (exercise) => sessionIds.has(exercise.sessionId),
  );
  const rpeValues = sets
    .map((set) => set.rpe)
    .filter((rpe): rpe is number => rpe !== undefined);

  return {
    completedSessionCount: sessions.length,
    durationMinutes: round(
      sessions.reduce(
        (total, session) =>
          total + (session.durationMinutes ?? 0),
        0,
      ),
      1,
    ),
    completedSetCount: sets.length,
    workingSetCount: sets.filter(
      (set) => set.type !== 'warmup',
    ).length,
    exerciseCount: exercises.length,
    totalVolumeKg: round(
      sets.reduce(
        (total, set) =>
          total + set.weightKg * set.repetitions,
        0,
      ),
      1,
    ),
    ...(rpeValues.length === 0
      ? {}
      : { averageRpe: round(average(rpeValues), 1) }),
  };
}

export function createProgressReportFromData(
  data: BackupData,
  options: ProgressReportOptions,
  generatedAt: string = new Date().toISOString(),
): ProgressReport {
  validateOptions(options);
  const selected = new Set(options.sections);
  const profile = data.userProfile[0];

  return {
    generatedAt,
    period: {
      from: options.from,
      to: options.to,
      dayCount: calculateInclusiveDayCount(
        options.from,
        options.to,
      ),
    },
    sections: [...options.sections],
    ...(options.includeIdentity && profile
      ? {
          profile: {
            ...(profile.firstName
              ? { firstName: profile.firstName }
              : {}),
            goal: profile.goal,
            dailyStepGoal: profile.dailyStepGoal,
          },
        }
      : {}),
    ...(selected.has('weight')
      ? { weight: createWeightSummary(data, options) }
      : {}),
    ...(selected.has('steps')
      ? { steps: createStepsSummary(data, options) }
      : {}),
    ...(selected.has('activities')
      ? {
          activities: createActivitiesSummary(data, options),
        }
      : {}),
    ...(selected.has('nutrition')
      ? {
          nutrition: createNutritionSummary(data, options),
        }
      : {}),
    ...(selected.has('strength')
      ? { strength: createStrengthSummary(data, options) }
      : {}),
  };
}

export async function loadProgressReport(
  options: ProgressReportOptions,
  database: AppDatabase = appDatabase,
): Promise<ProgressReport> {
  const data = await readBackupData(database);
  return createProgressReportFromData(data, options);
}

function formatNumber(
  value: number,
  maximumFractionDigits = 1,
): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits,
  }).format(value);
}

function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;

  if (hours === 0) return `${remaining} min`;
  return `${hours} h ${String(remaining).padStart(2, '0')}`;
}

export function formatProgressReportText(
  report: ProgressReport,
): string {
  const lines = [
    'RAPPORT DE PROGRESSION SPORTPILOT',
    `Période : ${report.period.from} au ${report.period.to} (${report.period.dayCount} jours)`,
    `Généré le : ${new Date(report.generatedAt).toLocaleString('fr-FR')}`,
  ];

  if (report.profile) {
    lines.push(
      '',
      'PROFIL',
      report.profile.firstName
        ? `Prénom : ${report.profile.firstName}`
        : 'Prénom : non renseigné',
      `Objectif : ${goalLabels[report.profile.goal]}`,
      `Objectif de pas : ${formatNumber(report.profile.dailyStepGoal, 0)} / jour`,
    );
  }

  if (report.weight) {
    lines.push(
      '',
      'POIDS',
      `Pesées : ${report.weight.entryCount}`,
      report.weight.averageWeightKg === undefined
        ? 'Poids moyen : aucune donnée'
        : `Poids moyen : ${formatNumber(report.weight.averageWeightKg, 2)} kg`,
      report.weight.changeKg === undefined
        ? 'Évolution : aucune donnée'
        : `Évolution : ${report.weight.changeKg >= 0 ? '+' : ''}${formatNumber(report.weight.changeKg, 2)} kg`,
    );
  }

  if (report.steps) {
    lines.push(
      '',
      'PAS',
      `Jours suivis : ${report.steps.trackedDays}`,
      `Moyenne : ${formatNumber(report.steps.averageSteps, 0)} pas / jour`,
      `Total : ${formatNumber(report.steps.totalSteps, 0)} pas`,
      report.steps.targetSteps === undefined
        ? 'Objectif atteint : objectif non renseigné'
        : `Objectif atteint : ${report.steps.targetReachedDays} jour(s)`,
    );
  }

  if (report.activities) {
    lines.push(
      '',
      'ACTIVITÉS',
      `Séances : ${report.activities.sessionCount}`,
      `Durée : ${formatDuration(report.activities.durationMinutes)}`,
      `Calories estimées : ${formatNumber(report.activities.estimatedCaloriesKcal, 0)} kcal`,
      `Course : ${formatNumber(report.activities.runningDistanceKm, 2)} km`,
      `Vélo : ${formatNumber(report.activities.cyclingDistanceKm, 2)} km`,
      `Natation : ${formatNumber(report.activities.swimmingDistanceMeters, 0)} m`,
      ...report.activities.breakdown.map(
        (item) =>
          `- ${activityTypeLabels[item.type]} : ${item.sessionCount} séance(s), ${formatDuration(item.durationMinutes)}`,
      ),
    );
  }

  if (report.nutrition) {
    lines.push(
      '',
      'NUTRITION',
      `Jours suivis : ${report.nutrition.trackedDays}`,
      `Journaux terminés : ${report.nutrition.completedJournalDays}`,
      `Calories moyennes : ${formatNumber(report.nutrition.averageCaloriesKcal, 0)} kcal`,
      `Protéines moyennes : ${formatNumber(report.nutrition.averageProteinGrams)} g`,
      `Glucides moyens : ${formatNumber(report.nutrition.averageCarbohydratesGrams)} g`,
      `Lipides moyens : ${formatNumber(report.nutrition.averageFatGrams)} g`,
      report.nutrition.averageCalorieAdherencePercent ===
      undefined
        ? 'Adhérence calorique : cible indisponible'
        : `Adhérence calorique moyenne : ${formatNumber(report.nutrition.averageCalorieAdherencePercent)} %`,
    );
  }

  if (report.strength) {
    lines.push(
      '',
      'MUSCULATION',
      `Séances terminées : ${report.strength.completedSessionCount}`,
      `Durée : ${formatDuration(report.strength.durationMinutes)}`,
      `Exercices : ${report.strength.exerciseCount}`,
      `Séries terminées : ${report.strength.completedSetCount}`,
      `Séries de travail : ${report.strength.workingSetCount}`,
      `Volume brut : ${formatNumber(report.strength.totalVolumeKg)} kg`,
      report.strength.averageRpe === undefined
        ? 'RPE moyen : non renseigné'
        : `RPE moyen : ${formatNumber(report.strength.averageRpe)}`,
    );
  }

  lines.push(
    '',
    'Ce rapport est une synthèse de suivi personnel, pas un document médical.',
  );

  return lines.join('\n');
}

export function createProgressReportFileName(
  report: ProgressReport,
): string {
  return `sportpilot-rapport-${report.period.from}-${report.period.to}.txt`;
}
