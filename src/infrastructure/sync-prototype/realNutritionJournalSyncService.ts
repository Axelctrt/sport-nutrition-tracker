import type {
  DailyJournalStatus,
  FoodEntry,
  Meal,
} from '@/domain/models/food';
import type { DailyTarget } from '@/domain/models/targets';
import type { DeletionRecord } from '@/domain/models/deletion';
import {
  createDeletedDeletionRecord,
  createRestoredDeletionRecord,
  deletionRecordId,
} from '@/domain/models/deletion';
import type { EntityMetadata, LocalDate } from '@/domain/models/common';
import {
  dailyJournalStatusIdForDate,
  dailyTargetIdForDate,
} from '@/domain/sync/deterministicEntityIds';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  belongsToCurrentUser,
  chooseLatest,
  cloudPrivateId,
  localIdFromCloud,
  sameEntity,
  stripCloudFields,
  type CloudOwned,
  type CloudSyncExecutionOptions,
} from '@/infrastructure/sync-prototype/cloudSyncValue';

const JOURNAL_MARKER_TYPES = ['meal', 'foodEntry'] as const;
type JournalMarkerType = (typeof JOURNAL_MARKER_TYPES)[number];

export interface NutritionJournalDayAggregate {
  readonly id: string;
  readonly date: LocalDate;
  readonly meals: readonly Meal[];
  readonly entries: readonly FoodEntry[];
  readonly target?: DailyTarget;
  readonly status?: DailyJournalStatus;
  readonly updatedAt: string;
}

type CloudNutritionJournalDay = Omit<NutritionJournalDayAggregate, 'id'> & {
  readonly id: string;
};
type CloudDeletionRecord = Omit<DeletionRecord, 'id'> & { readonly id: string };

export interface RealNutritionJournalSyncPreview {
  readonly localDayCount: number;
  readonly cloudDayCount: number;
  readonly localEntryCount: number;
  readonly cloudEntryCount: number;
  readonly localDeletionCount: number;
  readonly cloudDeletionCount: number;
  readonly differingEntityCount: number;
}

export interface RealNutritionJournalSyncResult
  extends RealNutritionJournalSyncPreview {
  readonly uploadedDays: number;
  readonly downloadedDays: number;
  readonly uploadedEntities: number;
  readonly downloadedEntities: number;
  readonly removedLocalEntities: number;
  readonly removedCloudEntities: number;
  readonly uploadedDeletionRecords: number;
  readonly downloadedDeletionRecords: number;
  readonly completedAt: string;
}

interface JournalEntityState<T extends EntityMetadata> {
  entity?: T;
  marker?: DeletionRecord;
}

interface JournalState {
  readonly localDays: NutritionJournalDayAggregate[];
  readonly cloudDays: NutritionJournalDayAggregate[];
  readonly localMarkers: DeletionRecord[];
  readonly cloudMarkers: DeletionRecord[];
}

function aggregateId(date: LocalDate): string {
  return `nutrition-journal:${date}`;
}

function maxUpdatedAt(values: readonly EntityMetadata[]): string {
  return values.reduce(
    (latest, value) => (value.updatedAt > latest ? value.updatedAt : latest),
    '',
  );
}

function sortById<T extends { id: string }>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
}

function buildDayAggregates(
  meals: readonly Meal[],
  entries: readonly FoodEntry[],
  targets: readonly DailyTarget[],
  statuses: readonly DailyJournalStatus[],
): NutritionJournalDayAggregate[] {
  const dates = new Set<LocalDate>([
    ...meals.map((value) => value.date),
    ...entries.map((value) => value.date),
    ...targets.map((value) => value.date),
    ...statuses.map((value) => value.date),
  ]);
  const targetByDate = new Map(targets.map((value) => [value.date, value]));
  const statusByDate = new Map(statuses.map((value) => [value.date, value]));

  return [...dates]
    .sort()
    .map((date) => {
      const dayMeals = sortById(meals.filter((value) => value.date === date));
      const dayEntries = sortById(entries.filter((value) => value.date === date));
      const target = targetByDate.get(date);
      const status = statusByDate.get(date);
      const entities: EntityMetadata[] = [
        ...dayMeals,
        ...dayEntries,
        ...(target ? [target] : []),
        ...(status ? [status] : []),
      ];

      return {
        id: aggregateId(date),
        date,
        meals: dayMeals,
        entries: dayEntries,
        ...(target ? { target } : {}),
        ...(status ? { status } : {}),
        updatedAt: maxUpdatedAt(entities),
      };
    });
}

