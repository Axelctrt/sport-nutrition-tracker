import { routePaths } from '@/app/routePaths';
import type { GoalMetric } from '@/domain/goals/goalState';

export interface GoalContextAction {
  label: string;
  path: string;
}

const dashboardQuickEntryPath = (action: 'steps' | 'weight'): string =>
  `${routePaths.dashboard}?action=${action}`;

export function getGoalContextAction(
  metric: GoalMetric,
): GoalContextAction {
  switch (metric) {
    case 'weightTarget':
    case 'weighIns':
      return {
        label: 'Ajouter une pesée',
        path: dashboardQuickEntryPath('weight'),
      };

    case 'totalSteps':
      return {
        label: 'Saisir les pas',
        path: dashboardQuickEntryPath('steps'),
      };

    case 'activityMinutes':
      return {
        label: 'Planifier une activité',
        path: `${routePaths.weeklyPlanning}?action=plan`,
      };

    case 'runningDistanceKm':
      return {
        label: 'Ajouter une course',
        path: routePaths.addRunningActivity,
      };

    case 'swimmingDistanceKm':
      return {
        label: 'Ajouter une natation',
        path: routePaths.addSwimmingActivity,
      };

    case 'cyclingDistanceKm':
      return {
        label: 'Ajouter une sortie vélo',
        path: `${routePaths.addOtherActivity}?type=cycling`,
      };

    case 'strengthSessions':
      return {
        label: 'Démarrer une séance',
        path: routePaths.workoutSessions,
      };
  }
}
