import type { ReactNode } from 'react';

interface DashboardFixedCoreProps {
  summary: ReactNode;
  coach?: ReactNode;
  assistant: ReactNode;
}

export function DashboardFixedCore({
  summary,
  coach,
  assistant,
}: DashboardFixedCoreProps) {
  return (
    <div data-dashboard-core>
      <div data-dashboard-fixed-widget="todaySummary">
        {summary}
      </div>
      {coach ? (
        <div data-dashboard-fixed-widget="dailyCoach">
          {coach}
        </div>
      ) : null}
      <div data-dashboard-fixed-widget="dailyAssistant">
        {assistant}
      </div>
    </div>
  );
}
