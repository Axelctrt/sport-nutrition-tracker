import {
  RepositoryError,
  type RepositoryOperation,
} from '@/domain/errors/RepositoryError';

export async function runRepositoryOperation<T>(
  operation: RepositoryOperation,
  message: string,
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof RepositoryError) {
      throw error;
    }

    throw new RepositoryError(message, operation, { cause: error });
  }
}
