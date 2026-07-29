import { addDays, parseISO } from 'date-fns';
import type { LocalDate } from '@/domain/models/common';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';

export function relativeDateLabel(date: LocalDate, today = toLocalDate()): string {
  if (date === today) return 'Aujourd’hui';
  if (date === toLocalDate(addDays(parseISO(today), -1))) return 'Hier';
  if (date === toLocalDate(addDays(parseISO(today), 1))) return 'Demain';
  return formatLocalDate(date, 'EEEE d MMMM');
}
