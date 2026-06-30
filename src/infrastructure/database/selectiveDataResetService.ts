import { ensureExerciseCatalog } from "@/application/strength/exerciseCatalogSeeder";
import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { appDatabase } from "@/infrastructure/database/database";
import { trackDatabaseWrite } from "@/infrastructure/database/databaseWriteBarrier";
import {
  databaseTableNames,
  type DatabaseUserTableName,
} from "@/infrastructure/database/schema";

export const selectiveDataResetCategoryNames = [
  "weightHistory",
  "activityHistory",
  "nutritionHistory",
  "strengthHistory",
  "nutritionLibrary",
  "strengthLibrary",
] as const;

export type SelectiveDataResetCategory =
  (typeof selectiveDataResetCategoryNames)[number];

type PreservedDatabaseTableName = "userProfile" | "userSettings";
type ResettableDatabaseTableName = Exclude<
  DatabaseUserTableName,
  PreservedDatabaseTableName
>;

export interface SelectiveDataResetCategoryDefinition {
  name: SelectiveDataResetCategory;
  title: string;
  description: string;
  tableNames: readonly ResettableDatabaseTableName[];
  dependencyDescription?: string;
}

export const selectiveDataResetCategories: readonly SelectiveDataResetCategoryDefinition[] = [
  {
    name: "weightHistory",
    title: "Historique du poids",
    description: "Supprime les pesées enregistrées.",
    tableNames: ["weights"],
  },
  {
    name: "activityHistory",
    title: "Activités et pas",
    description: "Supprime les pas quotidiens et les activités d’endurance.",
    tableNames: ["dailySteps", "activities"],
  },
  {
    name: "nutritionHistory",
    title: "Journal nutritionnel",
    description:
      "Supprime les repas, les aliments consommés, les objectifs journaliers et les journées clôturées.",
    tableNames: [
      "meals",
      "foodEntries",
      "dailyTargets",
      "dailyJournalStatuses",
    ],
  },
  {
    name: "strengthHistory",
    title: "Séances de musculation",
    description:
      "Supprime les séances planifiées ou terminées, leurs exercices, leurs séries et les suggestions de progression.",
    tableNames: [
      "workoutSessions",
      "workoutSessionExercises",
      "strengthSets",
      "progressionSuggestions",
    ],
  },
  {
    name: "nutritionLibrary",
    title: "Bibliothèque nutritionnelle",
    description:
      "Supprime les produits, repas favoris, recettes et ingrédients enregistrés.",
    dependencyDescription:
      "Le journal nutritionnel sera également effacé pour éviter des références orphelines.",
    tableNames: [
      "foodProducts",
      "favoriteMeals",
      "recipes",
      "recipeIngredients",
    ],
  },
  {
    name: "strengthLibrary",
    title: "Bibliothèque de musculation",
    description:
      "Supprime les exercices personnels et les modèles de séance.",
    dependencyDescription:
      "Les séances de musculation seront également effacées. Le catalogue système sera recréé automatiquement.",
    tableNames: [
      "exerciseDefinitions",
      "workoutTemplates",
      "workoutTemplateExercises",
    ],
  },
] as const;

const dependentCategories: Partial<
  Record<SelectiveDataResetCategory, readonly SelectiveDataResetCategory[]>
> = {
  nutritionLibrary: ["nutritionHistory"],
  strengthLibrary: ["strengthHistory"],
};

const reviewSourceCategories = new Set<SelectiveDataResetCategory>([
  "weightHistory",
  "activityHistory",
  "nutritionHistory",
]);

const reviewTableNames = [
  "weeklyReviews",
  "acceptedCalorieAdjustments",
] as const satisfies readonly ResettableDatabaseTableName[];

export interface SelectiveDataResetPlan {
  requestedCategories: SelectiveDataResetCategory[];
  resolvedCategories: SelectiveDataResetCategory[];
  automaticallyIncludedCategories: SelectiveDataResetCategory[];
  includesDerivedReviewData: boolean;
  tableNames: ResettableDatabaseTableName[];
}

export interface SelectiveDataResetPreview extends SelectiveDataResetPlan {
  countsByTable: Partial<Record<ResettableDatabaseTableName, number>>;
  totalRecordCount: number;
}

export interface SelectiveDataResetResult extends SelectiveDataResetPlan {
  deletedCountsByTable: Partial<Record<ResettableDatabaseTableName, number>>;
  deletedRecordCount: number;
  restoredCatalogExerciseCount: number;
}

