import type { WorkoutSessionStatus } from '@/domain/models/strength';

const labels: Record<WorkoutSessionStatus, string> = {
  inProgress: 'En cours',
  completed: 'Terminée',
  abandoned: 'Abandonnée',
};

export function workoutSessionStatusLabel(status: WorkoutSessionStatus): string {
  return labels[status];
}
