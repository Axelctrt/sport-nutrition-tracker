import { cleanup, render, screen } from '@testing-library/react';
import { AnalyticsOverview } from '@/features/analytics/components/AnalyticsOverview';

afterEach(cleanup);

describe('AnalyticsOverview', () => {
  it('regroupe les indicateurs principaux dans une seule synthèse', () => {
    render(
      <AnalyticsOverview
        runningDistanceKm={42.4}
        runningSessions={6}
        swimmingDistanceMeters={4_500}
        swimmingSessions={3}
        calorieAdherencePercent={88.6}
        latestWeightKg={69.4}
        latestWeightWeighIns={4}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Vue d’ensemble sur 12 semaines' })).toBeInTheDocument();
    expect(screen.getByText('42,4 km')).toBeInTheDocument();
    expect(screen.getByText('4,5 km')).toBeInTheDocument();
    expect(screen.getByText('89 %')).toBeInTheDocument();
    expect(screen.getByText('69,4 kg')).toBeInTheDocument();
  });
});
