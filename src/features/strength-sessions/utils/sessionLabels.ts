import type { WorkoutSessionStatus } from '@/domain/models/strength';

const labels: Record<WorkoutSessionStatus, string> = {
  planned: 'Prévue',
  inProgress: 'En cours',
  completed: 'Terminée',
  abandoned: 'Abandonnée',
  skipped: 'Non réalisée',
};

export function workoutSessionStatusLabel(status: WorkoutSessionStatus): string {
  return labels[status];
}
