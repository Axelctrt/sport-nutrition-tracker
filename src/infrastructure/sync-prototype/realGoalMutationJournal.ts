import Dexie, { type Table } from 'dexie';
import type { Goal } from '@/domain/goals/goalState';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  belongsToCurrentUser,
  sameEntity,
  stableValue,
  type CloudOwned,
} from '@/infrastructure/sync-prototype/cloudSyncValue';
import { createEntityId } from '@/shared/utils/entities';

export type RealGoalMutationOperation =
  | 'anchor'
  | 'create'
  | 'update'
  | 'delete'
  | 'restore';

/**
 * Immutable Goals intent. The v17 clock fields remain readable solely for
 * migration diagnostics. They never participate in v18 winner selection.
 */
export interface RealGoalMutationRecord {
  readonly id: string;
  readonly accountUserId: string;
  readonly entityId: string;
  readonly operation: RealGoalMutationOperation;
  readonly goal?: Goal;
  readonly marker?: DeletionRecord;
  readonly parentMutationId?: string;
  readonly causalVersion?: 1;
  readonly orderedAtMs?: number;
  readonly orderCounter?: number;
  readonly actorId?: string;
  readonly actorSequence?: number;
  readonly rawOccurredAt?: string;
  readonly clockSource?: 'dexie-auth-session-v1';
  readonly clockUncertaintyMs?: number;
}

/** Legacy local-only v17 state retained for additive migration only. */
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

export interface RealGoalMutationHead {
  readonly id: string;
  readonly accountUserId: string;
  readonly entityId: string;
  readonly mutationId: string;
}

export interface ResolvedRealGoalMutationState {
  readonly goals: readonly Goal[];
  readonly markers: readonly DeletionRecord[];
  readonly authoritativeEntityIds: ReadonlySet<string>;
  readonly incompleteEntityIds: ReadonlySet<string>;
  readonly legacyJournalEntityIds: ReadonlySet<string>;
  readonly winners: ReadonlyMap<string, RealGoalMutationRecord>;
}

const FNV_OFFSET_A = 0xcbf29ce484222325n;
const FNV_OFFSET_B = 0x84222325cbf29ce4n;
const FNV_PRIME = 0x100000001b3n;
const UINT64_MASK = 0xffffffffffffffffn;

function fnv1a64(value: string, offset: bigint): string {
  let hash = offset;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & UINT64_MASK;
  }
  return hash.toString(16).padStart(16, '0');
}

function deterministicKey(value: string): string {
  return `${fnv1a64(value, FNV_OFFSET_A)}${fnv1a64(value, FNV_OFFSET_B)}`;
}

export function realGoalMutationHeadId(
  accountUserId: string,
  entityId: string,
): string {
  return `goal-head-${deterministicKey(`${accountUserId}\u0000${entityId}`)}`;
}

export function realGoalMutationAnchorId(input: {
  readonly accountUserId: string;
  readonly entityId: string;
  readonly goal?: Goal;
  readonly marker?: DeletionRecord;
}): string {
  return `#goal-anchor-${deterministicKey(stableValue({
    accountUserId: input.accountUserId,
    entityId: input.entityId,
    goal: input.goal,
    marker: input.marker,
  }))}`;
}

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

