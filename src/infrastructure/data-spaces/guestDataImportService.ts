import Dexie from "dexie";

import type { DataSpaceDescriptor } from "@/domain/data-spaces/dataSpace";
import type {
  DeletionEntityType,
  DeletionRecord,
} from "@/domain/models/deletion";
import type {
  FoodEntry,
  FoodProduct,
  FavoriteMeal,
  Meal,
} from "@/domain/models/food";
import type { RecipeIngredient } from "@/domain/models/recipe";
import type { AcceptedCalorieAdjustment } from "@/domain/models/weeklyReview";
import {
  activateAccountDataSpace,
  readDataSpaceRegistry,
  type DataSpaceStorage,
} from "@/infrastructure/data-spaces/dataSpaceRegistry";
import { AppDatabase } from "@/infrastructure/database/AppDatabase";
import {
  appDatabase,
  activeDataSpace,
} from "@/infrastructure/database/database";
import {
  DEFAULT_DATABASE_NAME,
  accountDatabaseNameForFingerprint,
} from "@/infrastructure/database/databaseNames";
import {
  databaseTableNames,
  type DatabaseUserTableName,
} from "@/infrastructure/database/schema";

const IMPORT_BATCH_SIZE = 500;

export type GuestDataImportCategory =
  | "profileSettings"
  | "bodyTracking"
  | "activities"
  | "nutrition"
  | "strength"
  | "progress"
  | "deletions";

export interface GuestDataImportCategoryPreview {
  readonly key: GuestDataImportCategory;
  readonly label: string;
  readonly description: string;
  readonly guestRecords: number;
  readonly accountRecords: number;
  readonly recordsToAdd: number;
  readonly recordsToUpdate: number;
  readonly recordsToRemove: number;
}

export interface GuestDataImportPreview {
  readonly guestRecordCount: number;
  readonly accountRecordCount: number;
  readonly recordsToAdd: number;
  readonly recordsToUpdate: number;
  readonly recordsToRemove: number;
  readonly unchangedAccountRecords: number;
  readonly hasGuestData: boolean;
  readonly categories: readonly GuestDataImportCategoryPreview[];
}

type DatabaseSnapshot = Record<DatabaseUserTableName, unknown[]>;

export interface PreparedGuestDataImport {
  readonly accountFingerprint: string;
  readonly sourceDatabaseName: string;
  readonly targetDatabaseName: string;
  readonly sourceFingerprint: string;
  readonly targetFingerprint: string;
  readonly targetDatabaseExisted: boolean;
  readonly mergedSnapshot: DatabaseSnapshot;
  readonly preview: GuestDataImportPreview;
}

export interface GuestDataImportResult {
  readonly importedRecords: number;
  readonly updatedRecords: number;
  readonly removedDuplicates: number;
  readonly sourcePreserved: true;
  readonly space: DataSpaceDescriptor;
}

export interface GuestDataImportServiceOptions {
  readonly storage?: DataSpaceStorage;
  readonly sourceDatabase?: AppDatabase;
  readonly targetDatabase?: AppDatabase;
  readonly now?: Date | string;
}

interface TaggedRow {
  readonly origin: "guest" | "account";
  readonly row: Record<string, unknown>;
}

interface IdentityMergeResult {
  readonly rows: Record<string, unknown>[];
  readonly aliases: Map<string, string>;
}

