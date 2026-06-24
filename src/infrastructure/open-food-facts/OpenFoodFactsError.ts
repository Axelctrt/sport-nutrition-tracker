export type OpenFoodFactsErrorCode =
  | 'aborted'
  | 'http'
  | 'invalid-response'
  | 'network'
  | 'not-found'
  | 'rate-limit'
  | 'timeout'
  | 'unavailable';

export class OpenFoodFactsError extends Error {
  readonly code: OpenFoodFactsErrorCode;
  readonly status: number | undefined;

  constructor(message: string, code: OpenFoodFactsErrorCode, status?: number) {
    super(message);
    this.name = 'OpenFoodFactsError';
    this.code = code;
    this.status = status;
  }
}
