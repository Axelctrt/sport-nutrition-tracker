import { render, screen } from '@testing-library/react';
import { DashboardWidgetStack } from '@/features/dashboard/components/DashboardWidgetStack';

describe('DashboardWidgetStack', () => {
  it('respecte l’ordre enregistré et masque les blocs désactivés', () => {
    const { container } = render(
      <DashboardWidgetStack
        preferences={{
          preset: 'custom',
          order: ['quickActions', 'activeWorkout', 'todaySummary', 'activities', 'calculationDetails'],
          hidden: ['calculationDetails'],
        }}
        renderWidget={(widgetId) => <span>{widgetId}</span>}
      />,
    );

    const widgets = [...container.querySelectorAll('[data-dashboard-widget]')]
      .map((element) => element.getAttribute('data-dashboard-widget'));
    expect(widgets).toEqual(['quickActions', 'activeWorkout', 'todaySummary', 'activities']);
    expect(screen.queryByText('calculationDetails')).not.toBeInTheDocument();
  });
});
