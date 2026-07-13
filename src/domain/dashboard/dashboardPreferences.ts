export const DASHBOARD_WIDGET_IDS = [
  'activeWorkout',
  'trainingAgenda',
  'todaySummary',
  'quickActions',
  'activities',
  'calculationDetails',
  'rewardsOverview',
  'weeklyMissions',
] as const;

export const DASHBOARD_QUICK_ACTION_IDS = [
  'addFood',
  'scanFood',
  'steps',
  'weight',
  'addActivity',
  'workout',
] as const;

export const DASHBOARD_SUMMARY_METRIC_IDS = [
  'macros',
  'steps',
  'weight',
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];
export type DashboardQuickActionId = (typeof DASHBOARD_QUICK_ACTION_IDS)[number];
export type DashboardSummaryMetricId = (typeof DASHBOARD_SUMMARY_METRIC_IDS)[number];
export type DashboardDensity = 'comfortable' | 'compact';

export type DashboardPreset =
  | 'balanced'
  | 'nutrition'
  | 'training'
  | 'minimal'
  | 'custom';

export interface DashboardPreferences {
  preset: DashboardPreset;
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
  quickActions: DashboardQuickActionId[];
  summaryMetrics: DashboardSummaryMetricId[];
}

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  activeWorkout: 'Séance en cours',
  trainingAgenda: 'Programme du jour',
  todaySummary: 'Résumé de la journée',
  quickActions: 'Actions rapides',
  activities: 'Activités du jour',
  calculationDetails: 'Objectifs et détails du calcul',
  rewardsOverview: 'Accomplissements',
  weeklyMissions: 'Missions hebdomadaires',
};

export const DASHBOARD_WIDGET_DESCRIPTIONS: Record<DashboardWidgetId, string> = {
  activeWorkout: 'Reprendre immédiatement une séance de musculation en cours.',
  trainingAgenda: 'Voir les activités prévues aujourd’hui et accéder au reste du planning.',
  todaySummary: 'Calories, macronutriments, pas et poids actuel.',
  quickActions: 'Accéder aux actions que vous utilisez le plus souvent.',
  activities: 'Relire les activités enregistrées aujourd’hui.',
  calculationDetails: 'Consulter la cible énergétique et les paramètres utilisés.',
  rewardsOverview: 'Suivre les badges gagnés et le prochain accomplissement.',
  weeklyMissions: 'Consulter les objectifs de la semaine, la série et le record.',
};

export const DASHBOARD_QUICK_ACTION_LABELS: Record<DashboardQuickActionId, string> = {
  addFood: 'Ajouter un aliment',
  scanFood: 'Scanner un produit',
  steps: 'Saisir les pas',
  weight: 'Ajouter une pesée',
  addActivity: 'Ajouter une activité',
  workout: 'Démarrer ou reprendre une séance',
};

export const DASHBOARD_SUMMARY_METRIC_LABELS: Record<DashboardSummaryMetricId, string> = {
  macros: 'Macronutriments',
  steps: 'Pas du jour',
  weight: 'Poids actuel',
};

const ALL_SUMMARY_METRICS = [...DASHBOARD_SUMMARY_METRIC_IDS];

const PRESET_PREFERENCES: Record<Exclude<DashboardPreset, 'custom'>, DashboardPreferences> = {
  balanced: {
    preset: 'balanced',
    order: [
      'todaySummary',
      'quickActions',
      'activeWorkout',
      'trainingAgenda',
      'activities',
      'calculationDetails',
      'rewardsOverview',
      'weeklyMissions',
    ],
    hidden: ['calculationDetails', 'rewardsOverview', 'weeklyMissions'],
    quickActions: ['addFood', 'workout', 'weight', 'steps'],
    summaryMetrics: [...ALL_SUMMARY_METRICS],
  },
  nutrition: {
    preset: 'nutrition',
    order: [
      'todaySummary',
      'quickActions',
      'activities',
      'trainingAgenda',
      'rewardsOverview',
      'weeklyMissions',
      'activeWorkout',
      'calculationDetails',
    ],
    hidden: [],
    quickActions: ['addFood', 'scanFood', 'steps', 'weight'],
    summaryMetrics: [...ALL_SUMMARY_METRICS],
  },
  training: {
    preset: 'training',
    order: [
      'activeWorkout',
      'trainingAgenda',
      'quickActions',
      'activities',
      'weeklyMissions',
      'rewardsOverview',
      'todaySummary',
      'calculationDetails',
    ],
    hidden: [],
    quickActions: ['workout', 'addActivity', 'steps', 'weight', 'addFood'],
    summaryMetrics: ['steps', 'weight', 'macros'],
  },
  minimal: {
    preset: 'minimal',
    order: [
      'todaySummary',
      'quickActions',
      'activeWorkout',
      'trainingAgenda',
      'activities',
      'calculationDetails',
      'rewardsOverview',
      'weeklyMissions',
    ],
    hidden: [
      'trainingAgenda',
      'activities',
      'calculationDetails',
      'rewardsOverview',
      'weeklyMissions',
    ],
    quickActions: ['addFood', 'workout', 'weight', 'steps'],
    summaryMetrics: ['steps', 'weight'],
  },
};

