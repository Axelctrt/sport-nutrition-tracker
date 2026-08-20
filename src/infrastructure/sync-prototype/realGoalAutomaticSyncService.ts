import {
  logicalSyncBaselineId,
  logicalSyncBaselineTable,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  registeredGoalSyncContext,
  synchronizeRealGoals,
  type RealGoalSyncResult,
} from '@/infrastructure/sync-prototype/realGoalSyncService';

/**
 * Automatic Goals convergence must arbitrate with business mutation timestamps,
 * never with transport provenance alone. A late Dexie Cloud row may carry a
 * higher syncRevision while its Goal.updatedAt is older than the local value.
 *
 * realSyncBaselines is device-local metadata. Removing only the Goals baseline
 * immediately before synchronization makes the existing service enter its
 * unknown/both merge path, whose winner is resolved by Goal/DeletionRecord
 * updatedAt (with the existing deterministic tie-break).
 */
export async function synchronizeRegisteredRealGoalsByBusinessLww(
  currentUserId: string,
): Promise<RealGoalSyncResult> {
  const context = registeredGoalSyncContext(currentUserId);
  await logicalSyncBaselineTable(context.cloudDatabase)?.delete(
    logicalSyncBaselineId(currentUserId, 'goals', 'goals'),
  );

  return synchronizeRealGoals(
    context.localDatabase,
    context.cloudDatabase,
    currentUserId,
  );
}
