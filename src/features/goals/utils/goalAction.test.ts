import { describe, expect, it } from 'vitest';

import type { GoalMetric } from '@/domain/goals/goalState';
import { getGoalContextAction } from '@/features/goals/utils/goalAction';

const expectations: Array<{
  metric: GoalMetric;
  label: string;
  path: string;
}> = [
  {
    metric: 'weightTarget',
    label: 'Ajouter une pesée',
    path: '/?action=weight',
  },
  {
    metric: 'weighIns',
    label: 'Ajouter une pesée',
    path: '/?action=weight',
  },
  {
    metric: 'totalSteps',
    label: 'Saisir les pas',
    path: '/?action=steps',
  },
  {
    metric: 'activityMinutes',
    label: 'Planifier une activité',
    path: '/strength/planning?action=plan',
  },
  {
    metric: 'runningDistanceKm',
    label: 'Ajouter une course',
    path: '/activities/add/running',
  },
  {
    metric: 'swimmingDistanceKm',
    label: 'Ajouter une natation',
    path: '/activities/add/swimming',
  },
  {
    metric: 'cyclingDistanceKm',
    label: 'Ajouter une sortie vélo',
    path: '/activities/add/other?type=cycling',
  },
  {
    metric: 'strengthSessions',
    label: 'Démarrer une séance',
    path: '/strength/sessions',
  },
];

describe('getGoalContextAction', () => {
  it.each(expectations)('associe $metric à une action explicite', ({
    metric,
    label,
    path,
  }) => {
    expect(getGoalContextAction(metric)).toEqual({ label, path });
  });
});
