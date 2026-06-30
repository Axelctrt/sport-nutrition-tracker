import { RepositoryError } from '@/domain/errors/RepositoryError';
import {
  createDeletedDeletionRecord,
  createRestoredDeletionRecord,
  deletionRecordId,
  deletionTargetsForTrashItem,
  type DeletionRecordStatus,
} from '@/domain/models/deletion';
import { publishTrashUndoAvailable } from '@/shared/trash/trashUndoEvents';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type { MealSlot } from '@/domain/models/food';
import {
  TRASH_RETENTION_DAYS,
  type TrashEntityType,
  type TrashItem,
} from '@/domain/models/trash';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { updateEntity } from '@/shared/utils/entities';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

const mealSlotLabels: Record<MealSlot, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snacks: 'Collation',
};

function createTrashId(
  entityType: TrashEntityType,
  entityId: EntityId,
): string {
  return `${entityType}:${entityId}`;
}

function createPurgeDate(now: Date): string {
  return new Date(
    now.getTime() + TRASH_RETENTION_DAYS * MILLISECONDS_PER_DAY,
  ).toISOString();
}

export async function persistDeletionRecordsForTrashItem(
  database: AppDatabase,
  trashItem: TrashItem,
  status: DeletionRecordStatus,
  occurredAt: string,
): Promise<void> {
  const targets = deletionTargetsForTrashItem(trashItem);
  const ids = targets.map((target) =>
    deletionRecordId(target.entityType, target.entityId),
  );
  const existing = await database.deletionRecords.bulkGet(ids);
  const records = targets.map((target, index) =>
    status === 'deleted'
      ? createDeletedDeletionRecord(
          target,
          trashItem.deletedAt,
          existing[index],
        )
      : createRestoredDeletionRecord(
          target,
          occurredAt,
          trashItem.deletedAt,
          existing[index],
        ),
  );

  if (records.length > 0) {
    await database.deletionRecords.bulkPut(records);
  }
}

async function purgeExpiredInsideTransaction(
  database: AppDatabase,
  now: Date,
): Promise<number> {
  return database.trashItems
    .where('purgeAt')
    .belowOrEqual(now.toISOString())
    .delete();
}

export async function moveActivityToTrash(
  database: AppDatabase,
  activityId: EntityId,
  now: Date = new Date(),
): Promise<TrashItem | undefined> {
  const trashItem = await database.transaction(
    'rw',
    database.activities,
    database.trashItems,
    database.deletionRecords,
    async () => {
      await purgeExpiredInsideTransaction(database, now);

      const activity = await database.activities.get(activityId);
      if (!activity) return undefined;

      const trashItem: TrashItem = {
        id: createTrashId('activity', activity.id),
        entityType: 'activity',
        entityId: activity.id,
        label: `Activité ${activity.type} du ${activity.date}`,
        deletedAt: now.toISOString(),
        purgeAt: createPurgeDate(now),
        payload: activity,
      };

      await database.trashItems.put(trashItem);
      await persistDeletionRecordsForTrashItem(
        database,
        trashItem,
        'deleted',
        trashItem.deletedAt,
      );
      await database.activities.delete(activity.id);

      return trashItem;
    },
  );

  if (trashItem) {
    publishTrashUndoAvailable({
      trashItemId: trashItem.id,
      label: trashItem.label,
    });
  }

  return trashItem;
}

export async function moveWeightToTrash(
  database: AppDatabase,
  date: LocalDate,
  now: Date = new Date(),
): Promise<TrashItem | undefined> {
  const trashItem = await database.transaction(
    'rw',
    database.weights,
    database.trashItems,
    database.deletionRecords,
    async () => {
      await purgeExpiredInsideTransaction(database, now);

      const weight = await database.weights
        .where('date')
        .equals(date)
        .first();
      if (!weight) return undefined;

      const trashItem: TrashItem = {
        id: createTrashId('weight', weight.id),
        entityType: 'weight',
        entityId: weight.id,
        label: `Pesée du ${weight.date}`,
        deletedAt: now.toISOString(),
        purgeAt: createPurgeDate(now),
        payload: weight,
      };

      await database.trashItems.put(trashItem);
      await persistDeletionRecordsForTrashItem(
        database,
        trashItem,
        'deleted',
        trashItem.deletedAt,
      );
      await database.weights.delete(weight.id);

      return trashItem;
    },
  );

  if (trashItem) {
    publishTrashUndoAvailable({
      trashItemId: trashItem.id,
      label: trashItem.label,
    });
  }

  return trashItem;
}

