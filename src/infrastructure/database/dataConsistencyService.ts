import type { BackupData } from '@/domain/models/backup';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { readBackupData } from '@/infrastructure/backup/backupService';
import { appDatabase } from '@/infrastructure/database/database';
import { trackDatabaseWrite } from '@/infrastructure/database/databaseWriteBarrier';

export type DataConsistencyStatus =
  | 'healthy'
  | 'warning'
  | 'error';

export type DataConsistencyIssueSeverity =
  | 'warning'
  | 'error';

export type DataConsistencyTableName =
  | 'userProfile'
  | 'userSettings'
  | 'foodEntries'
  | 'favoriteMeals'
  | 'recipeIngredients'
  | 'workoutTemplateExercises'
  | 'workoutSessionExercises'
  | 'strengthSets'
  | 'progressionSuggestions';

export type RepairableDataConsistencyTableName =
  | 'recipeIngredients'
  | 'workoutTemplateExercises'
  | 'workoutSessionExercises'
  | 'strengthSets'
  | 'progressionSuggestions';

export interface DataConsistencyIssue {
  id: string;
  code: string;
  severity: DataConsistencyIssueSeverity;
  tableName: DataConsistencyTableName;
  recordId: string;
  message: string;
  repairable: boolean;
}

export interface DataConsistencyReport {
  checkedAt: string;
  status: DataConsistencyStatus;
  totalRecordCount: number;
  issueCount: number;
  repairableIssueCount: number;
  issues: DataConsistencyIssue[];
}

export interface DataConsistencyRepairPlan {
  recipeIngredients: string[];
  workoutTemplateExercises: string[];
  workoutSessionExercises: string[];
  strengthSets: string[];
  progressionSuggestions: string[];
  totalRecordCount: number;
}

export interface DataConsistencyRepairResult {
  repairedRecordCount: number;
  before: DataConsistencyReport;
  after: DataConsistencyReport;
}

function resolveStatus(
  issues: readonly DataConsistencyIssue[],
): DataConsistencyStatus {
  if (issues.some(({ severity }) => severity === 'error')) {
    return 'error';
  }

  return issues.length > 0 ? 'warning' : 'healthy';
}

function createIssue(
  code: string,
  severity: DataConsistencyIssueSeverity,
  tableName: DataConsistencyTableName,
  recordId: string,
  message: string,
  repairable: boolean,
): DataConsistencyIssue {
  return {
    id: `${code}:${tableName}:${recordId}`,
    code,
    severity,
    tableName,
    recordId,
    message,
    repairable,
  };
}

function totalRecordCount(data: BackupData): number {
  return Object.values(data).reduce(
    (total, records) => total + records.length,
    0,
  );
}

function duplicateRecordIds(
  records: readonly {
    id: string;
    parentId: string;
    position: number;
  }[],
): string[] {
  const firstByPosition = new Map<string, string>();
  const duplicates: string[] = [];

  for (const record of records) {
    const key = `${record.parentId}:${record.position}`;
    if (firstByPosition.has(key)) {
      duplicates.push(record.id);
    } else {
      firstByPosition.set(key, record.id);
    }
  }

  return duplicates;
}

