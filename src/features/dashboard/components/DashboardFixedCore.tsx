import type { ReactNode } from 'react';

interface DashboardFixedCoreProps {
  summary: ReactNode;
  assistant: ReactNode;
}

export function DashboardFixedCore({
  summary,
  assistant,
}: DashboardFixedCoreProps) {
  return (
    <div data-dashboard-core>
      <div data-dashboard-fixed-widget="todaySummary">
        {summary}
      </div>
      <div data-dashboard-fixed-widget="dailyAssistant">
        {assistant}
      </div>
    </div>
  );
}