export async function moveFoodEntryToTrash(
  database: AppDatabase,
  entryId: EntityId,
  now: Date = new Date(),
): Promise<TrashItem | undefined> {
  const trashItem = await database.transaction(
    'rw',
    database.foodEntries,
    database.trashItems,
    database.deletionRecords,
    async () => {
      await purgeExpiredInsideTransaction(database, now);

      const entry = await database.foodEntries.get(entryId);
      if (!entry) return undefined;

      const trashItem: TrashItem = {
        id: createTrashId('foodEntry', entry.id),
        entityType: 'foodEntry',
        entityId: entry.id,
        label: `${mealSlotLabels[entry.mealSlot]} du ${entry.date}`,
        deletedAt: now.toISOString(),
        purgeAt: createPurgeDate(now),
        payload: entry,
      };

      await database.trashItems.put(trashItem);
      await persistDeletionRecordsForTrashItem(
        database,
        trashItem,
        'deleted',
        trashItem.deletedAt,
      );
      await database.foodEntries.delete(entry.id);

      return trashItem;
    },
  );

  if (trashItem) {
    publishTrashUndoAvailable({
      trashItemId: trashItem.id,
      label: trashItem.label,
    });
  }

  return trashItem;
}

export async function moveMealToTrash(
  database: AppDatabase,
  mealId: EntityId,
  now: Date = new Date(),
): Promise<TrashItem | undefined> {
  const trashItem = await database.transaction(
    'rw',
    database.meals,
    database.foodEntries,
    database.trashItems,
    database.deletionRecords,
    async () => {
      await purgeExpiredInsideTransaction(database, now);

      const meal = await database.meals.get(mealId);
      if (!meal) return undefined;

      const entries = await database.foodEntries
        .where('mealId')
        .equals(meal.id)
        .toArray();

      const trashItem: TrashItem = {
        id: createTrashId('meal', meal.id),
        entityType: 'meal',
        entityId: meal.id,
        label:
          meal.title?.trim() ||
          `${mealSlotLabels[meal.slot]} du ${meal.date}`,
        deletedAt: now.toISOString(),
        purgeAt: createPurgeDate(now),
        payload: {
          meal,
          entries,
        },
      };

      await database.trashItems.put(trashItem);
      await persistDeletionRecordsForTrashItem(
        database,
        trashItem,
        'deleted',
        trashItem.deletedAt,
      );

      if (entries.length > 0) {
        await database.foodEntries.bulkDelete(
          entries.map((entry) => entry.id),
        );
      }

      await database.meals.delete(meal.id);
      return trashItem;
    },
  );

  if (trashItem) {
    publishTrashUndoAvailable({
      trashItemId: trashItem.id,
      label: trashItem.label,
    });
  }

  return trashItem;
}

export async function moveFavoriteMealToTrash(
  database: AppDatabase,
  favoriteMealId: EntityId,
  now: Date = new Date(),
): Promise<TrashItem | undefined> {
  const trashItem = await database.transaction(
    'rw',
    database.favoriteMeals,
    database.trashItems,
    database.deletionRecords,
    async () => {
      await purgeExpiredInsideTransaction(database, now);

      const favoriteMeal =
        await database.favoriteMeals.get(favoriteMealId);
      if (!favoriteMeal) return undefined;

      const trashItem: TrashItem = {
        id: createTrashId('favoriteMeal', favoriteMeal.id),
        entityType: 'favoriteMeal',
        entityId: favoriteMeal.id,
        label: `Repas favori « ${favoriteMeal.name} »`,
        deletedAt: now.toISOString(),
        purgeAt: createPurgeDate(now),
        payload: favoriteMeal,
      };

      await database.trashItems.put(trashItem);
      await persistDeletionRecordsForTrashItem(
        database,
        trashItem,
        'deleted',
        trashItem.deletedAt,
      );
      await database.favoriteMeals.delete(favoriteMeal.id);

      return trashItem;
    },
  );

  if (trashItem) {
    publishTrashUndoAvailable({
      trashItemId: trashItem.id,
      label: trashItem.label,
    });
  }

  return trashItem;
}