export function inspectDataConsistencyFromData(
  data: BackupData,
  checkedAt: string = new Date().toISOString(),
): DataConsistencyReport {
  const issues: DataConsistencyIssue[] = [];
  const productIds = new Set(
    data.foodProducts.map(({ id }) => id),
  );
  const mealIds = new Set(data.meals.map(({ id }) => id));
  const recipeIds = new Set(
    data.recipes.map(({ id }) => id),
  );
  const exerciseIds = new Set(
    data.exerciseDefinitions.map(({ id }) => id),
  );
  const templateIds = new Set(
    data.workoutTemplates.map(({ id }) => id),
  );
  const templateExerciseIds = new Set(
    data.workoutTemplateExercises.map(({ id }) => id),
  );
  const sessionIds = new Set(
    data.workoutSessions.map(({ id }) => id),
  );
  const sessionExercisesById = new Map(
    data.workoutSessionExercises.map((exercise) => [
      exercise.id,
      exercise,
    ]),
  );

  if (data.userProfile.length > 1) {
    issues.push(
      createIssue(
        'multiple-profiles',
        'error',
        'userProfile',
        'profile-count',
        `${data.userProfile.length} profils sont présents alors qu’un seul est attendu.`,
        false,
      ),
    );
  }

  if ((data.userSettings?.length ?? 0) > 1) {
    issues.push(
      createIssue(
        'multiple-settings',
        'warning',
        'userSettings',
        'settings-count',
        `${data.userSettings?.length ?? 0} jeux de paramètres utilisateur sont présents.`,
        false,
      ),
    );
  }

  for (const ingredient of data.recipeIngredients) {
    if (!recipeIds.has(ingredient.recipeId)) {
      issues.push(
        createIssue(
          'orphan-recipe-ingredient',
          'error',
          'recipeIngredients',
          ingredient.id,
          'Un ingrédient appartient à une recette inexistante.',
          true,
        ),
      );
    } else if (!productIds.has(ingredient.productId)) {
      issues.push(
        createIssue(
          'missing-ingredient-product',
          'warning',
          'recipeIngredients',
          ingredient.id,
          'Le produit source d’un ingrédient n’existe plus. Son instantané nutritionnel est conservé.',
          false,
        ),
      );
    }
  }

  for (const entry of data.foodEntries) {
    if (!mealIds.has(entry.mealId)) {
      issues.push(
        createIssue(
          'missing-food-entry-meal',
          'error',
          'foodEntries',
          entry.id,
          'Une entrée alimentaire référence un repas inexistant.',
          false,
        ),
      );
    }

    if (
      entry.reference.sourceType === 'product' &&
      !productIds.has(entry.reference.productId)
    ) {
      issues.push(
        createIssue(
          'missing-food-entry-product',
          'warning',
          'foodEntries',
          entry.id,
          'Le produit source d’une entrée n’existe plus. Les valeurs nutritionnelles figées restent disponibles.',
          false,
        ),
      );
    }

    if (
      entry.reference.sourceType === 'recipe' &&
      !recipeIds.has(entry.reference.recipeId)
    ) {
      issues.push(
        createIssue(
          'missing-food-entry-recipe',
          'warning',
          'foodEntries',
          entry.id,
          'La recette source d’une entrée n’existe plus. Les valeurs nutritionnelles figées restent disponibles.',
          false,
        ),
      );
    }
  }

  for (const favorite of data.favoriteMeals) {
    for (const item of favorite.items) {
      const sourceMissing =
        item.sourceType === 'product'
          ? !productIds.has(item.productId)
          : !recipeIds.has(item.recipeId);

      if (sourceMissing) {
        issues.push(
          createIssue(
            'missing-favorite-source',
            'warning',
            'favoriteMeals',
            favorite.id,
            `Le repas favori « ${favorite.name} » contient une source supprimée mais conserve son instantané.`,
            false,
          ),
        );
        break;
      }
    }
  }

  for (const exercise of data.workoutTemplateExercises) {
    if (!templateIds.has(exercise.templateId)) {
      issues.push(
        createIssue(
          'orphan-template-exercise',
          'error',
          'workoutTemplateExercises',
          exercise.id,
          'Un exercice de modèle appartient à un modèle inexistant.',
          true,
        ),
      );
    } else if (!exerciseIds.has(exercise.exerciseDefinitionId)) {
      issues.push(
        createIssue(
          'missing-template-exercise-definition',
          'warning',
          'workoutTemplateExercises',
          exercise.id,
          'La définition d’un exercice de modèle n’existe plus.',
          false,
        ),
      );
    }
  }

  for (const exercise of data.workoutSessionExercises) {
    if (!sessionIds.has(exercise.sessionId)) {
      issues.push(
        createIssue(
          'orphan-session-exercise',
          'error',
          'workoutSessionExercises',
          exercise.id,
          'Un exercice de séance appartient à une séance inexistante.',
          true,
        ),
      );
    } else if (!exerciseIds.has(exercise.exerciseDefinitionId)) {
      issues.push(
        createIssue(
          'missing-session-exercise-definition',
          'warning',
          'workoutSessionExercises',
          exercise.id,
          'La définition d’un exercice réalisé n’existe plus. Son nom figé reste disponible.',
          false,
        ),
      );
    }
  }

  for (const set of data.strengthSets) {
    const parentExercise =
      sessionExercisesById.get(set.sessionExerciseId);

    if (!sessionIds.has(set.sessionId)) {
      issues.push(
        createIssue(
          'orphan-strength-set-session',
          'error',
          'strengthSets',
          set.id,
          'Une série appartient à une séance inexistante.',
          true,
        ),
      );
    }

    if (!parentExercise) {
      issues.push(
        createIssue(
          'orphan-strength-set-exercise',
          'error',
          'strengthSets',
          set.id,
          'Une série appartient à un exercice de séance inexistant.',
          true,
        ),
      );
    } else if (parentExercise.sessionId !== set.sessionId) {
      issues.push(
        createIssue(
          'mismatched-strength-set-session',
          'error',
          'strengthSets',
          set.id,
          'Une série et son exercice parent ne pointent pas vers la même séance.',
          true,
        ),
      );
    }
  }

  for (const suggestion of data.progressionSuggestions) {
    if (
      !sessionIds.has(suggestion.sessionId) ||
      !sessionExercisesById.has(suggestion.sessionExerciseId)
    ) {
      issues.push(
        createIssue(
          'orphan-progression-suggestion',
          'warning',
          'progressionSuggestions',
          suggestion.id,
          'Une suggestion de progression référence une séance ou un exercice inexistant.',
          true,
        ),
      );
    } else if (!exerciseIds.has(suggestion.exerciseDefinitionId)) {
      issues.push(
        createIssue(
          'missing-suggestion-exercise-definition',
          'warning',
          'progressionSuggestions',
          suggestion.id,
          'La définition associée à une suggestion n’existe plus.',
          false,
        ),
      );
    }

    if (
      suggestion.templateId &&
      !templateIds.has(suggestion.templateId)
    ) {
      issues.push(
        createIssue(
          'missing-suggestion-template',
          'warning',
          'progressionSuggestions',
          suggestion.id,
          'Le modèle associé à une suggestion n’existe plus.',
          false,
        ),
      );
    }

    if (
      suggestion.templateExerciseId &&
      !templateExerciseIds.has(
        suggestion.templateExerciseId,
      )
    ) {
      issues.push(
        createIssue(
          'missing-suggestion-template-exercise',
          'warning',
          'progressionSuggestions',
          suggestion.id,
          'L’exercice de modèle associé à une suggestion n’existe plus.',
          false,
        ),
      );
    }
  }

  const duplicateTemplateExerciseIds = duplicateRecordIds(
    data.workoutTemplateExercises.map((exercise) => ({
      id: exercise.id,
      parentId: exercise.templateId,
      position: exercise.sortOrder,
    })),
  );

  for (const recordId of duplicateTemplateExerciseIds) {
    issues.push(
      createIssue(
        'duplicate-template-sort-order',
        'warning',
        'workoutTemplateExercises',
        recordId,
        'Deux exercices d’un même modèle utilisent la même position.',
        false,
      ),
    );
  }

  const duplicateSessionExerciseIds = duplicateRecordIds(
    data.workoutSessionExercises.map((exercise) => ({
      id: exercise.id,
      parentId: exercise.sessionId,
      position: exercise.sortOrder,
    })),
  );

  for (const recordId of duplicateSessionExerciseIds) {
    issues.push(
      createIssue(
        'duplicate-session-sort-order',
        'warning',
        'workoutSessionExercises',
        recordId,
        'Deux exercices d’une même séance utilisent la même position.',
        false,
      ),
    );
  }

  const duplicateSetIds = duplicateRecordIds(
    data.strengthSets.map((set) => ({
      id: set.id,
      parentId: set.sessionExerciseId,
      position: set.setNumber,
    })),
  );

  for (const recordId of duplicateSetIds) {
    issues.push(
      createIssue(
        'duplicate-set-number',
        'warning',
        'strengthSets',
        recordId,
        'Deux séries d’un même exercice utilisent le même numéro.',
        false,
      ),
    );
  }

  issues.sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === 'error' ? -1 : 1;
    }

    return left.tableName.localeCompare(right.tableName);
  });

  return {
    checkedAt,
    status: resolveStatus(issues),
    totalRecordCount: totalRecordCount(data),
    issueCount: issues.length,
    repairableIssueCount: issues.filter(
      ({ repairable }) => repairable,
    ).length,
    issues,
  };
}

