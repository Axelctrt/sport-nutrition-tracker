import {
  applyRealGoalConcurrentReconciliation,
  prepareRealGoalConcurrentReconciliation,
  type GoalConcurrentReconciliationChoice,
  type PreparedRealGoalConcurrentReconciliation,
} from '@/infrastructure/sync-prototype/realGoalConcurrentResolutionService';
import {
  registeredGoalSyncContext,
  type RealGoalSyncResult,
} from '@/infrastructure/sync-prototype/realGoalSyncService';

export async function prepareRegisteredRealGoalConcurrentReconciliation(
  currentUserId: string,
): Promise<PreparedRealGoalConcurrentReconciliation> {
  const context = registeredGoalSyncContext(currentUserId);
  return prepareRealGoalConcurrentReconciliation(
    context.localDatabase,
    context.cloudDatabase,
    currentUserId,
  );
}

export async function applyRegisteredRealGoalConcurrentReconciliation(
  currentUserId: string,
  prepared: PreparedRealGoalConcurrentReconciliation,
  choice: GoalConcurrentReconciliationChoice,
): Promise<RealGoalSyncResult> {
  const context = registeredGoalSyncContext(currentUserId);
  return applyRealGoalConcurrentReconciliation(
    context.localDatabase,
    context.cloudDatabase,
    currentUserId,
    prepared,
    choice,
  );
}
