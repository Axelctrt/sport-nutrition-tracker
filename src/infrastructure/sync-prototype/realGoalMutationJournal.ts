import type { Table } from 'dexie';
import type { UserLogin } from 'dexie-cloud-addon';
import type { Goal } from '@/domain/goals/goalState';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  belongsToCurrentUser,
  type CloudOwned,
} from '@/infrastructure/sync-prototype/cloudSyncValue';
import { createEntityId } from '@/shared/utils/entities';

export type RealGoalMutationOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore';

/**
 * Immutable, independently replicated description of one Goals mutation.
 *
 * `orderedAtMs` is not the raw device clock. It is calibrated from the Dexie
 * authentication session. `orderCounter` is the logical part of the HLC and
 * only advances when the calibrated physical part cannot advance.
 */
export interface RealGoalMutationRecord {
  readonly id: string;
  readonly accountUserId: string;
  readonly entityId: string;
  readonly operation: RealGoalMutationOperation;
  readonly goal?: Goal;
  readonly marker?: DeletionRecord;
  readonly orderedAtMs: number;
  readonly orderCounter: number;
  readonly actorId: string;
  readonly actorSequence: number;
  readonly rawOccurredAt: string;
  readonly clockSource: 'dexie-auth-session-v1';
  readonly clockUncertaintyMs: number;
}

export interface RealGoalMutationClockState {
  readonly id: string;
  readonly accountUserId: string;
  readonly actorId: string;
  readonly clockOffsetMs: number;
  readonly calibratedFromLoginAt: string;
  readonly calibratedFromTokenExpiration: string;
  readonly clockUncertaintyMs: number;
  readonly lastOrderedAtMs: number;
  readonly lastOrderCounter: number;
  readonly actorSequence: number;
}

export interface ResolvedRealGoalMutationState {
  readonly goals: readonly Goal[];
  readonly markers: readonly DeletionRecord[];
  readonly authoritativeEntityIds: ReadonlySet<string>;
  readonly winners: ReadonlyMap<string, RealGoalMutationRecord>;
}

type DexieCloudSessionClock = Pick<
  UserLogin,
  'lastLogin' | 'accessTokenExpiration'
>;

const CLOCK_UNCERTAINTY_MS = 1_000;

export function realGoalMutationTable(
  cloudDatabase: SyncPrototypeDatabase,
): Table<RealGoalMutationRecord, string> | undefined {
  try {
    return cloudDatabase.table<RealGoalMutationRecord, string>(
      'realGoalMutations',
    );
  } catch {
    return undefined;
  }
}

export function realGoalMutationClockTable(
  cloudDatabase: SyncPrototypeDatabase,
): Table<RealGoalMutationClockState, string> | undefined {
  try {
    return cloudDatabase.table<RealGoalMutationClockState, string>(
      'realGoalMutationClocks',
    );
  } catch {
    return undefined;
  }
}

export function compareRealGoalMutationOrder(
  left: RealGoalMutationRecord,
  right: RealGoalMutationRecord,
): number {
  if (left.orderedAtMs !== right.orderedAtMs) {
    return left.orderedAtMs > right.orderedAtMs ? 1 : -1;
  }
  if (left.orderCounter !== right.orderCounter) {
    return left.orderCounter > right.orderCounter ? 1 : -1;
  }
  const actorOrder = left.actorId.localeCompare(right.actorId);
  if (actorOrder !== 0) return actorOrder;
  if (left.actorSequence !== right.actorSequence) {
    return left.actorSequence > right.actorSequence ? 1 : -1;
  }
  return left.id.localeCompare(right.id);
}

function isValidMutation(
  mutation: CloudOwned<RealGoalMutationRecord>,
  currentUserId: string,
): mutation is CloudOwned<RealGoalMutationRecord> {
  if (
    !belongsToCurrentUser(mutation, currentUserId)
    || mutation.accountUserId !== currentUserId
    || !mutation.entityId
    || !Number.isSafeInteger(mutation.orderedAtMs)
    || mutation.orderedAtMs < 0
    || !Number.isSafeInteger(mutation.orderCounter)
    || mutation.orderCounter < 0
    || !Number.isSafeInteger(mutation.actorSequence)
    || mutation.actorSequence < 1
    || !mutation.actorId
  ) {
    return false;
  }
  if (mutation.operation === 'delete') {
    return !mutation.goal
      && mutation.marker?.entityType === 'goal'
      && mutation.marker.entityId === mutation.entityId
      && mutation.marker.status === 'deleted';
  }
  return mutation.goal?.id === mutation.entityId
    && mutation.marker?.entityType === 'goal'
    && mutation.marker.entityId === mutation.entityId
    && mutation.marker.status === 'restored';
}

