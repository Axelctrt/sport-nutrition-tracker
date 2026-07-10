import type { ReactNode } from 'react';
import {
  isDashboardWidgetVisible,
  type DashboardDensity,
  type DashboardPreferences,
  type DashboardWidgetId,
} from '@/domain/dashboard/dashboardPreferences';

interface DashboardWidgetStackProps {
  preferences: DashboardPreferences;
  density?: DashboardDensity;
  isLoading?: boolean;
  renderWidget: (widgetId: DashboardWidgetId) => ReactNode;
}

export function DashboardWidgetStack({
  preferences,
  density = 'comfortable',
  isLoading = false,
  renderWidget,
}: DashboardWidgetStackProps) {
  return (
    <div
      className="dashboard-widget-stack"
      data-density={density}
      aria-busy={isLoading}
    >
      {preferences.order
        .filter((widgetId) => isDashboardWidgetVisible(preferences, widgetId))
        .map((widgetId) => (
          <div key={widgetId} data-dashboard-widget={widgetId}>
            {renderWidget(widgetId)}
          </div>
        ))}
    </div>
  );
}
