import {
  createDashboardPreferencesFromPreset,
  createDefaultDashboardPreferences,
  isDashboardWidgetVisible,
  moveDashboardWidget,
  normalizeDashboardPreferences,
  toggleDashboardQuickAction,
  toggleDashboardSummaryMetric,
  toggleDashboardWidget,
} from '@/domain/dashboard/dashboardPreferences';

describe('préférences du tableau de bord', () => {
  it('répare un ancien réglage incomplet et ajoute les nouvelles options', () => {
    const normalized = normalizeDashboardPreferences({
      preset: 'custom',
      order: ['quickActions', 'quickActions', 'todaySummary'] as never,
      hidden: ['activities', 'unknown'] as never,
    });

    expect(normalized.order).toEqual([
      'quickActions',
      'todaySummary',
      'activeWorkout',
      'trainingAgenda',
      'dailyAssistant',
      'activities',
      'calculationDetails',
      'rewardsOverview',
      'weeklyMissions',
    ]);
    expect(normalized.hidden).toEqual(['activities']);
    expect(normalized.quickActions).toEqual([
      'addFood',
      'workout',
      'weight',
      'steps',
    ]);
    expect(normalized.summaryMetrics).toEqual(['macros', 'steps']);
    expect(normalized.supplementalBlock).toBe('achievements');
  });

  it('applique les préréglages sans partager leurs tableaux', () => {
    const training = createDashboardPreferencesFromPreset('training');
    training.order.reverse();
    training.quickActions.reverse();

    expect(createDashboardPreferencesFromPreset('training').order[0]).toBe('activeWorkout');
    expect(createDashboardPreferencesFromPreset('training').quickActions[0]).toBe('workout');
    expect(createDefaultDashboardPreferences().preset).toBe('balanced');
  });

  it('fournit un Accueil essentiel par défaut', () => {
    const defaults = createDefaultDashboardPreferences();

    expect(defaults.order.slice(0, 4)).toEqual([
      'todaySummary',
      'dailyAssistant',
      'quickActions',
      'activeWorkout',
    ]);
    expect(defaults.hidden).toEqual([
      'activeWorkout',
      'trainingAgenda',
      'quickActions',
      'calculationDetails',
      'rewardsOverview',
      'weeklyMissions',
    ]);
    expect(defaults.quickActions).toEqual([
      'addFood',
      'workout',
      'weight',
      'steps',
    ]);
    expect(defaults.summaryMetrics).toEqual(['macros', 'steps']);
    expect(defaults.supplementalBlock).toBe('none');
  });

  it('déplace et masque les blocs en passant en mode personnalisé', () => {
    const initial = createDashboardPreferencesFromPreset('training');
    const moved = moveDashboardWidget(initial, 'weeklyMissions', 'up');
    const hidden = toggleDashboardWidget(moved, 'rewardsOverview');

    expect(moved.order.indexOf('weeklyMissions')).toBeLessThan(initial.order.indexOf('weeklyMissions'));
    expect(hidden.hidden).toContain('rewardsOverview');
    expect(hidden.preset).toBe('custom');
  });

  it('personnalise les métriques et les raccourcis', () => {
    const initial = createDashboardPreferencesFromPreset('nutrition');
    const withoutMacros = toggleDashboardSummaryMetric(initial, 'macros');
    const withoutScanner = toggleDashboardQuickAction(withoutMacros, 'scanFood');

    expect(withoutScanner.summaryMetrics).not.toContain('macros');
    expect(withoutScanner.quickActions).not.toContain('scanFood');
    expect(withoutScanner.preset).toBe('custom');
  });

  it('normalise les anciennes préférences sans permettre de masquer le cœur quotidien', () => {
    const normalized = normalizeDashboardPreferences({
      preset: 'custom',
      hidden: [
        'activeWorkout',
        'trainingAgenda',
        'todaySummary',
        'dailyAssistant',
        'quickActions',
        'activities',
        'calculationDetails',
        'rewardsOverview',
        'weeklyMissions',
      ],
      quickActions: [],
    });

    expect(normalized.hidden).not.toContain('todaySummary');
    expect(normalized.hidden).not.toContain('dailyAssistant');
    expect(isDashboardWidgetVisible(normalized, 'todaySummary')).toBe(true);
    expect(isDashboardWidgetVisible(normalized, 'dailyAssistant')).toBe(true);
    expect(normalized.quickActions).toEqual(['addFood']);
  });

  it('ignore une tentative de masquer un widget fixe', () => {
    const initial = normalizeDashboardPreferences({
      hidden: ['activities'],
    });
    const toggled = toggleDashboardWidget(initial, 'dailyAssistant');

    expect(toggled.hidden).toEqual(['activities']);
  });

  it.each([
    ['balanced', 'none'],
    ['nutrition', 'none'],
    ['training', 'weeklyProgress'],
    ['minimal', 'none'],
  ] as const)(
    'convertit l’ancien préréglage %s vers un seul bloc complémentaire',
    (preset, expectedBlock) => {
      const legacy = createDashboardPreferencesFromPreset(preset);
      const { supplementalBlock: _removed, ...withoutNewPreference } = legacy;

      expect(
        normalizeDashboardPreferences(withoutNewPreference).supplementalBlock,
      ).toBe(expectedBlock);
    },
  );
});