export function resolveRealGoalMutationJournal(
  mutations: readonly CloudOwned<RealGoalMutationRecord>[],
  currentUserId: string,
): ResolvedRealGoalMutationState {
  const winners = new Map<string, RealGoalMutationRecord>();
  for (const mutation of mutations) {
    if (!isValidMutation(mutation, currentUserId)) continue;
    const current = winners.get(mutation.entityId);
    if (!current || compareRealGoalMutationOrder(mutation, current) > 0) {
      winners.set(mutation.entityId, mutation);
    }
  }

  const goals: Goal[] = [];
  const markers: DeletionRecord[] = [];
  for (const winner of winners.values()) {
    if (winner.goal) goals.push(winner.goal);
    if (winner.marker) markers.push(winner.marker);
  }
  goals.sort((left, right) => left.id.localeCompare(right.id));
  markers.sort((left, right) => left.id.localeCompare(right.id));

  return {
    goals,
    markers,
    authoritativeEntityIds: new Set(winners.keys()),
    winners,
  };
}

function clockStateId(accountUserId: string, actorId: string): string {
  return `${accountUserId}:goals:${actorId}`;
}

function sessionCalibration(
  session: DexieCloudSessionClock,
): Pick<
  RealGoalMutationClockState,
  | 'clockOffsetMs'
  | 'calibratedFromLoginAt'
  | 'calibratedFromTokenExpiration'
  | 'clockUncertaintyMs'
> | undefined {
  const lastLoginMs = session.lastLogin?.getTime();
  const tokenExpirationMs = session.accessTokenExpiration?.getTime();
  if (
    !Number.isFinite(lastLoginMs)
    || !Number.isFinite(tokenExpirationMs)
  ) {
    return undefined;
  }
  return {
    clockOffsetMs: Number(tokenExpirationMs) - Number(lastLoginMs),
    calibratedFromLoginAt: new Date(Number(lastLoginMs)).toISOString(),
    calibratedFromTokenExpiration:
      new Date(Number(tokenExpirationMs)).toISOString(),
    clockUncertaintyMs: CLOCK_UNCERTAINTY_MS,
  };
}

function resolveClockState(
  accountUserId: string,
  actorId: string,
  session: DexieCloudSessionClock,
  previous?: RealGoalMutationClockState,
): RealGoalMutationClockState {
  if (
    previous
    && (
      previous.accountUserId !== accountUserId
      || previous.actorId !== actorId
    )
  ) {
    throw new Error(
      'La calibration Goals appartient à un autre compte ou appareil.',
    );
  }
  const calibration = sessionCalibration(session);
  if (!calibration && !previous) {
    throw new Error(
      'La calibration temporelle Dexie Goals est indisponible. La mutation locale reste dans AppDB et devra être restagée après authentification.',
    );
  }
  return {
    id: clockStateId(accountUserId, actorId),
    accountUserId,
    actorId,
    ...(previous ?? {
      lastOrderedAtMs: 0,
      lastOrderCounter: 0,
      actorSequence: 0,
    }),
    ...(calibration ?? {}),
  } as RealGoalMutationClockState;
}

function createClockState(
  accountUserId: string,
  actorId: string,
  session: DexieCloudSessionClock,
): RealGoalMutationClockState {
  return {
    ...resolveClockState(accountUserId, actorId, session),
    lastOrderedAtMs: 0,
    lastOrderCounter: 0,
    actorSequence: 0,
  };
}

export async function appendRealGoalMutation(input: {
  readonly mutationTable: Table<RealGoalMutationRecord, string>;
  readonly clockTable: Table<RealGoalMutationClockState, string>;
  readonly accountUserId: string;
  readonly actorId: string;
  readonly session: DexieCloudSessionClock;
  readonly operation: RealGoalMutationOperation;
  readonly entityId: string;
  readonly goal?: Goal;
  readonly marker?: DeletionRecord;
  readonly now?: () => number;
}): Promise<RealGoalMutationRecord> {
  const id = clockStateId(input.accountUserId, input.actorId);
  const stored = await input.clockTable.get(id);
  const previous = stored
    ? resolveClockState(
      input.accountUserId,
      input.actorId,
      input.session,
      stored,
    )
    : createClockState(input.accountUserId, input.actorId, input.session);

  const rawNowMs = input.now?.() ?? Date.now();
  const calibratedNowMs = Math.round(rawNowMs + previous.clockOffsetMs);
  const orderedAtMs = Math.max(calibratedNowMs, previous.lastOrderedAtMs);
  const orderCounter = calibratedNowMs > previous.lastOrderedAtMs
    ? 0
    : previous.lastOrderCounter + 1;
  const actorSequence = previous.actorSequence + 1;
  const mutation: RealGoalMutationRecord = {
    id: `#goal-mutation-${input.actorId}-${actorSequence}-${createEntityId()}`,
    accountUserId: input.accountUserId,
    entityId: input.entityId,
    operation: input.operation,
    ...(input.goal ? { goal: structuredClone(input.goal) } : {}),
    ...(input.marker ? { marker: structuredClone(input.marker) } : {}),
    orderedAtMs,
    orderCounter,
    actorId: input.actorId,
    actorSequence,
    rawOccurredAt: new Date(rawNowMs).toISOString(),
    clockSource: 'dexie-auth-session-v1',
    clockUncertaintyMs: previous.clockUncertaintyMs,
  };

  await input.mutationTable.add(mutation);
  await input.clockTable.put({
    ...previous,
    lastOrderedAtMs: orderedAtMs,
    lastOrderCounter: orderCounter,
    actorSequence,
  });
  return mutation;
}