export function realGoalMutationHeadTable(
  cloudDatabase: SyncPrototypeDatabase,
): Table<RealGoalMutationHead, string> | undefined {
  try {
    return cloudDatabase.table<RealGoalMutationHead, string>(
      'realGoalMutationHeads',
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

function isValidMutation(
  mutation: CloudOwned<RealGoalMutationRecord>,
  currentUserId: string,
): mutation is CloudOwned<RealGoalMutationRecord> {
  if (
    !belongsToCurrentUser(mutation, currentUserId)
    || mutation.accountUserId !== currentUserId
    || !mutation.id?.startsWith('#')
    || !mutation.entityId
  ) {
    return false;
  }
  if (mutation.operation === 'delete') {
    return !mutation.goal
      && mutation.marker?.entityType === 'goal'
      && mutation.marker.entityId === mutation.entityId
      && mutation.marker.status === 'deleted';
  }
  if (mutation.operation === 'anchor') {
    return mutation.causalVersion === 1
      && (!mutation.goal || mutation.goal.id === mutation.entityId)
      && (!mutation.marker || (
        mutation.marker.entityType === 'goal'
        && mutation.marker.entityId === mutation.entityId
      ));
  }
  return mutation.goal?.id === mutation.entityId
    && mutation.marker?.entityType === 'goal'
    && mutation.marker.entityId === mutation.entityId
    && mutation.marker.status === 'restored';
}

function isValidHead(
  head: CloudOwned<RealGoalMutationHead>,
  currentUserId: string,
): head is CloudOwned<RealGoalMutationHead> {
  return belongsToCurrentUser(head, currentUserId)
    && head.accountUserId === currentUserId
    && Boolean(head.entityId)
    && Boolean(head.mutationId)
    && !head.id.startsWith('#')
    && head.id === realGoalMutationHeadId(currentUserId, head.entityId);
}

export function resolveRealGoalMutationJournal(
  mutations: readonly CloudOwned<RealGoalMutationRecord>[],
  heads: readonly CloudOwned<RealGoalMutationHead>[],
  currentUserId: string,
): ResolvedRealGoalMutationState {
  const validMutations = mutations.filter((mutation) =>
    isValidMutation(mutation, currentUserId));
  const mutationById = new Map(validMutations.map((mutation) => [
    mutation.id,
    mutation,
  ]));
  const winners = new Map<string, RealGoalMutationRecord>();
  const authoritativeEntityIds = new Set<string>();
  const incompleteEntityIds = new Set<string>();

  for (const head of heads) {
    if (!isValidHead(head, currentUserId)) continue;
    authoritativeEntityIds.add(head.entityId);
    const mutation = mutationById.get(head.mutationId);
    if (!mutation || mutation.entityId !== head.entityId) {
      incompleteEntityIds.add(head.entityId);
      continue;
    }
    winners.set(head.entityId, mutation);
  }

  const legacyJournalEntityIds = new Set(
    validMutations
      .map((mutation) => mutation.entityId)
      .filter((entityId) => !authoritativeEntityIds.has(entityId)),
  );
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
    authoritativeEntityIds,
    incompleteEntityIds,
    legacyJournalEntityIds,
    winners,
  };
}

export function uniqueLegacyMutationState(
  mutations: readonly CloudOwned<RealGoalMutationRecord>[],
  currentUserId: string,
  entityId: string,
): Pick<RealGoalMutationRecord, 'goal' | 'marker' | 'operation'> | undefined {
  const candidates = mutations.filter((mutation) =>
    mutation.entityId === entityId && isValidMutation(mutation, currentUserId));
  if (candidates.length === 0) return undefined;
  const first = candidates[0]!;
  if (!candidates.every((candidate) => sameEntity(
    { goal: candidate.goal, marker: candidate.marker },
    { goal: first.goal, marker: first.marker },
  ))) {
    throw new Error(
      'Le journal Goals v17 contient plusieurs états sans head causal. Une réconciliation explicite est requise.',
    );
  }
  return {
    operation: first.operation,
    ...(first.goal ? { goal: first.goal } : {}),
    ...(first.marker ? { marker: first.marker } : {}),
  };
}

export async function bootstrapRealGoalMutationHead(input: {
  readonly database: Dexie;
  readonly mutationTable: Table<RealGoalMutationRecord, string>;
  readonly headTable: Table<RealGoalMutationHead, string>;
  readonly accountUserId: string;
  readonly entityId: string;
  readonly goal?: Goal;
  readonly marker?: DeletionRecord;
}): Promise<RealGoalMutationHead> {
  const headId = realGoalMutationHeadId(input.accountUserId, input.entityId);
  const anchorId = realGoalMutationAnchorId(input);
  const anchor: RealGoalMutationRecord = {
    id: anchorId,
    accountUserId: input.accountUserId,
    entityId: input.entityId,
    operation: 'anchor',
    ...(input.goal ? { goal: structuredClone(input.goal) } : {}),
    ...(input.marker ? { marker: structuredClone(input.marker) } : {}),
    causalVersion: 1,
  };
  const head: RealGoalMutationHead = {
    id: headId,
    accountUserId: input.accountUserId,
    entityId: input.entityId,
    mutationId: anchorId,
  };

  await input.database.transaction(
    'rw',
    [input.mutationTable, input.headTable],
    async () => {
      const existing = await input.headTable.get(headId);
      if (existing) {
        if (!sameEntity(existing, head)) {
          throw new Error(
            'Le head causal Goals existe avec une baseline différente. Réconciliation requise.',
          );
        }
        return;
      }
      await input.mutationTable.put(anchor);
      await input.headTable.put(head);
    },
  );
  return head;
}

export async function appendRealGoalMutation(input: {
  readonly database: Dexie;
  readonly mutationTable: Table<RealGoalMutationRecord, string>;
  readonly headTable: Table<RealGoalMutationHead, string>;
  readonly accountUserId: string;
  readonly operation: RealGoalMutationOperation;
  readonly entityId: string;
  readonly parentMutationId: string;
  readonly goal?: Goal;
  readonly marker?: DeletionRecord;
}): Promise<{
  readonly mutation: RealGoalMutationRecord;
  readonly headAdvanced: boolean;
}> {
  if (!input.parentMutationId) {
    throw new Error('Le parent causal Goals est requis.');
  }
  const mutation: RealGoalMutationRecord = {
    id: `#goal-mutation-${createEntityId()}`,
    accountUserId: input.accountUserId,
    entityId: input.entityId,
    operation: input.operation,
    ...(input.goal ? { goal: structuredClone(input.goal) } : {}),
    ...(input.marker ? { marker: structuredClone(input.marker) } : {}),
    parentMutationId: input.parentMutationId,
    causalVersion: 1,
  };
  let modified = 0;

  await input.database.transaction(
    'rw',
    [input.mutationTable, input.headTable],
    async () => {
      await input.mutationTable.add(mutation);
      modified = await input.headTable
        .where('[entityId+mutationId]')
        .equals([input.entityId, input.parentMutationId])
        .modify({ mutationId: mutation.id });
    },
  );
  return { mutation, headAdvanced: modified === 1 };
}