function isDashboardWidgetId(value: unknown): value is DashboardWidgetId {
  return typeof value === 'string' && DASHBOARD_WIDGET_IDS.includes(value as DashboardWidgetId);
}

function isDashboardQuickActionId(value: unknown): value is DashboardQuickActionId {
  return typeof value === 'string' && DASHBOARD_QUICK_ACTION_IDS.includes(value as DashboardQuickActionId);
}

function isDashboardSummaryMetricId(value: unknown): value is DashboardSummaryMetricId {
  return typeof value === 'string' && DASHBOARD_SUMMARY_METRIC_IDS.includes(value as DashboardSummaryMetricId);
}

export function createDefaultDashboardPreferences(): DashboardPreferences {
  return createDashboardPreferencesFromPreset('balanced');
}

export function createDashboardPreferencesFromPreset(
  preset: Exclude<DashboardPreset, 'custom'>,
): DashboardPreferences {
  const preferences = PRESET_PREFERENCES[preset];
  return {
    preset: preferences.preset,
    order: [...preferences.order],
    hidden: [...preferences.hidden],
    quickActions: [...preferences.quickActions],
    summaryMetrics: [...preferences.summaryMetrics],
  };
}

export function normalizeDashboardPreferences(
  preferences?: Partial<DashboardPreferences>,
): DashboardPreferences {
  const fallback = createDefaultDashboardPreferences();
  const order = Array.isArray(preferences?.order)
    ? preferences.order.filter(isDashboardWidgetId)
    : [];
  const uniqueOrder = [...new Set(order)];

  for (const widgetId of DASHBOARD_WIDGET_IDS) {
    if (!uniqueOrder.includes(widgetId)) uniqueOrder.push(widgetId);
  }

  const hidden = Array.isArray(preferences?.hidden)
    ? [...new Set(preferences.hidden.filter(isDashboardWidgetId))]
    : [];
  const preset = preferences?.preset;
  const normalizedPreset: DashboardPreset =
    preset === 'balanced' ||
    preset === 'nutrition' ||
    preset === 'training' ||
    preset === 'minimal' ||
    preset === 'custom'
      ? preset
      : fallback.preset;

  if (hidden.length === DASHBOARD_WIDGET_IDS.length) {
    hidden.splice(hidden.indexOf('todaySummary'), 1);
  }

  const quickActions = Array.isArray(preferences?.quickActions)
    ? [...new Set(preferences.quickActions.filter(isDashboardQuickActionId))]
    : [...fallback.quickActions];
  if (quickActions.length === 0) quickActions.push('addFood');

  const summaryMetrics = Array.isArray(preferences?.summaryMetrics)
    ? [...new Set(preferences.summaryMetrics.filter(isDashboardSummaryMetricId))]
    : [...fallback.summaryMetrics];

  return {
    preset: normalizedPreset,
    order: uniqueOrder,
    hidden,
    quickActions,
    summaryMetrics,
  };
}

export function isDashboardWidgetVisible(
  preferences: DashboardPreferences,
  widgetId: DashboardWidgetId,
): boolean {
  return !preferences.hidden.includes(widgetId);
}

export function toggleDashboardWidget(
  preferences: DashboardPreferences,
  widgetId: DashboardWidgetId,
): DashboardPreferences {
  const isHidden = preferences.hidden.includes(widgetId);
  return normalizeDashboardPreferences({
    ...preferences,
    preset: 'custom',
    hidden: isHidden
      ? preferences.hidden.filter((current) => current !== widgetId)
      : [...preferences.hidden, widgetId],
  });
}

export function toggleDashboardQuickAction(
  preferences: DashboardPreferences,
  actionId: DashboardQuickActionId,
): DashboardPreferences {
  const isVisible = preferences.quickActions.includes(actionId);
  return normalizeDashboardPreferences({
    ...preferences,
    preset: 'custom',
    quickActions: isVisible
      ? preferences.quickActions.filter((current) => current !== actionId)
      : [...preferences.quickActions, actionId],
  });
}

export function toggleDashboardSummaryMetric(
  preferences: DashboardPreferences,
  metricId: DashboardSummaryMetricId,
): DashboardPreferences {
  const isVisible = preferences.summaryMetrics.includes(metricId);
  return normalizeDashboardPreferences({
    ...preferences,
    preset: 'custom',
    summaryMetrics: isVisible
      ? preferences.summaryMetrics.filter((current) => current !== metricId)
      : [...preferences.summaryMetrics, metricId],
  });
}

export function moveDashboardWidget(
  preferences: DashboardPreferences,
  widgetId: DashboardWidgetId,
  direction: 'up' | 'down',
): DashboardPreferences {
  const index = preferences.order.indexOf(widgetId);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= preferences.order.length) {
    return preferences;
  }

  const nextOrder = [...preferences.order];
  const currentWidget = nextOrder[index];
  const targetWidget = nextOrder[targetIndex];
  if (!currentWidget || !targetWidget) return preferences;

  nextOrder[index] = targetWidget;
  nextOrder[targetIndex] = currentWidget;

  return normalizeDashboardPreferences({
    ...preferences,
    preset: 'custom',
    order: nextOrder,
  });
}
