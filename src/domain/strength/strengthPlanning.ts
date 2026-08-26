import type { LocalDate } from '@/domain/models/common';
import type { WorkoutSession } from '@/domain/models/strength';

export function planningDateForSession(session: WorkoutSession): LocalDate {
  return session.plannedDate ?? session.date;
}
