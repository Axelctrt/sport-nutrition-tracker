import {
  RepositoryError,
  type RepositoryOperation,
} from '@/domain/errors/RepositoryError';
import { trackDatabaseWrite } from '@/infrastructure/database/databaseWriteBarrier';

export async function runRepositoryOperation<T>(
  operation: RepositoryOperation,
  message: string,
  action: () => Promise<T>,
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

  return operation === 'read' ? execute() : trackDatabaseWrite(execute);
}