export async function moveRecipeToTrash(
  database: AppDatabase,
  recipeId: EntityId,
  now: Date = new Date(),
): Promise<TrashItem | undefined> {
  const trashItem = await database.transaction(
    'rw',
    database.recipes,
    database.recipeIngredients,
    database.trashItems,
    database.deletionRecords,
    async () => {
      await purgeExpiredInsideTransaction(database, now);

      const recipe = await database.recipes.get(recipeId);
      if (!recipe) return undefined;

      const ingredients = await database.recipeIngredients
        .where('recipeId')
        .equals(recipe.id)
        .toArray();

      const trashItem: TrashItem = {
        id: createTrashId('recipe', recipe.id),
        entityType: 'recipe',
        entityId: recipe.id,
        label: `Recette « ${recipe.name} »`,
        deletedAt: now.toISOString(),
        purgeAt: createPurgeDate(now),
        payload: {
          recipe,
          ingredients,
        },
      };

      await database.trashItems.put(trashItem);
      await persistDeletionRecordsForTrashItem(
        database,
        trashItem,
        'deleted',
        trashItem.deletedAt,
      );

      if (ingredients.length > 0) {
        await database.recipeIngredients.bulkDelete(
          ingredients.map((ingredient) => ingredient.id),
        );
      }

      await database.recipes.delete(recipe.id);
      return trashItem;
    },
  );

  if (trashItem) {
    publishTrashUndoAvailable({
      trashItemId: trashItem.id,
      label: trashItem.label,
    });
  }

  return trashItem;
}

export async function moveStrengthSetToTrash(
  database: AppDatabase,
  sessionExerciseId: EntityId,
  setId: EntityId,
  now: Date = new Date(),
): Promise<TrashItem> {
  const trashItem = await database.transaction(
    'rw',
    [
      database.strengthSets,
      database.trashItems,
      database.deletionRecords,
    ],
    async () => {
      await purgeExpiredInsideTransaction(database, now);

      const current = await database.strengthSets.get(setId);
      if (
        !current ||
        current.sessionExerciseId !== sessionExerciseId
      ) {
        throw new RepositoryError(
          'Série introuvable.',
          'delete',
        );
      }

      const trashItem: TrashItem = {
        id: createTrashId('strengthSet', current.id),
        entityType: 'strengthSet',
        entityId: current.id,
        label: `Série ${current.setNumber} de musculation`,
        deletedAt: now.toISOString(),
        purgeAt: createPurgeDate(now),
        payload: current,
      };

      await database.trashItems.put(trashItem);
      await persistDeletionRecordsForTrashItem(
        database,
        trashItem,
        'deleted',
        trashItem.deletedAt,
      );
      await database.strengthSets.delete(current.id);

      const remaining = (
        await database.strengthSets
          .where('sessionExerciseId')
          .equals(sessionExerciseId)
          .toArray()
      ).sort((left, right) => left.setNumber - right.setNumber);

      const renumbered = remaining.map((set, index) =>
        updateEntity(set, { setNumber: index + 1 }),
      );

      if (renumbered.length > 0) {
        await database.strengthSets.bulkPut(renumbered);
      }

      return trashItem;
    },
  );

  if (trashItem) {
    publishTrashUndoAvailable({
      trashItemId: trashItem.id,
      label: trashItem.label,
    });
  }

  return trashItem;
}

export async function moveWorkoutSessionExerciseToTrash(
  database: AppDatabase,
  sessionId: EntityId,
  sessionExerciseId: EntityId,
  now: Date = new Date(),
): Promise<TrashItem> {
  const trashItem = await database.transaction(
    'rw',
    [
      database.workoutSessionExercises,
      database.strengthSets,
      database.trashItems,
      database.deletionRecords,
    ],
    async () => {
      await purgeExpiredInsideTransaction(database, now);

      const exercise =
        await database.workoutSessionExercises.get(
          sessionExerciseId,
        );

      if (!exercise || exercise.sessionId !== sessionId) {
        throw new RepositoryError(
          'Exercice de séance introuvable.',
          'delete',
        );
      }

      const sets = await database.strengthSets
        .where('sessionExerciseId')
        .equals(sessionExerciseId)
        .toArray();

      const trashItem: TrashItem = {
        id: createTrashId(
          'workoutSessionExercise',
          exercise.id,
        ),
        entityType: 'workoutSessionExercise',
        entityId: exercise.id,
        label: `Exercice « ${exercise.exerciseNameSnapshot} »`,
        deletedAt: now.toISOString(),
        purgeAt: createPurgeDate(now),
        payload: {
          exercise,
          sets,
        },
      };

      await database.trashItems.put(trashItem);
      await persistDeletionRecordsForTrashItem(
        database,
        trashItem,
        'deleted',
        trashItem.deletedAt,
      );

      if (sets.length > 0) {
        await database.strengthSets.bulkDelete(
          sets.map((set) => set.id),
        );
      }

      await database.workoutSessionExercises.delete(
        sessionExerciseId,
      );

      return trashItem;
    },
  );

  if (trashItem) {
    publishTrashUndoAvailable({
      trashItemId: trashItem.id,
      label: trashItem.label,
    });
  }

  return trashItem;
}
export async function listTrashItems(
  database: AppDatabase,
): Promise<TrashItem[]> {
  return database.trashItems
    .orderBy('deletedAt')
    .reverse()
    .toArray();
}

