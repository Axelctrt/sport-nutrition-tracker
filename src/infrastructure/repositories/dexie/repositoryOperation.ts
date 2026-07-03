import {
  RepositoryError,
  type RepositoryOperation,
} from '@/domain/errors/RepositoryError';
import type { SyncOrchestratorDomainId } from '@/application/sync/syncOrchestrator';
import { notifySyncLocalDataChanged } from '@/application/sync/syncLocalChangeEvents';
import { trackDatabaseWrite } from '@/infrastructure/database/databaseWriteBarrier';

interface RepositoryOperationOptions {
  readonly syncDomainIds?: readonly SyncOrchestratorDomainId[];
  readonly syncReason?: string;
}

export async function runRepositoryOperation<T>(
  operation: RepositoryOperation,
  message: string,
  action: () => Promise<T>,
  options?: RepositoryOperationOptions,
): Promise<T> {
  const execute = async () => {
    try {
      return await action();
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }

      throw new RepositoryError(message, operation, { cause: error });
    }
  };

  if (operation === 'read') return execute();

  const result = await trackDatabaseWrite(execute);
  if (options?.syncDomainIds?.length) {
    notifySyncLocalDataChanged(options.syncDomainIds, options.syncReason);
  }
  return result;
}
