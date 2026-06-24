export type RepositoryOperation =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'initialize';

export class RepositoryError extends Error {
  readonly operation: RepositoryOperation;

  constructor(message: string, operation: RepositoryOperation, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RepositoryError';
    this.operation = operation;
  }
}