function validateDayAggregate(day: NutritionJournalDayAggregate): void {
  const mealById = new Map<string, Meal>();
  const slots = new Set<string>();

  for (const meal of day.meals) {
    if (meal.date !== day.date) {
      throw new Error(`Le repas ${meal.id} n’appartient pas à la journée ${day.date}.`);
    }
    if (mealById.has(meal.id) || slots.has(meal.slot)) {
      throw new Error(`La journée ${day.date} contient des repas en double.`);
    }
    mealById.set(meal.id, meal);
    slots.add(meal.slot);
  }

  const entryIds = new Set<string>();
  for (const entry of day.entries) {
    if (entryIds.has(entry.id)) {
      throw new Error(`La journée ${day.date} contient une entrée alimentaire en double.`);
    }
    entryIds.add(entry.id);
    const meal = mealById.get(entry.mealId);
    if (
      !meal ||
      entry.date !== day.date ||
      meal.date !== entry.date ||
      meal.slot !== entry.mealSlot
    ) {
      throw new Error(
        `L’entrée alimentaire ${entry.id} ne possède pas de repas parent cohérent.`,
      );
    }
  }

  if (day.target && day.target.date !== day.date) {
    throw new Error(`L’objectif quotidien de ${day.date} possède une date incohérente.`);
  }
  if (day.status && day.status.date !== day.date) {
    throw new Error(`Le statut quotidien de ${day.date} possède une date incohérente.`);
  }
}

function toCloudDay(day: NutritionJournalDayAggregate): CloudNutritionJournalDay {
  return { ...day, id: cloudPrivateId(day.id) };
}

function fromCloudDay(
  day: CloudOwned<CloudNutritionJournalDay>,
): NutritionJournalDayAggregate | undefined {
  const localId = localIdFromCloud(day.id);
  if (!localId) return undefined;
  const value = { ...stripCloudFields(day), id: localId } as NutritionJournalDayAggregate;
  validateDayAggregate(value);
  return value;
}

function toCloudMarker(marker: DeletionRecord): CloudDeletionRecord {
  return { ...marker, id: cloudPrivateId(marker.id) };
}

function fromCloudMarker(
  marker: CloudOwned<CloudDeletionRecord>,
): DeletionRecord | undefined {
  const localId = localIdFromCloud(marker.id);
  if (!localId) return undefined;
  return { ...stripCloudFields(marker), id: localId };
}

function isJournalMarker(marker: DeletionRecord): marker is DeletionRecord & {
  entityType: JournalMarkerType;
} {
  return JOURNAL_MARKER_TYPES.includes(marker.entityType as JournalMarkerType);
}

function mapById<T extends { id: string }>(values: readonly T[]): Map<string, T> {
  return new Map(values.map((value) => [value.id, value]));
}

