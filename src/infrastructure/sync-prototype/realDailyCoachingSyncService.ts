import type { EntityMetadata, LocalDate } from '@/domain/models/common';
import type {
  DailyActivityDecision,
  DailyCheckIn,
  DailyCheckOut,
} from '@/domain/models/dailyCoaching';
import type { DailySteps } from '@/domain/models/steps';
import {
  dailyActivityDecisionIdForDate,
  dailyCheckInIdForDate,
  dailyCheckOutIdForDate,
  dailyStepsIdForDate,
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
import { sameLocalCollection } from '@/infrastructure/sync-prototype/localSyncCompareAndSwap';

export interface DailyCoachingDayAggregate {
  readonly id: string;
  readonly date: LocalDate;
  readonly checkIn?: DailyCheckIn;
  readonly activityDecision?: DailyActivityDecision;
  readonly checkOut?: DailyCheckOut;
  readonly steps?: DailySteps;
  readonly updatedAt: string;
}

type CloudDailyCoachingDay = Omit<DailyCoachingDayAggregate, 'id'> & {
  readonly id: string;
};

export interface RealDailyCoachingSyncPreview {
  readonly localDayCount: number;
  readonly cloudDayCount: number;
  readonly differingEntityCount: number;
}

export interface RealDailyCoachingSyncResult
  extends RealDailyCoachingSyncPreview {
  readonly uploadedDays: number;
  readonly downloadedDays: number;
  readonly completedAt: string;
}

interface DailyCoachingState {
  readonly localRaw: DailyCoachingDayAggregate[];
  readonly localSyncable: DailyCoachingDayAggregate[];
  readonly cloud: DailyCoachingDayAggregate[];
  readonly cloudRows: readonly CloudOwned<CloudDailyCoachingDay>[];
}

function aggregateId(date: LocalDate): string {
  return `daily-coaching:${date}`;
}

function maxUpdatedAt(
  values: readonly (Pick<EntityMetadata, 'updatedAt'> | undefined)[],
): string {
  return values.reduce(
    (latest, value) =>
      value && value.updatedAt > latest ? value.updatedAt : latest,
    '',
  );
}

function canonicalizeByDate<T extends EntityMetadata & { date: LocalDate }>(
  values: readonly T[],
  idForDate: (date: LocalDate) => string,
): T[] {
  const byDate = new Map<LocalDate, T>();
  for (const value of values) {
    const selected = chooseLatest(byDate.get(value.date), value);
    if (selected) byDate.set(value.date, { ...selected, id: idForDate(value.date) });
  }
  return [...byDate.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

function buildAggregates(
  checkIns: readonly DailyCheckIn[],
  decisions: readonly DailyActivityDecision[],
  checkOuts: readonly DailyCheckOut[],
  steps: readonly DailySteps[],
): DailyCoachingDayAggregate[] {
  const canonicalCheckIns = canonicalizeByDate(checkIns, dailyCheckInIdForDate);
  const canonicalDecisions = canonicalizeByDate(
    decisions,
    dailyActivityDecisionIdForDate,
  );
  const canonicalCheckOuts = canonicalizeByDate(checkOuts, dailyCheckOutIdForDate);
  const canonicalSteps = canonicalizeByDate(steps, dailyStepsIdForDate);
  const checkInByDate = new Map(canonicalCheckIns.map((value) => [value.date, value]));
  const decisionByDate = new Map(canonicalDecisions.map((value) => [value.date, value]));
  const checkOutByDate = new Map(canonicalCheckOuts.map((value) => [value.date, value]));
  const stepsByDate = new Map(canonicalSteps.map((value) => [value.date, value]));
  const dates = new Set<LocalDate>([
    ...checkInByDate.keys(),
    ...decisionByDate.keys(),
    ...checkOutByDate.keys(),
    ...stepsByDate.keys(),
  ]);

  return [...dates].sort().map((date) => {
    const checkIn = checkInByDate.get(date);
    const activityDecision = decisionByDate.get(date);
    const checkOut = checkOutByDate.get(date);
    const daySteps = stepsByDate.get(date);
    const entities = [checkIn, activityDecision, checkOut, daySteps];
    return {
      id: aggregateId(date),
      date,
      ...(checkIn ? { checkIn } : {}),
      ...(activityDecision ? { activityDecision } : {}),
      ...(checkOut ? { checkOut } : {}),
      ...(daySteps ? { steps: daySteps } : {}),
      updatedAt: maxUpdatedAt(entities),
    };
  });
}

function sanitizeContext<T extends DailyCheckIn | DailyCheckOut>(value: T): T {
  return value.contextSyncPreference === 'localOnly'
    ? { ...value, contextFlags: [] }
    : value;
}

function sanitizeAggregate(
  value: DailyCoachingDayAggregate,
): DailyCoachingDayAggregate {
  return {
    ...value,
    ...(value.checkIn ? { checkIn: sanitizeContext(value.checkIn) } : {}),
    ...(value.checkOut ? { checkOut: sanitizeContext(value.checkOut) } : {}),
  };
}

function validateAggregate(value: DailyCoachingDayAggregate): void {
  if (value.id !== aggregateId(value.date)) {
    throw new Error(
      `La journee quotidienne ${value.date} possede un identifiant incoherent.`,
    );
  }
  const sections = [
    value.checkIn,
    value.activityDecision,
    value.checkOut,
    value.steps,
  ];
  if (sections.some((section) => section && section.date !== value.date)) {
    throw new Error(
      `La journee quotidienne ${value.date} contient une section mal datee.`,
    );
  }
  if (value.updatedAt !== maxUpdatedAt(sections)) {
    throw new Error(
      `La journee quotidienne ${value.date} possede un horodatage incoherent.`,
    );
  }
}

function mergeAggregate(
  local: DailyCoachingDayAggregate | undefined,
  cloud: DailyCoachingDayAggregate | undefined,
): DailyCoachingDayAggregate | undefined {
  if (!local) return cloud;
  if (!cloud) return local;
  const checkIn = chooseLatest(local.checkIn, cloud.checkIn);
  const activityDecision = chooseLatest(
    local.activityDecision,
    cloud.activityDecision,
  );
  const checkOut = chooseLatest(local.checkOut, cloud.checkOut);
  const steps = chooseLatest(local.steps, cloud.steps);
  const entities = [checkIn, activityDecision, checkOut, steps];
  return {
    id: aggregateId(local.date),
    date: local.date,
    ...(checkIn ? { checkIn } : {}),
    ...(activityDecision ? { activityDecision } : {}),
    ...(checkOut ? { checkOut } : {}),
    ...(steps ? { steps } : {}),
    updatedAt: maxUpdatedAt(entities),
  };
}

function mapById<T extends { id: string }>(values: readonly T[]): Map<string, T> {
  return new Map(values.map((value) => [value.id, value]));
}

function resolveFinalState(
  state: DailyCoachingState,
): DailyCoachingDayAggregate[] {
  const localById = mapById(state.localSyncable);
  const cloudById = mapById(state.cloud);
  const ids = new Set([...localById.keys(), ...cloudById.keys()]);
  return [...ids]
    .sort()
    .map((id) => mergeAggregate(localById.get(id), cloudById.get(id)))
    .filter((value): value is DailyCoachingDayAggregate => value !== undefined);
}

function differenceCount(
  left: readonly DailyCoachingDayAggregate[],
  right: readonly DailyCoachingDayAggregate[],
): number {
  const leftById = mapById(left);
  const rightById = mapById(right);
  const ids = new Set([...leftById.keys(), ...rightById.keys()]);
  return [...ids].filter((id) =>
    !sameEntity(leftById.get(id), rightById.get(id)),
  ).length;
}

function toCloudDay(day: DailyCoachingDayAggregate): CloudDailyCoachingDay {
  validateAggregate(day);
  return { ...sanitizeAggregate(day), id: cloudPrivateId(day.id) };
}

function fromCloudDay(
  day: CloudOwned<CloudDailyCoachingDay>,
): DailyCoachingDayAggregate | undefined {
  const id = localIdFromCloud(day.id);
  if (!id) return undefined;
  const value = sanitizeAggregate({ ...stripCloudFields(day), id });
  validateAggregate(value);
  return value;
}

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<DailyCoachingState> {
  const [checkIns, decisions, checkOuts, steps, cloudRows] = await Promise.all([
    localDatabase.dailyCheckIns.toArray(),
    localDatabase.dailyActivityDecisions.toArray(),
    localDatabase.dailyCheckOuts.toArray(),
    localDatabase.dailySteps.toArray(),
    cloudDatabase.realDailyCoachingDays.toArray(),
  ]);
  const localRaw = buildAggregates(checkIns, decisions, checkOuts, steps);
  return {
    localRaw,
    localSyncable: localRaw.map(sanitizeAggregate),
    cloud: cloudRows
      .filter((row) => belongsToCurrentUser(row, currentUserId))
      .map(fromCloudDay)
      .filter((row): row is DailyCoachingDayAggregate => row !== undefined),
    cloudRows,
  };
}

function previewFrom(
  state: DailyCoachingState,
  final: readonly DailyCoachingDayAggregate[],
): RealDailyCoachingSyncPreview {
  return {
    localDayCount: state.localSyncable.length,
    cloudDayCount: state.cloud.length,
    differingEntityCount:
      differenceCount(state.localSyncable, final)
      + differenceCount(state.cloud, final),
  };
}

export async function previewRealDailyCoachingSync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealDailyCoachingSyncPreview> {
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  return previewFrom(state, resolveFinalState(state));
}

function restoreLocalOnlyContext(
  final: DailyCoachingDayAggregate,
  local: DailyCoachingDayAggregate | undefined,
): DailyCoachingDayAggregate {
  const preserve = <T extends DailyCheckIn | DailyCheckOut>(
    value: T | undefined,
    existing: T | undefined,
  ): T | undefined => value?.contextSyncPreference === 'localOnly'
    ? { ...value, contextFlags: existing?.contextFlags ?? [] }
    : value;
  const checkIn = preserve(final.checkIn, local?.checkIn);
  const checkOut = preserve(final.checkOut, local?.checkOut);
  return {
    ...final,
    ...(checkIn ? { checkIn } : {}),
    ...(checkOut ? { checkOut } : {}),
  };
}

export async function synchronizeRealDailyCoaching(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  options: CloudSyncExecutionOptions = {},
): Promise<RealDailyCoachingSyncResult> {
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const final = resolveFinalState(state);
  const preview = previewFrom(state, final);
  const localById = mapById(state.localSyncable);
  const localRawById = mapById(state.localRaw);
  const cloudById = mapById(state.cloud);
  const uploaded = final.filter((value) =>
    !sameEntity(cloudById.get(value.id), value),
  );
  const downloaded = final.filter((value) =>
    !sameEntity(localById.get(value.id), value),
  );
  let localApplied = false;

  await localDatabase.transaction(
    'rw',
    localDatabase.dailyCheckIns,
    localDatabase.dailyActivityDecisions,
    localDatabase.dailyCheckOuts,
    localDatabase.dailySteps,
    async () => {
      const current = buildAggregates(
        await localDatabase.dailyCheckIns.toArray(),
        await localDatabase.dailyActivityDecisions.toArray(),
        await localDatabase.dailyCheckOuts.toArray(),
        await localDatabase.dailySteps.toArray(),
      );
      if (!sameLocalCollection(current, state.localRaw)) return;

      for (const day of final) {
        const localDay = restoreLocalOnlyContext(day, localRawById.get(day.id));
        if (localDay.checkIn) {
          await localDatabase.dailyCheckIns
            .where('date')
            .equals(day.date)
            .and((value) => value.id !== localDay.checkIn?.id)
            .delete();
          await localDatabase.dailyCheckIns.put(localDay.checkIn);
        }
        if (localDay.activityDecision) {
          await localDatabase.dailyActivityDecisions
            .where('date')
            .equals(day.date)
            .and((value) => value.id !== localDay.activityDecision?.id)
            .delete();
          await localDatabase.dailyActivityDecisions.put(localDay.activityDecision);
        }
        if (localDay.checkOut) {
          await localDatabase.dailyCheckOuts
            .where('date')
            .equals(day.date)
            .and((value) => value.id !== localDay.checkOut?.id)
            .delete();
          await localDatabase.dailyCheckOuts.put(localDay.checkOut);
        }
        if (localDay.steps) {
          await localDatabase.dailySteps
            .where('date')
            .equals(day.date)
            .and((value) => value.id !== localDay.steps?.id)
            .delete();
          await localDatabase.dailySteps.put(localDay.steps);
        }
      }
      localApplied = true;
    },
  );

  if (options.writeCloud !== false && localApplied) {
    for (const day of uploaded) {
      await cloudDatabase.realDailyCoachingDays.put(toCloudDay(day));
    }
  }

  return {
    ...preview,
    uploadedDays:
      options.writeCloud !== false && localApplied ? uploaded.length : 0,
    downloadedDays: localApplied ? downloaded.length : 0,
    completedAt: new Date().toISOString(),
  };
}
