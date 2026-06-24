import { CalculationError } from '@/domain/errors/CalculationError';
import type { LocalDate } from '@/domain/models/common';
import type { AgeInformation } from '@/domain/models/profile';
import { assertNonNegativeInteger } from '@/domain/calculations/validation';

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function parseLocalDate(value: LocalDate, field: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new CalculationError(
      `${field} doit respecter le format YYYY-MM-DD.`,
      'INVALID_DATE',
      field,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new CalculationError(
      `${field} n’est pas une date valide.`,
      'INVALID_DATE',
      field,
    );
  }

  return { year, month, day };
}

function compareDateParts(left: DateParts, right: DateParts): number {
  if (left.year !== right.year) {
    return left.year - right.year;
  }

  if (left.month !== right.month) {
    return left.month - right.month;
  }

  return left.day - right.day;
}

function completedYearsBetween(earlier: DateParts, later: DateParts): number {
  let years = later.year - earlier.year;
  const anniversaryHasOccurred = later.month > earlier.month
    || (later.month === earlier.month && later.day >= earlier.day);

  if (!anniversaryHasOccurred) {
    years -= 1;
  }

  return years;
}

function signedCompletedYearsBetween(from: DateParts, to: DateParts): number {
  if (compareDateParts(from, to) <= 0) {
    return completedYearsBetween(from, to);
  }

  return -completedYearsBetween(to, from);
}

export function calculateAgeYears(
  ageInformation: AgeInformation,
  calculationDate: LocalDate,
): number {
  const targetDate = parseLocalDate(calculationDate, 'calculationDate');

  if (ageInformation.mode === 'birthDate') {
    const birthDate = parseLocalDate(ageInformation.birthDate, 'birthDate');

    if (compareDateParts(targetDate, birthDate) < 0) {
      throw new CalculationError(
        'La date de calcul ne peut pas précéder la date de naissance.',
        'INVALID_DATE',
        'calculationDate',
      );
    }

    return completedYearsBetween(birthDate, targetDate);
  }

  assertNonNegativeInteger(ageInformation.ageYears, 'ageYears');
  const recordedOn = parseLocalDate(ageInformation.recordedOn, 'recordedOn');
  const calculatedAge = ageInformation.ageYears
    + signedCompletedYearsBetween(recordedOn, targetDate);

  if (calculatedAge < 0) {
    throw new CalculationError(
      'L’âge calculé ne peut pas être négatif.',
      'INVALID_INPUT',
      'ageYears',
    );
  }

  return calculatedAge;
}