const CATEGORY_DEFINITIONS: readonly {
  key: GuestDataImportCategory;
  label: string;
  description: string;
  tables: readonly DatabaseUserTableName[];
}[] = [
  {
    key: "profileSettings",
    label: "Profil et réglages",
    description: "Profil et préférences synchronisables du compte.",
    tables: ["userProfile", "userSettings"],
  },
  {
    key: "bodyTracking",
    label: "Poids et pas",
    description: "Pesées et relevés quotidiens de pas.",
    tables: ["weights", "dailySteps"],
  },
  {
    key: "activities",
    label: "Activités",
    description: "Activités d’endurance enregistrées.",
    tables: ["activities"],
  },
  {
    key: "nutrition",
    label: "Nutrition",
    description: "Produits, recettes, journal, objectifs et bilans.",
    tables: [
      "foodProducts",
      "meals",
      "foodEntries",
      "favoriteMeals",
      "recipes",
      "recipeIngredients",
      "dailyTargets",
      "dailyJournalStatuses",
      "weeklyReviews",
      "acceptedCalorieAdjustments",
    ],
  },
  {
    key: "strength",
    label: "Musculation",
    description: "Exercices, modèles, séances, séries et progressions.",
    tables: [
      "exerciseDefinitions",
      "workoutTemplates",
      "workoutTemplateExercises",
      "workoutSessions",
      "workoutSessionExercises",
      "strengthSets",
      "progressionSuggestions",
    ],
  },
  {
    key: "progress",
    label: "Objectifs et progression",
    description: "Objectifs, planning, récompenses, thèmes et missions.",
    tables: [
      "goals",
      "endurancePlanningSessions",
      "earnedAchievements",
      "unlockedVisualThemes",
      "visualThemePreferences",
      "weeklyMissionCompletions",
      "routineReminderCompletions",
    ],
  },
  {
    key: "deletions",
    label: "Historique des suppressions",
    description:
      "Marqueurs nécessaires pour éviter la réapparition de données supprimées.",
    tables: ["deletionRecords"],
  },
];

const ENTITY_TABLE_BY_DELETION_TYPE: Partial<
  Record<DeletionEntityType, DatabaseUserTableName>
> = {
  activity: "activities",
  weight: "weights",
  goal: "goals",
  foodEntry: "foodEntries",
  meal: "meals",
  favoriteMeal: "favoriteMeals",
  recipe: "recipes",
  recipeIngredient: "recipeIngredients",
  strengthSet: "strengthSets",
  workoutSessionExercise: "workoutSessionExercises",
};

