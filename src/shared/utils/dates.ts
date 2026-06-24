import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { LocalDate } from '@/domain/models/common';
import { isValidLocalDate } from '@/shared/validation/localDate';

export function toLocalDate(date: Date = new Date()): LocalDate {
  return format(date, 'yyyy-MM-dd');
}

export function formatLocalDate(
  value: LocalDate,
  pattern = 'd MMMM yyyy',
): string {
  if (!isValidLocalDate(value)) {
    return value;
  }

  return format(parseISO(value), pattern, { locale: fr });
}

export function compareLocalDates(left: LocalDate, right: LocalDate): number {
  return left.localeCompare(right);
}
