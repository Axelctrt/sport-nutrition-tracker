import { assertFiniteNumber, assertPositiveNumber } from '@/domain/calculations/validation';

export function roundToIncrement(value: number, increment: number): number {
  assertFiniteNumber(value, 'value');
  assertPositiveNumber(increment, 'increment');

  const rounded = Math.round((value + Number.EPSILON) / increment) * increment;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function roundUpToIncrement(value: number, increment: number): number {
  assertFiniteNumber(value, 'value');
  assertPositiveNumber(increment, 'increment');

  const rounded = Math.ceil(value / increment) * increment;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function roundCalories(value: number): number {
  return roundToIncrement(value, 10);
}

export function roundMacroGrams(value: number): number {
  return roundToIncrement(value, 5);
}
