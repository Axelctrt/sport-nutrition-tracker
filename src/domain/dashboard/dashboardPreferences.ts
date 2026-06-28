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

export type DashboardWidgetId =
  (typeof DASHBOARD_WIDGET_IDS)[number];

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
}

export const DASHBOARD_WIDGET_LABELS: Record<
  DashboardWidgetId,
  string
> = {
  activeWorkout: 'Séance en cours',
  trainingAgenda: 'Programme du jour',
  todaySummary: 'Résumé de la journée',
  quickActions: 'Actions rapides',
  activities: 'Activités du jour',
  calculationDetails:
    'Objectifs et détails du calcul',
  rewardsOverview: 'Accomplissements',
  weeklyMissions: 'Missions hebdomadaires',
};

export const DASHBOARD_WIDGET_DESCRIPTIONS: Record<
  DashboardWidgetId,
  string
> = {
  activeWorkout:
    'Reprendre immédiatement une séance de musculation en cours.',
  trainingAgenda:
    'Voir les activités prévues aujourd’hui et accéder au reste du planning.',
  todaySummary:
    'Calories, macronutriments, pas et poids du jour.',
  quickActions:
    'Ajouter un aliment, une activité, des pas, un poids ou une séance.',
  activities:
    'Relire les activités enregistrées aujourd’hui.',
  calculationDetails:
    'Consulter la cible énergétique et les paramètres utilisés.',
  rewardsOverview:
    'Suivre les badges gagnés et le prochain accomplissement.',
  weeklyMissions:
    'Consulter les objectifs de la semaine, la série et le record.',
};

const PRESET_PREFERENCES: Record<
  Exclude<DashboardPreset, 'custom'>,
  DashboardPreferences
> = {
  balanced: {
    preset: 'balanced',
    order: [...DASHBOARD_WIDGET_IDS],
    hidden: [],
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
  },
};

function isDashboardWidgetId(
  value: unknown,
): value is DashboardWidgetId {
  return (
    typeof value === 'string' &&
    DASHBOARD_WIDGET_IDS.includes(
      value as DashboardWidgetId,
    )
  );
}

export function createDefaultDashboardPreferences():
  DashboardPreferences {
  return {
    preset:
      PRESET_PREFERENCES.balanced.preset,
    order: [
      ...PRESET_PREFERENCES.balanced.order,
    ],
    hidden: [],
  };
}

export function createDashboardPreferencesFromPreset(
  preset: Exclude<DashboardPreset, 'custom'>,
): DashboardPreferences {
  const preferences =
    PRESET_PREFERENCES[preset];

  return {
    preset: preferences.preset,
    order: [...preferences.order],
    hidden: [...preferences.hidden],
  };
}

export function normalizeDashboardPreferences(
  preferences?: Partial<DashboardPreferences>,
): DashboardPreferences {
  const fallback =
    createDefaultDashboardPreferences();
  const order = Array.isArray(
    preferences?.order,
  )
    ? preferences.order.filter(
        isDashboardWidgetId,
      )
    : [];
  const uniqueOrder = [...new Set(order)];

  for (const widgetId of DASHBOARD_WIDGET_IDS) {
    if (!uniqueOrder.includes(widgetId)) {
      uniqueOrder.push(widgetId);
    }
  }

  const hidden = Array.isArray(
    preferences?.hidden,
  )
    ? [
        ...new Set(
          preferences.hidden.filter(
            isDashboardWidgetId,
          ),
        ),
      ]
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

  if (
    hidden.length ===
    DASHBOARD_WIDGET_IDS.length
  ) {
    hidden.splice(
      hidden.indexOf('todaySummary'),
      1,
    );
  }

  return {
    preset: normalizedPreset,
    order: uniqueOrder,
    hidden,
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
  const isHidden =
    preferences.hidden.includes(widgetId);
  const nextHidden = isHidden
    ? preferences.hidden.filter(
        (current) => current !== widgetId,
      )
    : [...preferences.hidden, widgetId];

  return normalizeDashboardPreferences({
    ...preferences,
    preset: 'custom',
    hidden: nextHidden,
  });
}

export function moveDashboardWidget(
  preferences: DashboardPreferences,
  widgetId: DashboardWidgetId,
  direction: 'up' | 'down',
): DashboardPreferences {
  const index =
    preferences.order.indexOf(widgetId);
  const targetIndex =
    direction === 'up'
      ? index - 1
      : index + 1;

  if (
    index < 0 ||
    targetIndex < 0 ||
    targetIndex >= preferences.order.length
  ) {
    return preferences;
  }

  const nextOrder = [...preferences.order];
  const currentWidget = nextOrder[index];
  const targetWidget = nextOrder[targetIndex];

  if (!currentWidget || !targetWidget) {
    return preferences;
  }

  nextOrder[index] = targetWidget;
  nextOrder[targetIndex] = currentWidget;

  return normalizeDashboardPreferences({
    ...preferences,
    preset: 'custom',
    order: nextOrder,
  });
}