function canonicalizeByDate<T extends EntityMetadata & { date: LocalDate }>(
  values: readonly T[],
  canonicalIdForDate: (date: LocalDate) => string,
): T[] {
  const byDate = new Map<LocalDate, T>();

  for (const value of values) {
    const selected = chooseLatest(byDate.get(value.date), value);
    if (!selected) continue;
    byDate.set(value.date, {
      ...selected,
      id: canonicalIdForDate(value.date),
    });
  }

  return [...byDate.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

function createEntityState<T extends EntityMetadata>(
  entity: T | undefined,
  marker: DeletionRecord | undefined,
): JournalEntityState<T> {
  return {
    ...(entity ? { entity } : {}),
    ...(marker ? { marker } : {}),
  };
}

function flattenDays(
  days: readonly NutritionJournalDayAggregate[],
  validate = true,
) {
  const meals: Meal[] = [];
  const entries: FoodEntry[] = [];
  const targets: DailyTarget[] = [];
  const statuses: DailyJournalStatus[] = [];

  for (const day of days) {
    if (validate) validateDayAggregate(day);
    meals.push(...day.meals);
    entries.push(...day.entries);
    if (day.target) targets.push(day.target);
    if (day.status) statuses.push(day.status);
  }

  return { meals, entries, targets, statuses };
}

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<JournalState> {
  const [
    localMeals,
    localEntries,
    localTargets,
    localStatuses,
    localMarkers,
    cloudDayRows,
    cloudMarkerRows,
  ] = await Promise.all([
    localDatabase.meals.toArray(),
    localDatabase.foodEntries.toArray(),
    localDatabase.dailyTargets.toArray(),
    localDatabase.dailyJournalStatuses.toArray(),
    localDatabase.deletionRecords.toArray(),
    cloudDatabase.realNutritionJournalDays.toArray(),
    cloudDatabase.realNutritionJournalDeletionRecords.toArray(),
  ]);

  const localDays = buildDayAggregates(
    localMeals,
    localEntries,
    localTargets,
    localStatuses,
  );
  const cloudDays = cloudDayRows
    .filter((day) => belongsToCurrentUser(day, currentUserId))
    .map(fromCloudDay)
    .filter((day): day is NutritionJournalDayAggregate => day !== undefined);
  const cloudMarkers = cloudMarkerRows
    .filter((marker) => belongsToCurrentUser(marker, currentUserId))
    .map(fromCloudMarker)
    .filter((marker): marker is DeletionRecord => marker !== undefined)
    .filter(isJournalMarker);

  return {
    localDays,
    cloudDays,
    localMarkers: localMarkers.filter(isJournalMarker),
    cloudMarkers,
  };
}

function resolveEntityState<T extends EntityMetadata>(
  entityType: JournalMarkerType,
  entityId: string,
  local: JournalEntityState<T>,
  cloud: JournalEntityState<T>,
): JournalEntityState<T> {
  const entity = chooseLatest(local.entity, cloud.entity);
  let marker = chooseLatest(local.marker, cloud.marker);

  if (
    entity &&
    marker?.status === 'deleted' &&
    entity.updatedAt > marker.updatedAt
  ) {
    marker = createRestoredDeletionRecord(
      { entityType, entityId },
      entity.updatedAt,
      marker.deletedAt,
      marker,
    );
  }

  const deletionWins =
    marker?.status === 'deleted' &&
    (!entity || marker.updatedAt >= entity.updatedAt);

  return {
    ...(deletionWins ? {} : entity ? { entity } : {}),
    ...(marker ? { marker } : {}),
  };
}

function resolveFinalState(state: JournalState) {
  const local = flattenDays(state.localDays, false);
  const cloud = flattenDays(state.cloudDays);
  const localMealById = mapById(local.meals);
  const cloudMealById = mapById(cloud.meals);
  const localEntryById = mapById(local.entries);
  const cloudEntryById = mapById(cloud.entries);
  const canonicalTargets = canonicalizeByDate(
    [...local.targets, ...cloud.targets],
    dailyTargetIdForDate,
  );
  const canonicalStatuses = canonicalizeByDate(
    [...local.statuses, ...cloud.statuses],
    dailyJournalStatusIdForDate,
  );
  const localMarkerById = mapById(state.localMarkers);
  const cloudMarkerById = mapById(state.cloudMarkers);

  const finalMeals = new Map<string, Meal>();
  const finalEntries = new Map<string, FoodEntry>();
  const finalTargets = new Map<string, DailyTarget>();
  const finalStatuses = new Map<string, DailyJournalStatus>();
  const finalMarkers = new Map<string, DeletionRecord>();

  const mealIds = new Set([
    ...localMealById.keys(),
    ...cloudMealById.keys(),
    ...state.localMarkers.filter((marker) => marker.entityType === 'meal').map((marker) => marker.entityId),
    ...state.cloudMarkers.filter((marker) => marker.entityType === 'meal').map((marker) => marker.entityId),
  ]);
  for (const id of mealIds) {
    const markerId = deletionRecordId('meal', id);
    const resolved = resolveEntityState<Meal>(
      'meal',
      id,
      createEntityState(
        localMealById.get(id),
        localMarkerById.get(markerId),
      ),
      createEntityState(
        cloudMealById.get(id),
        cloudMarkerById.get(markerId),
      ),
    );
    if (resolved.entity) finalMeals.set(id, resolved.entity);
    if (resolved.marker) finalMarkers.set(markerId, resolved.marker);
  }

  const entryIds = new Set([
    ...localEntryById.keys(),
    ...cloudEntryById.keys(),
    ...state.localMarkers.filter((marker) => marker.entityType === 'foodEntry').map((marker) => marker.entityId),
    ...state.cloudMarkers.filter((marker) => marker.entityType === 'foodEntry').map((marker) => marker.entityId),
  ]);
  for (const id of entryIds) {
    const markerId = deletionRecordId('foodEntry', id);
    const resolved = resolveEntityState<FoodEntry>(
      'foodEntry',
      id,
      createEntityState(
        localEntryById.get(id),
        localMarkerById.get(markerId),
      ),
      createEntityState(
        cloudEntryById.get(id),
        cloudMarkerById.get(markerId),
      ),
    );
    if (resolved.entity) finalEntries.set(id, resolved.entity);
    if (resolved.marker) finalMarkers.set(markerId, resolved.marker);
  }

  for (const value of canonicalTargets) {
    finalTargets.set(value.id, value);
  }

  for (const value of canonicalStatuses) {
    finalStatuses.set(value.id, value);
  }

  for (const [entryId, entry] of [...finalEntries]) {
    let meal = finalMeals.get(entry.mealId);
    if (!meal) {
      const mealMarkerId = deletionRecordId('meal', entry.mealId);
      const mealMarker = finalMarkers.get(mealMarkerId);

      if (mealMarker?.status === 'deleted' && mealMarker.updatedAt >= entry.updatedAt) {
        finalEntries.delete(entryId);
        const entryMarkerId = deletionRecordId('foodEntry', entryId);
        const currentEntryMarker = finalMarkers.get(entryMarkerId);
        const deletedMarker = createDeletedDeletionRecord(
          { entityType: 'foodEntry', entityId: entryId },
          mealMarker.updatedAt,
          currentEntryMarker,
        );
        finalMarkers.set(entryMarkerId, deletedMarker);
        continue;
      }

      meal = {
        id: entry.mealId,
        date: entry.date,
        slot: entry.mealSlot,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
      finalMeals.set(meal.id, meal);

      if (mealMarker?.status === 'deleted') {
        finalMarkers.set(
          mealMarkerId,
          createRestoredDeletionRecord(
            { entityType: 'meal', entityId: meal.id },
            entry.updatedAt,
            mealMarker.deletedAt,
            mealMarker,
          ),
        );
      }
    }

    if (meal.date !== entry.date || meal.slot !== entry.mealSlot) {
      throw new Error(
        `L’entrée alimentaire ${entry.id} ne correspond pas à son repas parent ${meal.id}.`,
      );
    }
  }

  const days = buildDayAggregates(
    [...finalMeals.values()],
    [...finalEntries.values()],
    [...finalTargets.values()],
    [...finalStatuses.values()],
  );
  days.forEach(validateDayAggregate);

  return {
    meals: [...finalMeals.values()],
    entries: [...finalEntries.values()],
    targets: [...finalTargets.values()],
    statuses: [...finalStatuses.values()],
    markers: [...finalMarkers.values()],
    days,
  };
}

function countChanged<T extends { id: string }>(
  current: readonly T[],
  target: readonly T[],
): number {
  const currentById = mapById(current);
  return target.filter((value) => !sameEntity(currentById.get(value.id), value)).length;
}

function countRemoved<T extends { id: string }>(
  current: readonly T[],
  target: readonly T[],
): number {
  const targetIds = new Set(target.map((value) => value.id));
  return current.filter((value) => !targetIds.has(value.id)).length;
}

function buildPreview(state: JournalState): RealNutritionJournalSyncPreview {
  const localDayById = mapById(state.localDays);
  const cloudDayById = mapById(state.cloudDays);
  const localMarkerById = mapById(state.localMarkers);
  const cloudMarkerById = mapById(state.cloudMarkers);
  const ids = new Set([
    ...localDayById.keys(),
    ...cloudDayById.keys(),
    ...localMarkerById.keys(),
    ...cloudMarkerById.keys(),
  ]);

  let differingEntityCount = 0;
  for (const id of ids) {
    if (
      !sameEntity(localDayById.get(id), cloudDayById.get(id)) ||
      !sameEntity(localMarkerById.get(id), cloudMarkerById.get(id))
    ) {
      differingEntityCount += 1;
    }
  }

  return {
    localDayCount: state.localDays.length,
    cloudDayCount: state.cloudDays.length,
    localEntryCount: state.localDays.reduce((sum, day) => sum + day.entries.length, 0),
    cloudEntryCount: state.cloudDays.reduce((sum, day) => sum + day.entries.length, 0),
    localDeletionCount: state.localMarkers.filter((marker) => marker.status === 'deleted').length,
    cloudDeletionCount: state.cloudMarkers.filter((marker) => marker.status === 'deleted').length,
    differingEntityCount,
  };
}

export async function previewRealNutritionJournalSync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealNutritionJournalSyncPreview> {
  return buildPreview(await readState(localDatabase, cloudDatabase, currentUserId));
}

export async function synchronizeRealNutritionJournal(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  options: CloudSyncExecutionOptions = {},
): Promise<RealNutritionJournalSyncResult> {
  const writeCloud = options.writeCloud !== false;
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const preview = buildPreview(state);
  const final = resolveFinalState(state);
  const localFlat = flattenDays(state.localDays, false);
  const cloudFlat = flattenDays(state.cloudDays);

  const downloadedEntities =
    countChanged(localFlat.meals, final.meals) +
    countChanged(localFlat.entries, final.entries) +
    countChanged(localFlat.targets, final.targets) +
    countChanged(localFlat.statuses, final.statuses);
  const uploadedEntities = writeCloud
    ? countChanged(cloudFlat.meals, final.meals) +
      countChanged(cloudFlat.entries, final.entries) +
      countChanged(cloudFlat.targets, final.targets) +
      countChanged(cloudFlat.statuses, final.statuses)
    : 0;
  const removedLocalEntities =
    countRemoved(localFlat.meals, final.meals) +
    countRemoved(localFlat.entries, final.entries) +
    countRemoved(localFlat.targets, final.targets) +
    countRemoved(localFlat.statuses, final.statuses);
  const removedCloudEntities = writeCloud
    ? countRemoved(cloudFlat.meals, final.meals) +
      countRemoved(cloudFlat.entries, final.entries) +
      countRemoved(cloudFlat.targets, final.targets) +
      countRemoved(cloudFlat.statuses, final.statuses)
    : 0;
  const downloadedDays = countChanged(state.localDays, final.days) + countRemoved(state.localDays, final.days);
  const uploadedDays = writeCloud
    ? countChanged(state.cloudDays, final.days) + countRemoved(state.cloudDays, final.days)
    : 0;
  const downloadedDeletionRecords = countChanged(state.localMarkers, final.markers);
  const uploadedDeletionRecords = writeCloud
    ? countChanged(state.cloudMarkers, final.markers)
    : 0;

  await localDatabase.transaction(
    'rw',
    localDatabase.meals,
    localDatabase.foodEntries,
    localDatabase.dailyTargets,
    localDatabase.dailyJournalStatuses,
    localDatabase.deletionRecords,
    async () => {
      const finalMealIds = new Set(final.meals.map((value) => value.id));
      const finalEntryIds = new Set(final.entries.map((value) => value.id));
      const finalTargetIds = new Set(final.targets.map((value) => value.id));
      const finalStatusIds = new Set(final.statuses.map((value) => value.id));

      await localDatabase.meals.bulkDelete(localFlat.meals.filter((value) => !finalMealIds.has(value.id)).map((value) => value.id));
      await localDatabase.foodEntries.bulkDelete(localFlat.entries.filter((value) => !finalEntryIds.has(value.id)).map((value) => value.id));
      await localDatabase.dailyTargets.bulkDelete(localFlat.targets.filter((value) => !finalTargetIds.has(value.id)).map((value) => value.id));
      await localDatabase.dailyJournalStatuses.bulkDelete(localFlat.statuses.filter((value) => !finalStatusIds.has(value.id)).map((value) => value.id));

      if (final.meals.length > 0) await localDatabase.meals.bulkPut(final.meals);
      if (final.entries.length > 0) await localDatabase.foodEntries.bulkPut(final.entries);
      if (final.targets.length > 0) await localDatabase.dailyTargets.bulkPut(final.targets);
      if (final.statuses.length > 0) await localDatabase.dailyJournalStatuses.bulkPut(final.statuses);
      if (final.markers.length > 0) await localDatabase.deletionRecords.bulkPut(final.markers);
    },
  );

  if (writeCloud) await cloudDatabase.transaction(
    'rw',
    cloudDatabase.realNutritionJournalDays,
    cloudDatabase.realNutritionJournalDeletionRecords,
    async () => {
      const finalDayById = mapById(final.days);
      const cloudDayById = mapById(state.cloudDays);
      for (const cloudDay of state.cloudDays) {
        if (!finalDayById.has(cloudDay.id)) {
          await cloudDatabase.realNutritionJournalDays.delete(cloudPrivateId(cloudDay.id));
        }
      }
      for (const day of final.days) {
        if (!sameEntity(cloudDayById.get(day.id), day)) {
          await cloudDatabase.realNutritionJournalDays.put(toCloudDay(day));
        }
      }

      const cloudMarkerById = mapById(state.cloudMarkers);
      for (const marker of final.markers) {
        if (!sameEntity(cloudMarkerById.get(marker.id), marker)) {
          await cloudDatabase.realNutritionJournalDeletionRecords.put(toCloudMarker(marker));
        }
      }
    },
  );

  return {
    ...preview,
    uploadedDays,
    downloadedDays,
    uploadedEntities,
    downloadedEntities,
    removedLocalEntities,
    removedCloudEntities,
    uploadedDeletionRecords,
    downloadedDeletionRecords,
    completedAt: new Date().toISOString(),
  };
}
