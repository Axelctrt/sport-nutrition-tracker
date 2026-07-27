import { render, screen } from '@testing-library/react';

import { DashboardWidgetStack } from '@/features/dashboard/components/DashboardWidgetStack';

describe('DashboardWidgetStack', () => {
  it('respecte l’ordre enregistré et masque les blocs désactivés', () => {
    const { container } = render(
      <DashboardWidgetStack
        preferences={{
          preset: 'custom',
          order: [
            'weeklyMissions',
            'quickActions',
            'rewardsOverview',
            'activeWorkout',
            'todaySummary',
            'activities',
            'calculationDetails',
          ],
          hidden: ['rewardsOverview', 'calculationDetails'],
          quickActions: ['addFood'],
          summaryMetrics: ['macros', 'steps', 'weight'],
          supplementalBlock: 'none',
        }}
        renderWidget={(widgetId) => <span>{widgetId}</span>}
      />,
    );

    const widgets = [
      ...container.querySelectorAll('[data-dashboard-widget]'),
    ].map((element) =>
      element.getAttribute('data-dashboard-widget'),
    );

    expect(widgets).toEqual([
      'weeklyMissions',
      'activeWorkout',
      'activities',
    ]);
    expect(screen.queryByText('quickActions')).not.toBeInTheDocument();
    expect(screen.queryByText('todaySummary')).not.toBeInTheDocument();
    expect(
      screen.queryByText('rewardsOverview'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('calculationDetails'),
    ).not.toBeInTheDocument();
  });
});
