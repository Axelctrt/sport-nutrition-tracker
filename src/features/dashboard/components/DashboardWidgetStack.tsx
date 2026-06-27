import type { ReactNode } from 'react';
import {
  isDashboardWidgetVisible,
  type DashboardPreferences,
  type DashboardWidgetId,
} from '@/domain/dashboard/dashboardPreferences';

interface DashboardWidgetStackProps {
  preferences: DashboardPreferences;
  isLoading?: boolean;
  renderWidget: (widgetId: DashboardWidgetId) => ReactNode;
}

export function DashboardWidgetStack({
  preferences,
  isLoading = false,
  renderWidget,
}: DashboardWidgetStackProps) {
  return (
    <div aria-busy={isLoading}>
      {preferences.order
        .filter((widgetId) => isDashboardWidgetVisible(preferences, widgetId))
        .map((widgetId) => <div key={widgetId} data-dashboard-widget={widgetId}>{renderWidget(widgetId)}</div>)}
    </div>
  );
}