function normalizeFingerprint(value: string): string {
  return value.trim().toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function rowId(row: Record<string, unknown>): string {
  return String(row.id ?? "");
}

function updatedAt(row: Record<string, unknown>): string {
  return typeof row.updatedAt === "string" ? row.updatedAt : "";
}

function createdAt(row: Record<string, unknown>): string {
  return typeof row.createdAt === "string" ? row.createdAt : "";
}

function compareTaggedRows(left: TaggedRow, right: TaggedRow): number {
  const byUpdatedAt = updatedAt(left.row).localeCompare(updatedAt(right.row));
  if (byUpdatedAt !== 0) return byUpdatedAt;
  if (left.origin !== right.origin) return left.origin === "account" ? 1 : -1;
  return rowId(left.row).localeCompare(rowId(right.row));
}

function stableRows(rows: readonly unknown[]): unknown[] {
  return [...rows].sort((left, right) =>
    rowId(asRecord(left)).localeCompare(rowId(asRecord(right))),
  );
}

function snapshotFingerprint(snapshot: DatabaseSnapshot): string {
  let hash = 2166136261;
  for (const tableName of databaseTableNames) {
    const text = `${tableName}:${JSON.stringify(stableRows(snapshot[tableName]))}`;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function readSnapshot(database: AppDatabase): Promise<DatabaseSnapshot> {
  const snapshot = {} as DatabaseSnapshot;
  for (const tableName of databaseTableNames) {
    snapshot[tableName] = await database.table(tableName).toArray();
  }
  return snapshot;
}

function cloneSnapshot(snapshot: DatabaseSnapshot): DatabaseSnapshot {
  return Object.fromEntries(
    databaseTableNames.map((tableName) => [
      tableName,
      snapshot[tableName].map((row) => structuredClone(row)),
    ]),
  ) as DatabaseSnapshot;
}

function mergeByIdentity(
  guestRows: readonly unknown[],
  accountRows: readonly unknown[],
  identity: (row: Record<string, unknown>) => string,
): IdentityMergeResult {
  const groups = new Map<string, TaggedRow[]>();
  const append = (origin: TaggedRow["origin"], rows: readonly unknown[]) => {
    for (const value of rows) {
      const row = asRecord(value);
      const key = identity(row);
      const list = groups.get(key) ?? [];
      list.push({ origin, row });
      groups.set(key, list);
    }
  };

  append("account", accountRows);
  append("guest", guestRows);

  const aliases = new Map<string, string>();
  const rows: Record<string, unknown>[] = [];

  for (const values of groups.values()) {
    const ordered = [...values].sort(compareTaggedRows);
    const winner = ordered.at(-1)!;
    const accountCandidates = ordered.filter(
      ({ origin }) => origin === "account",
    );
    const canonical = accountCandidates.at(-1) ?? winner;
    const canonicalId = rowId(canonical.row);
    const oldestCreatedAt = ordered
      .map(({ row }) => createdAt(row))
      .filter(Boolean)
      .sort()[0];

    for (const candidate of ordered) {
      const candidateId = rowId(candidate.row);
      if (candidateId && candidateId !== canonicalId) {
        aliases.set(candidateId, canonicalId);
      }
    }

    rows.push({
      ...winner.row,
      id: canonicalId,
      ...(oldestCreatedAt ? { createdAt: oldestCreatedAt } : {}),
    });
  }

  return { rows, aliases };
}

function applyAlias(
  value: unknown,
  aliases: ReadonlyMap<string, string>,
): unknown {
  if (typeof value !== "string") return value;
  return aliases.get(value) ?? value;
}

function remapProductReferences(
  snapshot: DatabaseSnapshot,
  aliases: ReadonlyMap<string, string>,
): void {
  if (aliases.size === 0) return;

  snapshot.recipeIngredients = snapshot.recipeIngredients.map((value) => {
    const row = value as RecipeIngredient;
    return { ...row, productId: applyAlias(row.productId, aliases) as string };
  });

  snapshot.foodEntries = snapshot.foodEntries.map((value) => {
    const row = value as FoodEntry;
    if (row.reference.sourceType !== "product") return row;
    return {
      ...row,
      reference: {
        ...row.reference,
        productId: applyAlias(row.reference.productId, aliases) as string,
      },
    };
  });

  snapshot.favoriteMeals = snapshot.favoriteMeals.map((value) => {
    const row = value as FavoriteMeal;
    return {
      ...row,
      items: row.items.map((item) =>
        item.sourceType === "product"
          ? {
              ...item,
              productId: applyAlias(item.productId, aliases) as string,
            }
          : item,
      ),
    };
  });
}

function remapMealReferences(
  snapshot: DatabaseSnapshot,
  aliases: ReadonlyMap<string, string>,
): void {
  if (aliases.size === 0) return;
  snapshot.foodEntries = snapshot.foodEntries.map((value) => {
    const row = value as FoodEntry;
    return { ...row, mealId: applyAlias(row.mealId, aliases) as string };
  });
  remapDeletionReferences(snapshot, "meal", aliases);
}

function remapWeeklyReviewReferences(
  snapshot: DatabaseSnapshot,
  aliases: ReadonlyMap<string, string>,
): void {
  if (aliases.size === 0) return;
  snapshot.acceptedCalorieAdjustments = snapshot.acceptedCalorieAdjustments.map(
    (value) => {
      const row = value as AcceptedCalorieAdjustment;
      return {
        ...row,
        weeklyReviewId: applyAlias(row.weeklyReviewId, aliases) as string,
      };
    },
  );
}

function remapDeletionReferences(
  snapshot: DatabaseSnapshot,
  entityType: DeletionEntityType,
  aliases: ReadonlyMap<string, string>,
): void {
  if (aliases.size === 0) return;
  snapshot.deletionRecords = snapshot.deletionRecords.map((value) => {
    const row = value as DeletionRecord;
    if (row.entityType !== entityType) return row;
    const entityId = applyAlias(row.entityId, aliases) as string;
    return {
      ...row,
      id: `deletion:${entityType}:${entityId}`,
      entityId,
    };
  });
}

function normalizeFoodProductKey(row: Record<string, unknown>): string {
  const product = row as unknown as FoodProduct;
  const barcode = product.barcode?.trim();
  return barcode ? `barcode:${barcode}` : `id:${product.id}`;
}

function dateSlotKey(row: Record<string, unknown>): string {
  const meal = row as unknown as Meal;
  return `${meal.date}:${meal.slot}`;
}

function fieldKey(...fields: string[]) {
  return (row: Record<string, unknown>): string =>
    fields.map((field) => String(row[field] ?? "")).join(":");
}

function mergeSnapshots(
  guestInput: DatabaseSnapshot,
  accountInput: DatabaseSnapshot,
): DatabaseSnapshot {
  const guest = cloneSnapshot(guestInput);
  const account = cloneSnapshot(accountInput);
  const merged = {} as DatabaseSnapshot;
  const completed = new Set<DatabaseUserTableName>();

  const products = mergeByIdentity(
    guest.foodProducts,
    account.foodProducts,
    normalizeFoodProductKey,
  );
  merged.foodProducts = products.rows;
  completed.add("foodProducts");
  remapProductReferences(guest, products.aliases);
  remapProductReferences(account, products.aliases);

  const meals = mergeByIdentity(guest.meals, account.meals, dateSlotKey);
  merged.meals = meals.rows;
  completed.add("meals");
  remapMealReferences(guest, meals.aliases);
  remapMealReferences(account, meals.aliases);

  const reviews = mergeByIdentity(
    guest.weeklyReviews,
    account.weeklyReviews,
    fieldKey("weekStart"),
  );
  merged.weeklyReviews = reviews.rows;
  completed.add("weeklyReviews");
  remapWeeklyReviewReferences(guest, reviews.aliases);
  remapWeeklyReviewReferences(account, reviews.aliases);

  const weights = mergeByIdentity(
    guest.weights,
    account.weights,
    fieldKey("date"),
  );
  merged.weights = weights.rows;
  completed.add("weights");
  remapDeletionReferences(guest, "weight", weights.aliases);
  remapDeletionReferences(account, "weight", weights.aliases);

  const identityTables: readonly [
    DatabaseUserTableName,
    (row: Record<string, unknown>) => string,
  ][] = [
    ["userProfile", fieldKey("id")],
    ["userSettings", fieldKey("id")],
    ["dailySteps", fieldKey("date")],
    ["dailyTargets", fieldKey("date")],
    ["dailyJournalStatuses", fieldKey("date")],
    ["weeklyMissionCompletions", fieldKey("weekStart")],
    ["routineReminderCompletions", fieldKey("date", "type")],
    ["acceptedCalorieAdjustments", fieldKey("weeklyReviewId")],
  ];

  for (const [tableName, identity] of identityTables) {
    const result = mergeByIdentity(
      guest[tableName],
      account[tableName],
      identity,
    );
    merged[tableName] = result.rows;
    completed.add(tableName);
  }

  for (const tableName of databaseTableNames) {
    if (completed.has(tableName)) continue;
    merged[tableName] = mergeByIdentity(
      guest[tableName],
      account[tableName],
      fieldKey("id"),
    ).rows;
  }

  applyDeletionRecords(merged);
  pruneOrphans(merged);
  return merged;
}

function applyDeletionRecords(snapshot: DatabaseSnapshot): void {
  const rowsByTable = new Map<
    DatabaseUserTableName,
    Map<string, Record<string, unknown>>
  >();
  for (const tableName of databaseTableNames) {
    rowsByTable.set(
      tableName,
      new Map(
        snapshot[tableName].map((value) => {
          const row = asRecord(value);
          return [rowId(row), row];
        }),
      ),
    );
  }

  for (const value of snapshot.deletionRecords) {
    const marker = value as DeletionRecord;
    if (marker.status !== "deleted") continue;
    const tableName = ENTITY_TABLE_BY_DELETION_TYPE[marker.entityType];
    if (!tableName) continue;
    const entity = rowsByTable.get(tableName)?.get(marker.entityId);
    if (entity && marker.updatedAt >= updatedAt(entity)) {
      rowsByTable.get(tableName)?.delete(marker.entityId);
    }
  }

  for (const [tableName, rows] of rowsByTable) {
    snapshot[tableName] = [...rows.values()];
  }
}

function pruneOrphans(snapshot: DatabaseSnapshot): void {
  const ids = (tableName: DatabaseUserTableName) =>
    new Set(snapshot[tableName].map((value) => rowId(asRecord(value))));

  const productIds = ids("foodProducts");
  const mealIds = ids("meals");
  const recipeIds = ids("recipes");
  const reviewIds = ids("weeklyReviews");
  const exerciseIds = ids("exerciseDefinitions");
  const templateIds = ids("workoutTemplates");
  const sessionIds = ids("workoutSessions");
  snapshot.recipeIngredients = snapshot.recipeIngredients.filter((value) => {
    const row = value as RecipeIngredient;
    return recipeIds.has(row.recipeId) && productIds.has(row.productId);
  });

  snapshot.foodEntries = snapshot.foodEntries.filter((value) => {
    const row = value as FoodEntry;
    if (!mealIds.has(row.mealId)) return false;
    return row.reference.sourceType === "product"
      ? productIds.has(row.reference.productId)
      : recipeIds.has(row.reference.recipeId);
  });

  snapshot.favoriteMeals = snapshot.favoriteMeals.map((value) => {
    const row = value as FavoriteMeal;
    return {
      ...row,
      items: row.items.filter((item) =>
        item.sourceType === "product"
          ? productIds.has(item.productId)
          : recipeIds.has(item.recipeId),
      ),
    };
  });

  snapshot.acceptedCalorieAdjustments =
    snapshot.acceptedCalorieAdjustments.filter((value) =>
      reviewIds.has((value as AcceptedCalorieAdjustment).weeklyReviewId),
    );

  snapshot.workoutTemplateExercises = snapshot.workoutTemplateExercises.filter(
    (value) => {
      const row = asRecord(value);
      return (
        templateIds.has(String(row.templateId)) &&
        exerciseIds.has(String(row.exerciseDefinitionId))
      );
    },
  );

  snapshot.workoutSessionExercises = snapshot.workoutSessionExercises.filter(
    (value) => {
      const row = asRecord(value);
      return (
        sessionIds.has(String(row.sessionId)) &&
        exerciseIds.has(String(row.exerciseDefinitionId))
      );
    },
  );

  const templateExerciseIds = ids("workoutTemplateExercises");
  const sessionExerciseIds = ids("workoutSessionExercises");

  snapshot.strengthSets = snapshot.strengthSets.filter((value) => {
    const row = asRecord(value);
    return (
      sessionIds.has(String(row.sessionId)) &&
      sessionExerciseIds.has(String(row.sessionExerciseId))
    );
  });

  snapshot.progressionSuggestions = snapshot.progressionSuggestions.filter(
    (value) => {
      const row = asRecord(value);
      const validTemplate =
        !row.templateId || templateIds.has(String(row.templateId));
      const validTemplateExercise =
        !row.templateExerciseId ||
        templateExerciseIds.has(String(row.templateExerciseId));
      return (
        sessionIds.has(String(row.sessionId)) &&
        sessionExerciseIds.has(String(row.sessionExerciseId)) &&
        exerciseIds.has(String(row.exerciseDefinitionId)) &&
        validTemplate &&
        validTemplateExercise
      );
    },
  );
}

function countDiff(
  accountRows: readonly unknown[],
  mergedRows: readonly unknown[],
): { add: number; update: number; remove: number; unchanged: number } {
  const accountById = new Map(
    accountRows.map((value) => {
      const row = asRecord(value);
      return [rowId(row), JSON.stringify(row)];
    }),
  );
  const mergedById = new Map(
    mergedRows.map((value) => {
      const row = asRecord(value);
      return [rowId(row), JSON.stringify(row)];
    }),
  );

  let add = 0;
  let update = 0;
  let unchanged = 0;
  for (const [id, value] of mergedById) {
    const current = accountById.get(id);
    if (current === undefined) add += 1;
    else if (current === value) unchanged += 1;
    else update += 1;
  }

  let remove = 0;
  for (const id of accountById.keys()) {
    if (!mergedById.has(id)) remove += 1;
  }
  return { add, update, remove, unchanged };
}

function createPreview(
  guest: DatabaseSnapshot,
  account: DatabaseSnapshot,
  merged: DatabaseSnapshot,
): GuestDataImportPreview {
  const categories = CATEGORY_DEFINITIONS.map((definition) => {
    let guestRecords = 0;
    let accountRecords = 0;
    let recordsToAdd = 0;
    let recordsToUpdate = 0;
    let recordsToRemove = 0;

    for (const tableName of definition.tables) {
      guestRecords += guest[tableName].length;
      accountRecords += account[tableName].length;
      const diff = countDiff(account[tableName], merged[tableName]);
      recordsToAdd += diff.add;
      recordsToUpdate += diff.update;
      recordsToRemove += diff.remove;
    }

    return {
      ...definition,
      guestRecords,
      accountRecords,
      recordsToAdd,
      recordsToUpdate,
      recordsToRemove,
    };
  });

  const guestRecordCount = databaseTableNames.reduce(
    (total, tableName) => total + guest[tableName].length,
    0,
  );
  const accountRecordCount = databaseTableNames.reduce(
    (total, tableName) => total + account[tableName].length,
    0,
  );
  const totals = databaseTableNames.reduce(
    (result, tableName) => {
      const diff = countDiff(account[tableName], merged[tableName]);
      result.add += diff.add;
      result.update += diff.update;
      result.remove += diff.remove;
      result.unchanged += diff.unchanged;
      return result;
    },
    { add: 0, update: 0, remove: 0, unchanged: 0 },
  );

  return {
    guestRecordCount,
    accountRecordCount,
    recordsToAdd: totals.add,
    recordsToUpdate: totals.update,
    recordsToRemove: totals.remove,
    unchangedAccountRecords: totals.unchanged,
    hasGuestData: guestRecordCount > 0,
    categories,
  };
}

async function openDatabase(
  databaseName: string,
  provided: AppDatabase | undefined,
): Promise<{ database: AppDatabase; owned: boolean }> {
  if (provided) {
    await provided.open();
    return { database: provided, owned: false };
  }
  const database = new AppDatabase(databaseName);
  await database.open();
  return { database, owned: true };
}

function resolveSourceDatabase(
  options: GuestDataImportServiceOptions,
): AppDatabase | undefined {
  if (options.sourceDatabase) return options.sourceDatabase;
  return activeDataSpace.kind === "guest" ? appDatabase : undefined;
}

function resolveTargetDatabase(
  accountFingerprint: string,
  options: GuestDataImportServiceOptions,
): AppDatabase | undefined {
  if (options.targetDatabase) return options.targetDatabase;
  return activeDataSpace.kind === "account" &&
    activeDataSpace.accountFingerprint === accountFingerprint
    ? appDatabase
    : undefined;
}

export async function prepareGuestDataImport(
  accountFingerprint: string,
  options: GuestDataImportServiceOptions = {},
): Promise<PreparedGuestDataImport> {
  const normalized = normalizeFingerprint(accountFingerprint);
  const sourceDatabaseName = DEFAULT_DATABASE_NAME;
  const targetDatabaseName = accountDatabaseNameForFingerprint(normalized);
  if (sourceDatabaseName === targetDatabaseName) {
    throw new Error(
      "La source invitée et la cible du compte doivent être distinctes.",
    );
  }

  const targetDatabaseExisted = await Dexie.exists(targetDatabaseName);
  const sourceHandle = await openDatabase(
    sourceDatabaseName,
    resolveSourceDatabase(options),
  );
  const targetHandle = await openDatabase(
    targetDatabaseName,
    resolveTargetDatabase(normalized, options),
  );

  try {
    const sourceSnapshot = await readSnapshot(sourceHandle.database);
    const targetSnapshot = await readSnapshot(targetHandle.database);
    const mergedSnapshot = mergeSnapshots(sourceSnapshot, targetSnapshot);

    return {
      accountFingerprint: normalized,
      sourceDatabaseName,
      targetDatabaseName,
      sourceFingerprint: snapshotFingerprint(sourceSnapshot),
      targetFingerprint: snapshotFingerprint(targetSnapshot),
      targetDatabaseExisted,
      mergedSnapshot,
      preview: createPreview(sourceSnapshot, targetSnapshot, mergedSnapshot),
    };
  } finally {
    if (sourceHandle.owned) sourceHandle.database.close();
    if (targetHandle.owned) targetHandle.database.close();
    if (!targetDatabaseExisted && targetHandle.owned) {
      await Dexie.delete(targetDatabaseName);
    }
  }
}

export async function applyPreparedGuestDataImport(
  prepared: PreparedGuestDataImport,
  options: GuestDataImportServiceOptions = {},
): Promise<GuestDataImportResult> {
  const normalized = normalizeFingerprint(prepared.accountFingerprint);
  const sourceHandle = await openDatabase(
    prepared.sourceDatabaseName,
    resolveSourceDatabase(options),
  );
  const targetHandle = await openDatabase(
    prepared.targetDatabaseName,
    resolveTargetDatabase(normalized, options),
  );

  try {
    const currentSource = await readSnapshot(sourceHandle.database);
    if (snapshotFingerprint(currentSource) !== prepared.sourceFingerprint) {
      throw new Error(
        "Les données invitées ont changé depuis l’analyse. Relance l’analyse avant de les importer.",
      );
    }

    const tables = databaseTableNames.map((tableName) =>
      targetHandle.database.table(tableName),
    );

    await targetHandle.database.transaction("rw", tables, async () => {
      const currentTarget = await readSnapshot(targetHandle.database);
      if (snapshotFingerprint(currentTarget) !== prepared.targetFingerprint) {
        throw new Error(
          "Les données du compte ont changé depuis l’analyse. Relance l’analyse avant de les importer.",
        );
      }

      for (const tableName of databaseTableNames) {
        const table = targetHandle.database.table(tableName);
        await table.clear();
        const rows = prepared.mergedSnapshot[tableName];
        for (
          let offset = 0;
          offset < rows.length;
          offset += IMPORT_BATCH_SIZE
        ) {
          await table.bulkPut(rows.slice(offset, offset + IMPORT_BATCH_SIZE));
        }
      }
    });

    const space = activateAccountDataSpace(
      normalized,
      options.storage,
      options.now,
    );
    return {
      importedRecords: prepared.preview.recordsToAdd,
      updatedRecords: prepared.preview.recordsToUpdate,
      removedDuplicates: prepared.preview.recordsToRemove,
      sourcePreserved: true,
      space,
    };
  } finally {
    if (sourceHandle.owned) sourceHandle.database.close();
    if (targetHandle.owned) targetHandle.database.close();
  }
}

export async function hasGuestUserData(
  database: AppDatabase | undefined = activeDataSpace.kind === "guest"
    ? appDatabase
    : undefined,
): Promise<boolean> {
  const handle = await openDatabase(DEFAULT_DATABASE_NAME, database);
  try {
    for (const tableName of databaseTableNames) {
      if ((await handle.database.table(tableName).count()) > 0) return true;
    }
    return false;
  } finally {
    if (handle.owned) handle.database.close();
  }
}

export function accountSpaceExists(
  accountFingerprint: string,
  storage?: DataSpaceStorage,
): boolean {
  const normalized = normalizeFingerprint(accountFingerprint);
  return readDataSpaceRegistry(storage).spaces.some(
    (space) =>
      space.kind === "account" && space.accountFingerprint === normalized,
  );
}
