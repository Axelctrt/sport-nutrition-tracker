import {
  createDashboardPreferencesFromPreset,
  createDefaultDashboardPreferences,
  moveDashboardWidget,
  normalizeDashboardPreferences,
  toggleDashboardWidget,
} from '@/domain/dashboard/dashboardPreferences';

describe('préférences du tableau de bord', () => {
  it('répare un ordre incomplet et ajoute les nouveaux widgets', () => {
    const normalized = normalizeDashboardPreferences({
      preset: 'custom',
      order: [
        'quickActions',
        'quickActions',
        'todaySummary',
      ] as never,
      hidden: ['activities', 'unknown'] as never,
    });

    expect(normalized.order).toEqual([
      'quickActions',
      'todaySummary',
      'activeWorkout',
      'activities',
      'calculationDetails',
      'rewardsOverview',
      'weeklyMissions',
    ]);
    expect(normalized.hidden).toEqual(['activities']);
  });

  it('applique les préréglages sans partager leurs tableaux', () => {
    const training = createDashboardPreferencesFromPreset('training');
    training.order.reverse();

    expect(
      createDashboardPreferencesFromPreset('training').order[0],
    ).toBe('activeWorkout');
    expect(createDefaultDashboardPreferences().preset).toBe(
      'balanced',
    );
  });

  it('déplace et masque les blocs en passant en mode personnalisé', () => {
    const initial = createDefaultDashboardPreferences();
    const moved = moveDashboardWidget(
      initial,
      'weeklyMissions',
      'up',
    );
    const hidden = toggleDashboardWidget(
      moved,
      'rewardsOverview',
    );

    expect(moved.order.at(-2)).toBe('weeklyMissions');
    expect(hidden.hidden).toContain('rewardsOverview');
    expect(hidden.preset).toBe('custom');
  });

  it('masque les récompenses dans le préréglage essentiel', () => {
    const minimal =
      createDashboardPreferencesFromPreset('minimal');

    expect(minimal.hidden).toEqual(
      expect.arrayContaining([
        'rewardsOverview',
        'weeklyMissions',
      ]),
    );
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
        'rewardsOverview',
        'weeklyMissions',
      ],
    });

    expect(normalized.hidden).not.toContain('todaySummary');
  });
});
