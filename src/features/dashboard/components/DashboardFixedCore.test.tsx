import { render, screen } from '@testing-library/react';
import { DashboardFixedCore } from '@/features/dashboard/components/DashboardFixedCore';

describe('DashboardFixedCore', () => {
  it('rend toujours le résumé puis l’assistant dans la zone fixe', () => {
    const { container } = render(
      <DashboardFixedCore
        summary={<div>Résumé fixe</div>}
        assistant={<div>Assistant fixe</div>}
      />,
    );

    const fixedWidgets = [
      ...container.querySelectorAll('[data-dashboard-fixed-widget]'),
    ].map((element) => element.getAttribute('data-dashboard-fixed-widget'));
    expect(fixedWidgets).toEqual(['todaySummary', 'dailyAssistant']);
    expect(screen.getByText('Résumé fixe')).toBeInTheDocument();
    expect(screen.getByText('Assistant fixe')).toBeInTheDocument();
  });
});
