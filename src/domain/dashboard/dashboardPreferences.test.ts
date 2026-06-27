import {
  createDashboardPreferencesFromPreset,
  createDefaultDashboardPreferences,
  moveDashboardWidget,
  normalizeDashboardPreferences,
  toggleDashboardWidget,
} from '@/domain/dashboard/dashboardPreferences';

describe('préférences du tableau de bord', () => {
  it('répare un ordre incomplet et supprime les valeurs invalides', () => {
    const normalized = normalizeDashboardPreferences({
      preset: 'custom',
      order: ['quickActions', 'quickActions', 'todaySummary'] as never,
      hidden: ['activities', 'unknown'] as never,
    });

    expect(normalized.order).toEqual([
      'quickActions',
      'todaySummary',
      'activeWorkout',
      'activities',
      'calculationDetails',
    ]);
    expect(normalized.hidden).toEqual(['activities']);
  });

  it('applique les préréglages sans partager leurs tableaux', () => {
    const training = createDashboardPreferencesFromPreset('training');
    training.order.reverse();

    expect(createDashboardPreferencesFromPreset('training').order[0]).toBe('activeWorkout');
    expect(createDefaultDashboardPreferences().preset).toBe('balanced');
  });

  it('déplace et masque les blocs en passant en mode personnalisé', () => {
    const initial = createDefaultDashboardPreferences();
    const moved = moveDashboardWidget(initial, 'quickActions', 'up');
    const hidden = toggleDashboardWidget(moved, 'activities');

    expect(moved.order.slice(0, 2)).toEqual(['activeWorkout', 'quickActions']);
    expect(hidden.hidden).toContain('activities');
    expect(hidden.preset).toBe('custom');
  });

  it('conserve au moins le résumé quotidien visible', () => {
    const normalized = normalizeDashboardPreferences({
      preset: 'custom',
      hidden: [
        'activeWorkout',
        'todaySummary',
        'quickActions',
        'activities',
        'calculationDetails',
      ],
    });

    expect(normalized.hidden).not.toContain('todaySummary');
  });
});
