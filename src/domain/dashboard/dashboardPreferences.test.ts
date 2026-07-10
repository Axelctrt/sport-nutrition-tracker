import {
  createDashboardPreferencesFromPreset,
  createDefaultDashboardPreferences,
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
      'activities',
      'calculationDetails',
      'rewardsOverview',
      'weeklyMissions',
    ]);
    expect(normalized.hidden).toEqual(['activities']);
    expect(normalized.quickActions).toEqual([
      'addFood',
      'scanFood',
      'steps',
      'weight',
      'addActivity',
      'workout',
    ]);
    expect(normalized.summaryMetrics).toEqual(['macros', 'steps', 'weight']);
  });

  it('applique les préréglages sans partager leurs tableaux', () => {
    const training = createDashboardPreferencesFromPreset('training');
    training.order.reverse();
    training.quickActions.reverse();

    expect(createDashboardPreferencesFromPreset('training').order[0]).toBe('activeWorkout');
    expect(createDashboardPreferencesFromPreset('training').quickActions[0]).toBe('workout');
    expect(createDefaultDashboardPreferences().preset).toBe('balanced');
  });

  it('déplace et masque les blocs en passant en mode personnalisé', () => {
    const initial = createDefaultDashboardPreferences();
    const moved = moveDashboardWidget(initial, 'weeklyMissions', 'up');
    const hidden = toggleDashboardWidget(moved, 'rewardsOverview');

    expect(moved.order.at(-2)).toBe('weeklyMissions');
    expect(hidden.hidden).toContain('rewardsOverview');
    expect(hidden.preset).toBe('custom');
  });

  it('personnalise les métriques et les raccourcis', () => {
    const initial = createDefaultDashboardPreferences();
    const withoutMacros = toggleDashboardSummaryMetric(initial, 'macros');
    const withoutScanner = toggleDashboardQuickAction(withoutMacros, 'scanFood');

    expect(withoutScanner.summaryMetrics).not.toContain('macros');
    expect(withoutScanner.quickActions).not.toContain('scanFood');
    expect(withoutScanner.preset).toBe('custom');
  });

  it('conserve une action rapide et le résumé quotidien', () => {
    const normalized = normalizeDashboardPreferences({
      preset: 'custom',
      hidden: [
        'activeWorkout',
        'trainingAgenda',
        'todaySummary',
        'quickActions',
        'activities',
        'calculationDetails',
        'rewardsOverview',
        'weeklyMissions',
      ],
      quickActions: [],
    });

    expect(normalized.hidden).not.toContain('todaySummary');
    expect(normalized.quickActions).toEqual(['addFood']);
  });
});
