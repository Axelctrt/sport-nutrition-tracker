export type CalculationErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_DATE'
  | 'INCONSISTENT_DATE';

export class CalculationError extends Error {
  readonly code: CalculationErrorCode;
  readonly field: string | undefined;

  constructor(
    message: string,
    code: CalculationErrorCode = 'INVALID_INPUT',
    field?: string,
  ) {
    super(message);
    this.name = 'CalculationError';
    this.code = code;
    this.field = field;
  }
}