export function createDataConsistencyRepairPlan(
  report: DataConsistencyReport,
  data: BackupData,
): DataConsistencyRepairPlan {
  const ids: Record<
    RepairableDataConsistencyTableName,
    Set<string>
  > = {
    recipeIngredients: new Set<string>(),
    workoutTemplateExercises: new Set<string>(),
    workoutSessionExercises: new Set<string>(),
    strengthSets: new Set<string>(),
    progressionSuggestions: new Set<string>(),
  };

  for (const issue of report.issues) {
    if (!issue.repairable) continue;

    if (issue.tableName in ids) {
      ids[
        issue.tableName as RepairableDataConsistencyTableName
      ].add(issue.recordId);
    }
  }

  for (const set of data.strengthSets) {
    if (ids.workoutSessionExercises.has(set.sessionExerciseId)) {
      ids.strengthSets.add(set.id);
    }
  }

  for (const suggestion of data.progressionSuggestions) {
    if (
      ids.workoutSessionExercises.has(
        suggestion.sessionExerciseId,
      ) ||
      (suggestion.templateExerciseId !== undefined &&
        ids.workoutTemplateExercises.has(
          suggestion.templateExerciseId,
        ))
    ) {
      ids.progressionSuggestions.add(suggestion.id);
    }
  }

  const plan = {
    recipeIngredients: [...ids.recipeIngredients],
    workoutTemplateExercises: [
      ...ids.workoutTemplateExercises,
    ],
    workoutSessionExercises: [
      ...ids.workoutSessionExercises,
    ],
    strengthSets: [...ids.strengthSets],
    progressionSuggestions: [
      ...ids.progressionSuggestions,
    ],
  };

  return {
    ...plan,
    totalRecordCount: Object.values(plan).reduce(
      (total, recordIds) => total + recordIds.length,
      0,
    ),
  };
}