export class SelectiveDataResetError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SelectiveDataResetError";
  }
}

function uniqueCategories(
  categories: readonly SelectiveDataResetCategory[],
): SelectiveDataResetCategory[] {
  const selected = new Set(categories);
  return selectiveDataResetCategoryNames.filter((category) =>
    selected.has(category),
  );
}

export function createSelectiveDataResetPlan(
  categories: readonly SelectiveDataResetCategory[],
): SelectiveDataResetPlan {
  const requestedCategories = uniqueCategories(categories);
  const resolvedSet = new Set(requestedCategories);

  for (const category of requestedCategories) {
    for (const dependency of dependentCategories[category] ?? []) {
      resolvedSet.add(dependency);
    }
  }

  const resolvedCategories = selectiveDataResetCategoryNames.filter((category) =>
    resolvedSet.has(category),
  );
  const automaticallyIncludedCategories = resolvedCategories.filter(
    (category) => !requestedCategories.includes(category),
  );
  const includesDerivedReviewData = resolvedCategories.some((category) =>
    reviewSourceCategories.has(category),
  );

  const selectedTableNames = new Set<ResettableDatabaseTableName>();

  for (const category of selectiveDataResetCategories) {
    if (!resolvedSet.has(category.name)) continue;
    for (const tableName of category.tableNames) selectedTableNames.add(tableName);
  }

  if (includesDerivedReviewData) {
    for (const tableName of reviewTableNames) selectedTableNames.add(tableName);
  }

  const tableNames = databaseTableNames.filter(
    (tableName): tableName is ResettableDatabaseTableName =>
      tableName !== "userProfile" &&
      tableName !== "userSettings" &&
      selectedTableNames.has(tableName),
  );

  return {
    requestedCategories,
    resolvedCategories,
    automaticallyIncludedCategories,
    includesDerivedReviewData,
    tableNames,
  };
}

function assertNonEmptyPlan(plan: SelectiveDataResetPlan): void {
  if (plan.requestedCategories.length === 0) {
    throw new SelectiveDataResetError(
      "Sélectionne au moins une catégorie de données à réinitialiser.",
    );
  }
}

export async function getSelectiveDataResetPreview(
  categories: readonly SelectiveDataResetCategory[],
  database: AppDatabase = appDatabase,
): Promise<SelectiveDataResetPreview> {
  const plan = createSelectiveDataResetPlan(categories);
  assertNonEmptyPlan(plan);

  try {
    const countEntries = await Promise.all(
      plan.tableNames.map(async (tableName) => [
        tableName,
        await database.table(tableName).count(),
      ] as const),
    );
    const countsByTable = Object.fromEntries(countEntries) as Partial<
      Record<ResettableDatabaseTableName, number>
    >;
    const totalRecordCount = countEntries.reduce(
      (total, [, count]) => total + count,
      0,
    );

    return { ...plan, countsByTable, totalRecordCount };
  } catch (error) {
    throw new SelectiveDataResetError(
      "Le contenu sélectionné n’a pas pu être analysé.",
      { cause: error },
    );
  }
}

export async function resetSelectedData(
  categories: readonly SelectiveDataResetCategory[],
  database: AppDatabase = appDatabase,
): Promise<SelectiveDataResetResult> {
  const plan = createSelectiveDataResetPlan(categories);
  assertNonEmptyPlan(plan);

  return trackDatabaseWrite(async () => {
    const tables = plan.tableNames.map((tableName) => database.table(tableName));

    try {
      let deletedRecordCount = 0;
      let restoredCatalogExerciseCount = 0;
      const deletedCountsByTable: Partial<
        Record<ResettableDatabaseTableName, number>
      > = {};

      await database.transaction("rw", tables, async () => {
        for (const tableName of plan.tableNames) {
          const table = database.table(tableName);
          const recordCount = await table.count();
          deletedCountsByTable[tableName] = recordCount;
          deletedRecordCount += recordCount;
          await table.clear();
        }

        if (plan.resolvedCategories.includes("strengthLibrary")) {
          restoredCatalogExerciseCount = await ensureExerciseCatalog(database);
        }
      });

      return {
        ...plan,
        deletedCountsByTable,
        deletedRecordCount,
        restoredCatalogExerciseCount,
      };
    } catch (error) {
      throw new SelectiveDataResetError(
        "La réinitialisation sélective a échoué. Les données précédentes ont été conservées.",
        { cause: error },
      );
    }
  });
}
