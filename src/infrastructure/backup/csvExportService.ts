import { calculateDailyNutrition, calculateFoodEntryNutrition } from '@/domain/calculations/nutrition';
import type { Activity } from '@/domain/models/activity';
import type { BackupData } from '@/domain/models/backup';
import type { FoodEntry } from '@/domain/models/food';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { appDatabase } from '@/infrastructure/database/database';
import { readBackupData } from '@/infrastructure/backup/backupService';

export interface CsvExportFile {
  key: string;
  label: string;
  fileName: string;
  content: string;
  rowCount: number;
}

type CsvCell = string | number | boolean | undefined;

function escapeCsvCell(value: CsvCell): string {
  if (value === undefined) return '';
  const text = String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createCsvContent(headers: readonly string[], rows: readonly CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(';'));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function fileName(prefix: string, exportedAt: string): string {
  const date = new Date(exportedAt);
  const stamp = Number.isNaN(date.getTime())
    ? 'export'
    : `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `sportpilot-${prefix}-${stamp}.csv`;
}

function activitySpecificValues(activity: Activity): CsvCell[] {
  switch (activity.type) {
    case 'running':
      return [activity.distanceKm, undefined, activity.sessionType, activity.averageCadenceSpm, undefined, undefined];
    case 'swimming':
      return [undefined, activity.distanceMeters, activity.sessionType, undefined, activity.mainStroke, undefined];
    case 'strengthTraining':
      return [undefined, undefined, undefined, undefined, undefined, activity.met];
    case 'cycling':
    case 'walking':
    case 'otherCardio':
      return [undefined, undefined, undefined, undefined, undefined, activity.met];
  }
}

function foodEntryName(entry: FoodEntry, data: BackupData): string {
  const reference = entry.reference;
  if (reference.sourceType === 'product') {
    return data.foodProducts.find((product) => product.id === reference.productId)?.name ?? 'Produit supprimé';
  }
  return data.recipes.find((recipe) => recipe.id === reference.recipeId)?.name ?? 'Recette supprimée';
}

function createWeightsCsv(data: BackupData, exportedAt: string): CsvExportFile {
  const rows = data.weights.map((entry) => [entry.date, entry.weightKg, entry.note]);
  return {
    key: 'weights',
    label: 'Poids',
    fileName: fileName('poids', exportedAt),
    content: createCsvContent(['date', 'poids_kg', 'note'], rows),
    rowCount: rows.length,
  };
}

function createStepsCsv(data: BackupData, exportedAt: string): CsvExportFile {
  const rows = data.dailySteps.map((entry) => [entry.date, entry.totalSteps, entry.source]);
  return {
    key: 'steps',
    label: 'Pas',
    fileName: fileName('pas', exportedAt),
    content: createCsvContent(['date', 'pas', 'source'], rows),
    rowCount: rows.length,
  };
}

function createActivitiesCsv(data: BackupData, exportedAt: string): CsvExportFile {
  const rows = data.activities.map((activity) => [
    activity.date,
    activity.time,
    activity.type,
    activity.durationMinutes,
    activity.intensity,
    activity.calculation.estimatedCaloriesKcal,
    ...activitySpecificValues(activity),
    activity.notes,
  ]);
  return {
    key: 'activities',
    label: 'Activités',
    fileName: fileName('activites', exportedAt),
    content: createCsvContent(
      [
        'date',
        'heure',
        'type',
        'duree_minutes',
        'intensite',
        'calories_estimees_kcal',
        'distance_km',
        'distance_metres',
        'type_seance',
        'cadence_pas_min',
        'nage_principale',
        'met',
        'notes',
      ],
      rows,
    ),
    rowCount: rows.length,
  };
}

function createWorkoutSessionsCsv(data: BackupData, exportedAt: string): CsvExportFile {
  const rows = data.workoutSessions.map((session) => [
    session.date,
    session.plannedDate,
    session.originalPlannedDate,
    session.sourceTemplateNameSnapshot,
    session.status,
    session.startedAt,
    session.completedAt,
    session.durationMinutes,
    session.notes,
  ]);
  return {
    key: 'workoutSessions',
    label: 'Séances de musculation',
    fileName: fileName('seances-musculation', exportedAt),
    content: createCsvContent(
      ['date_reelle', 'date_prevue', 'date_prevue_initiale', 'modele', 'statut', 'debut', 'fin', 'duree_minutes', 'notes'],
      rows,
    ),
    rowCount: rows.length,
  };
}

function createStrengthSetsCsv(data: BackupData, exportedAt: string): CsvExportFile {
  const exercises = new Map(data.workoutSessionExercises.map((exercise) => [exercise.id, exercise]));
  const sessions = new Map(data.workoutSessions.map((session) => [session.id, session]));
  const rows = data.strengthSets.map((set) => {
    const exercise = exercises.get(set.sessionExerciseId);
    const session = sessions.get(set.sessionId);
    return [
      session?.date,
      exercise?.exerciseNameSnapshot,
      set.setNumber,
      set.type,
      exercise?.trackingModeSnapshot,
      set.repetitions,
      set.weightKg,
      set.durationSeconds,
      set.distanceMeters,
      set.rpe,
      set.isCompleted,
      set.completedAt,
      set.notes,
    ];
  });
  return {
    key: 'strengthSets',
    label: 'Séries de musculation',
    fileName: fileName('series-musculation', exportedAt),
    content: createCsvContent(
      ['date', 'exercice', 'numero_serie', 'type', 'methode_suivi', 'repetitions', 'charge_kg', 'duree_secondes', 'distance_metres', 'rpe', 'validee', 'terminee_le', 'notes'],
      rows,
    ),
    rowCount: rows.length,
  };
}

function createFoodEntriesCsv(data: BackupData, exportedAt: string): CsvExportFile {
  const rows = data.foodEntries.map((entry) => {
    const nutrition = calculateFoodEntryNutrition(entry);
    const quantity = entry.reference.sourceType === 'product'
      ? entry.reference.inputQuantity
      : entry.reference.servingsConsumed;
    const unit = entry.reference.sourceType === 'product'
      ? entry.reference.inputMode === 'servings' ? 'portion' : entry.reference.normalizedUnit
      : 'portion';
    return [
      entry.date,
      entry.mealSlot,
      entry.sourceType,
      foodEntryName(entry, data),
      quantity,
      unit,
      nutrition.caloriesKcal,
      nutrition.proteinGrams,
      nutrition.carbohydratesGrams,
      nutrition.fatGrams,
      nutrition.fiberGrams,
      nutrition.saltGrams,
    ];
  });
  return {
    key: 'foodEntries',
    label: 'Aliments consommés',
    fileName: fileName('aliments-consommes', exportedAt),
    content: createCsvContent(
      ['date', 'repas', 'source', 'nom', 'quantite', 'unite', 'calories_kcal', 'proteines_g', 'glucides_g', 'lipides_g', 'fibres_g', 'sel_g'],
      rows,
    ),
    rowCount: rows.length,
  };
}

function createDailyNutritionCsv(data: BackupData, exportedAt: string): CsvExportFile {
  const entriesByDate = new Map<string, FoodEntry[]>();
  for (const entry of data.foodEntries) {
    const current = entriesByDate.get(entry.date) ?? [];
    current.push(entry);
    entriesByDate.set(entry.date, current);
  }
  const targetsByDate = new Map(data.dailyTargets.map((target) => [target.date, target]));
  const dates = [...new Set([...entriesByDate.keys(), ...targetsByDate.keys()])].sort();
  const rows = dates.map((date) => {
    const summary = calculateDailyNutrition(entriesByDate.get(date) ?? []);
    const target = targetsByDate.get(date);
    return [
      date,
      summary.entryCount,
      summary.caloriesKcal,
      summary.proteinGrams,
      summary.carbohydratesGrams,
      summary.fatGrams,
      summary.fiberGrams,
      summary.saltGrams,
      target?.targetCaloriesKcal,
      target?.macros.proteinGrams,
      target?.macros.carbohydratesGrams,
      target?.macros.fatGrams,
    ];
  });
  return {
    key: 'dailyNutrition',
    label: 'Apports quotidiens',
    fileName: fileName('apports-quotidiens', exportedAt),
    content: createCsvContent(
      ['date', 'nombre_entrees', 'calories_kcal', 'proteines_g', 'glucides_g', 'lipides_g', 'fibres_g', 'sel_g', 'objectif_calories_kcal', 'objectif_proteines_g', 'objectif_glucides_g', 'objectif_lipides_g'],
      rows,
    ),
    rowCount: rows.length,
  };
}

export async function createCsvExports(
  database: AppDatabase = appDatabase,
  exportedAt: string = new Date().toISOString(),
): Promise<CsvExportFile[]> {
  const data = await readBackupData(database);
  return [
    createWeightsCsv(data, exportedAt),
    createStepsCsv(data, exportedAt),
    createActivitiesCsv(data, exportedAt),
    createWorkoutSessionsCsv(data, exportedAt),
    createStrengthSetsCsv(data, exportedAt),
    createFoodEntriesCsv(data, exportedAt),
    createDailyNutritionCsv(data, exportedAt),
  ];
}
