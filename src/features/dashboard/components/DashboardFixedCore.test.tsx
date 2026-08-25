import { render, screen } from '@testing-library/react';
import { DashboardFixedCore } from '@/features/dashboard/components/DashboardFixedCore';

describe('DashboardFixedCore', () => {
  it('rend le résumé, le Coach optionnel puis l’assistant dans la zone fixe', () => {
    const { container } = render(
      <DashboardFixedCore
        summary={<div>Résumé fixe</div>}
        coach={<div>Coach fixe</div>}
        assistant={<div>Assistant fixe</div>}
      />,
    );

    const fixedWidgets = [
      ...container.querySelectorAll('[data-dashboard-fixed-widget]'),
    ].map((element) => element.getAttribute('data-dashboard-fixed-widget'));
    expect(fixedWidgets).toEqual(['todaySummary', 'dailyCoach', 'dailyAssistant']);
    expect(screen.getByText('Résumé fixe')).toBeInTheDocument();
    expect(screen.getByText('Coach fixe')).toBeInTheDocument();
    expect(screen.getByText('Assistant fixe')).toBeInTheDocument();
  });

  it('omet entièrement l’emplacement Coach lorsqu’il est absent', () => {
    const { container } = render(
      <DashboardFixedCore
        summary={<div>Résumé fixe</div>}
        assistant={<div>Assistant fixe</div>}
      />,
    );
    expect(container.querySelector('[data-dashboard-fixed-widget="dailyCoach"]')).toBeNull();
  });
});