export async function inspectDataConsistency(
  database: AppDatabase = appDatabase,
): Promise<DataConsistencyReport> {
  return inspectDataConsistencyFromData(
    await readBackupData(database),
  );
}

export async function repairDataConsistency(
  database: AppDatabase = appDatabase,
): Promise<DataConsistencyRepairResult> {
  const data = await readBackupData(database);
  const before = inspectDataConsistencyFromData(data);
  const plan = createDataConsistencyRepairPlan(before, data);

  if (plan.totalRecordCount > 0) {
    await trackDatabaseWrite(() =>
      database.transaction(
        'rw',
        [
          database.recipeIngredients,
          database.workoutTemplateExercises,
          database.workoutSessionExercises,
          database.strengthSets,
          database.progressionSuggestions,
        ],
        async () => {
          if (plan.recipeIngredients.length > 0) {
            await database.recipeIngredients.bulkDelete(
              plan.recipeIngredients,
            );
          }

          if (plan.workoutTemplateExercises.length > 0) {
            await database.workoutTemplateExercises.bulkDelete(
              plan.workoutTemplateExercises,
            );
          }

          if (plan.workoutSessionExercises.length > 0) {
            await database.workoutSessionExercises.bulkDelete(
              plan.workoutSessionExercises,
            );
          }

          if (plan.strengthSets.length > 0) {
            await database.strengthSets.bulkDelete(
              plan.strengthSets,
            );
          }

          if (plan.progressionSuggestions.length > 0) {
            await database.progressionSuggestions.bulkDelete(
              plan.progressionSuggestions,
            );
          }
        },
      ),
    );
  }

  return {
    repairedRecordCount: plan.totalRecordCount,
    before,
    after: await inspectDataConsistency(database),
  };
}

export function serializeDataConsistencyReport(
  report: DataConsistencyReport,
): string {
  return JSON.stringify(
    {
      format: 'sportpilot-data-consistency-report',
      version: 1,
      ...report,
    },
    null,
    2,
  );
}

export function createDataConsistencyReportFileName(
  checkedAt: string,
): string {
  const normalized = checkedAt
    .replace(/[:.]/g, '-')
    .replace(/[^0-9TZ-]/g, '');

  return `sportpilot-coherence-donnees-${normalized}.json`;
}
