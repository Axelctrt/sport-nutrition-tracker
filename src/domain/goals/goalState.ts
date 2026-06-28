export type GoalMetric =
  | 'weightTarget'
  | 'totalSteps'
  | 'activityMinutes'
  | 'runningDistanceKm'
  | 'swimmingDistanceKm'
  | 'cyclingDistanceKm'
  | 'strengthSessions'
  | 'weighIns';

export type GoalStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived';

export type GoalMilestone = 25 | 50 | 75 | 100;

export interface Goal {
  id: string;
  title: string;
  metric: GoalMetric;
  targetValue: number;
  startDate: string;
  deadline?: string;
  baselineValue?: number;
  status: GoalStatus;
  reachedMilestones: GoalMilestone[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface GoalState {
  version: 1;
  goals: Goal[];
}

export interface GoalMetricDefinition {
  metric: GoalMetric;
  label: string;
  description: string;
  unit: string;
  cumulative: boolean;
  defaultTarget: number;
  step: number;
}

export const GOAL_STATE_STORAGE_KEY =
  'sportpilot:goals:v1';

export const GOAL_STATE_CHANGED_EVENT =
  'sportpilot:goals-changed';

export const GOAL_MILESTONES: readonly GoalMilestone[] = [
  25,
  50,
  75,
  100,
];

export const GOAL_METRIC_DEFINITIONS: readonly GoalMetricDefinition[] =
  [
    {
      metric: 'weightTarget',
      label: 'Atteindre un poids',
      description:
        'Suivi automatique depuis les pesées enregistrées.',
      unit: 'kg',
      cumulative: false,
      defaultTarget: 70,
      step: 0.1,
    },
    {
      metric: 'totalSteps',
      label: 'Cumuler des pas',
      description:
        'Somme des pas saisis depuis la date de départ.',
      unit: 'pas',
      cumulative: true,
      defaultTarget: 100_000,
      step: 1_000,
    },
    {
      metric: 'activityMinutes',
      label: 'Cumuler des minutes d’activité',
      description:
        'Toutes les activités d’endurance et de musculation.',
      unit: 'min',
      cumulative: true,
      defaultTarget: 600,
      step: 30,
    },
    {
      metric: 'runningDistanceKm',
      label: 'Courir une distance cumulée',
      description:
        'Distance totale des activités de course.',
      unit: 'km',
      cumulative: true,
      defaultTarget: 50,
      step: 1,
    },
    {
      metric: 'swimmingDistanceKm',
      label: 'Nager une distance cumulée',
      description:
        'Distance totale des activités de natation.',
      unit: 'km',
      cumulative: true,
      defaultTarget: 10,
      step: 0.5,
    },
    {
      metric: 'cyclingDistanceKm',
      label: 'Rouler une distance cumulée',
      description:
        'Distance totale des activités de vélo disposant d’une distance.',
      unit: 'km',
      cumulative: true,
      defaultTarget: 100,
      step: 5,
    },
    {
      metric: 'strengthSessions',
      label: 'Terminer des séances de musculation',
      description:
        'Nombre de séances du carnet terminées.',
      unit: 'séances',
      cumulative: true,
      defaultTarget: 12,
      step: 1,
    },
    {
      metric: 'weighIns',
      label: 'Maintenir une régularité de pesée',
      description:
        'Nombre de pesées enregistrées depuis le départ.',
      unit: 'pesées',
      cumulative: true,
      defaultTarget: 8,
      step: 1,
    },
  ];

export function emptyGoalState(): GoalState {
  return {
    version: 1,
    goals: [],
  };
}

export function getGoalMetricDefinition(
  metric: GoalMetric,
): GoalMetricDefinition {
  const definition = GOAL_METRIC_DEFINITIONS.find(
    (candidate) => candidate.metric === metric,
  );

  if (!definition) {
    throw new Error('Métrique d’objectif inconnue.');
  }

  return definition;
}

function isGoalMetric(value: unknown): value is GoalMetric {
  return GOAL_METRIC_DEFINITIONS.some(
    ({ metric }) => metric === value,
  );
}

function isGoalStatus(value: unknown): value is GoalStatus {
  return (
    value === 'active' ||
    value === 'paused' ||
    value === 'completed' ||
    value === 'archived'
  );
}

function isGoalMilestone(
  value: unknown,
): value is GoalMilestone {
  return (
    value === 25 ||
    value === 50 ||
    value === 75 ||
    value === 100
  );
}

function parseGoal(value: unknown): Goal | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    !isGoalMetric(candidate.metric) ||
    typeof candidate.targetValue !== 'number' ||
    !Number.isFinite(candidate.targetValue) ||
    candidate.targetValue <= 0 ||
    typeof candidate.startDate !== 'string' ||
    !isGoalStatus(candidate.status) ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.updatedAt !== 'string' ||
    !Array.isArray(candidate.reachedMilestones)
  ) {
    return undefined;
  }

  const goal: Goal = {
    id: candidate.id,
    title: candidate.title,
    metric: candidate.metric,
    targetValue: candidate.targetValue,
    startDate: candidate.startDate,
    status: candidate.status,
    reachedMilestones:
      candidate.reachedMilestones.filter(isGoalMilestone),
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };

  if (typeof candidate.deadline === 'string') {
    goal.deadline = candidate.deadline;
  }
  if (
    typeof candidate.baselineValue === 'number' &&
    Number.isFinite(candidate.baselineValue)
  ) {
    goal.baselineValue = candidate.baselineValue;
  }
  if (typeof candidate.completedAt === 'string') {
    goal.completedAt = candidate.completedAt;
  }

  return goal;
}

export function readGoalState(): GoalState {
  if (typeof window === 'undefined') {
    return emptyGoalState();
  }

  try {
    const raw = window.localStorage.getItem(
      GOAL_STATE_STORAGE_KEY,
    );

    if (!raw) return emptyGoalState();

    const parsed = JSON.parse(raw) as {
      version?: unknown;
      goals?: unknown;
    };

    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.goals)
    ) {
      return emptyGoalState();
    }

    return {
      version: 1,
      goals: parsed.goals
        .map(parseGoal)
        .filter((goal): goal is Goal => goal !== undefined),
    };
  } catch {
    return emptyGoalState();
  }
}

export function writeGoalState(state: GoalState): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    GOAL_STATE_STORAGE_KEY,
    JSON.stringify(state),
  );
  window.dispatchEvent(
    new Event(GOAL_STATE_CHANGED_EVENT),
  );
}