async function assertNoIdsExist(
  ids: EntityId[],
  getExisting: (idsToRead: EntityId[]) => Promise<Array<unknown>>,
  message: string,
): Promise<void> {
  if (ids.length === 0) return;

  const existing = await getExisting(ids);
  if (existing.some((item) => item !== undefined)) {
    throw new Error(message);
  }
}

export async function restoreTrashItem(
  database: AppDatabase,
  trashItemId: string,
  now: Date = new Date(),
): Promise<TrashItem> {
  return database.transaction(
    'rw',
    [
      database.trashItems,
      database.activities,
      database.weights,
      database.meals,
      database.foodEntries,
      database.favoriteMeals,
      database.recipes,
      database.recipeIngredients,
      database.workoutSessions,
      database.workoutSessionExercises,
      database.strengthSets,
      database.deletionRecords,
    ],
    async () => {
      const trashItem = await database.trashItems.get(trashItemId);
      if (!trashItem) {
        throw new Error(
          'Cet élément n’existe plus dans la corbeille.',
        );
      }

      switch (trashItem.entityType) {
        case 'activity': {
          const existingActivity = await database.activities.get(
            trashItem.entityId,
          );
          if (existingActivity) {
            throw new Error(
              'Une activité avec le même identifiant existe déjà.',
            );
          }

          await database.activities.add(trashItem.payload);
          break;
        }

        case 'weight': {
          const existingWeight = await database.weights
            .where('date')
            .equals(trashItem.payload.date)
            .first();

          if (existingWeight) {
            throw new Error(
              'Une pesée existe déjà pour cette date. Supprime-la ou modifie-la avant de restaurer celle-ci.',
            );
          }

          await database.weights.add(trashItem.payload);
          break;
        }

        case 'foodEntry': {
          const existingEntry = await database.foodEntries.get(
            trashItem.entityId,
          );
          if (existingEntry) {
            throw new Error(
              'Une entrée alimentaire avec le même identifiant existe déjà.',
            );
          }

          const meal = await database.meals.get(
            trashItem.payload.mealId,
          );
          if (!meal) {
            throw new Error(
              'Le repas associé n’existe plus. Restaure d’abord ce repas s’il se trouve dans la corbeille.',
            );
          }

          await database.foodEntries.add(trashItem.payload);
          break;
        }

        case 'meal': {
          const existingMealById = await database.meals.get(
            trashItem.entityId,
          );
          const existingMealBySlot = await database.meals
            .where('[date+slot]')
            .equals([
              trashItem.payload.meal.date,
              trashItem.payload.meal.slot,
            ])
            .first();

          if (existingMealById || existingMealBySlot) {
            throw new Error(
              'Un repas existe déjà pour cette date et ce créneau.',
            );
          }

          await assertNoIdsExist(
            trashItem.payload.entries.map((entry) => entry.id),
            (ids) => database.foodEntries.bulkGet(ids),
            'Une entrée alimentaire du repas existe déjà.',
          );

          await database.meals.add(trashItem.payload.meal);
          if (trashItem.payload.entries.length > 0) {
            await database.foodEntries.bulkAdd(
              trashItem.payload.entries,
            );
          }
          break;
        }

        case 'strengthSet': {
          const parentExercise =
            await database.workoutSessionExercises.get(
              trashItem.payload.sessionExerciseId,
            );

          if (!parentExercise) {
            throw new Error(
              'L’exercice associé n’existe plus. Restaure d’abord cet exercice s’il se trouve dans la corbeille.',
            );
          }

          const existingSet = await database.strengthSets.get(
            trashItem.entityId,
          );
          if (existingSet) {
            throw new Error(
              'Une série avec le même identifiant existe déjà.',
            );
          }

          const siblingSets = (
            await database.strengthSets
              .where('sessionExerciseId')
              .equals(trashItem.payload.sessionExerciseId)
              .toArray()
          ).sort(
            (left, right) => left.setNumber - right.setNumber,
          );

          const hasNumberCollision = siblingSets.some(
            (set) =>
              set.setNumber === trashItem.payload.setNumber,
          );

          if (hasNumberCollision) {
            const shifted = siblingSets
              .filter(
                (set) =>
                  set.setNumber >= trashItem.payload.setNumber,
              )
              .map((set) =>
                updateEntity(set, {
                  setNumber: set.setNumber + 1,
                }),
              );

            if (shifted.length > 0) {
              await database.strengthSets.bulkPut(shifted);
            }
          }

          await database.strengthSets.add(trashItem.payload);
          break;
        }

        case 'workoutSessionExercise': {
          const session = await database.workoutSessions.get(
            trashItem.payload.exercise.sessionId,
          );
          if (!session) {
            throw new Error(
              'La séance associée n’existe plus.',
            );
          }

          const existingExercise =
            await database.workoutSessionExercises.get(
              trashItem.entityId,
            );
          if (existingExercise) {
            throw new Error(
              'Un exercice de séance avec le même identifiant existe déjà.',
            );
          }

          await assertNoIdsExist(
            trashItem.payload.sets.map((set) => set.id),
            (ids) => database.strengthSets.bulkGet(ids),
            'Une série de cet exercice existe déjà.',
          );

          const siblingExercises =
            await database.workoutSessionExercises
              .where('sessionId')
              .equals(trashItem.payload.exercise.sessionId)
              .toArray();

          const hasOrderCollision = siblingExercises.some(
            (exercise) =>
              exercise.sortOrder ===
              trashItem.payload.exercise.sortOrder,
          );

          if (hasOrderCollision) {
            const shifted = siblingExercises
              .filter(
                (exercise) =>
                  exercise.sortOrder >=
                  trashItem.payload.exercise.sortOrder,
              )
              .map((exercise) =>
                updateEntity(exercise, {
                  sortOrder: exercise.sortOrder + 1,
                }),
              );

            if (shifted.length > 0) {
              await database.workoutSessionExercises.bulkPut(
                shifted,
              );
            }
          }

          await database.workoutSessionExercises.add(
            trashItem.payload.exercise,
          );

          if (trashItem.payload.sets.length > 0) {
            await database.strengthSets.bulkAdd(
              trashItem.payload.sets,
            );
          }
          break;
        }

        case 'favoriteMeal': {
          const existingFavorite = await database.favoriteMeals.get(
            trashItem.entityId,
          );
          if (existingFavorite) {
            throw new Error(
              'Un repas favori avec le même identifiant existe déjà.',
            );
          }

          await database.favoriteMeals.add(trashItem.payload);
          break;
        }

        case 'recipe': {
          const existingRecipe = await database.recipes.get(
            trashItem.entityId,
          );
          if (existingRecipe) {
            throw new Error(
              'Une recette avec le même identifiant existe déjà.',
            );
          }

          await assertNoIdsExist(
            trashItem.payload.ingredients.map(
              (ingredient) => ingredient.id,
            ),
            (ids) => database.recipeIngredients.bulkGet(ids),
            'Un ingrédient de la recette existe déjà.',
          );

          await database.recipes.add(trashItem.payload.recipe);
          if (trashItem.payload.ingredients.length > 0) {
            await database.recipeIngredients.bulkAdd(
              trashItem.payload.ingredients,
            );
          }
          break;
        }
      }

      await persistDeletionRecordsForTrashItem(
        database,
        trashItem,
        'restored',
        now.toISOString(),
      );
      await database.trashItems.delete(trashItem.id);
      return trashItem;
    },
  );
}

export async function deleteTrashItemPermanently(
  database: AppDatabase,
  trashItemId: string,
): Promise<void> {
  await database.trashItems.delete(trashItemId);
}

export async function purgeExpiredTrashItems(
  database: AppDatabase,
  now: Date = new Date(),
): Promise<number> {
  return database.transaction(
    'rw',
    database.trashItems,
    () => purgeExpiredInsideTransaction(database, now),
  );
}
