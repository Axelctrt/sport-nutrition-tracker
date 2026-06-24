import { CalculationError } from '@/domain/errors/CalculationError';

export function assertFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new CalculationError(
      `${field} doit être un nombre fini.`,
      'INVALID_INPUT',
      field,
    );
  }
}

export function assertNonNegativeNumber(value: number, field: string): void {
  assertFiniteNumber(value, field);

  if (value < 0) {
    throw new CalculationError(
      `${field} ne peut pas être négatif.`,
      'INVALID_INPUT',
      field,
    );
  }
}

export function assertPositiveNumber(value: number, field: string): void {
  assertFiniteNumber(value, field);

  if (value <= 0) {
    throw new CalculationError(
      `${field} doit être strictement positif.`,
      'INVALID_INPUT',
      field,
    );
  }
}

export function assertNonNegativeInteger(value: number, field: string): void {
  assertNonNegativeNumber(value, field);

  if (!Number.isInteger(value)) {
    throw new CalculationError(
      `${field} doit être un nombre entier.`,
      'INVALID_INPUT',
      field,
    );
  }
}
