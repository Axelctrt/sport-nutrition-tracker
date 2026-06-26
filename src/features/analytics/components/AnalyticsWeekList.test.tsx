import { cleanup, render, screen } from '@testing-library/react';
import { AnalyticsWeekList } from '@/features/analytics/components/AnalyticsWeekList';

afterEach(cleanup);

describe('AnalyticsWeekList', () => {
  it('présente les détails hebdomadaires sans tableau horizontal', () => {
    const { container } = render(
      <AnalyticsWeekList
        items={[{
          id: '2026-06-08',
          label: '8 juin',
          metrics: [
            { label: 'Distance', value: '24 km' },
            { label: 'Durée', value: '2 h 10' },
          ],
        }]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Semaine du 8 juin' })).toBeInTheDocument();
    expect(screen.getByText('24 km')).toBeInTheDocument();
    expect(container.querySelector('table')).not.toBeInTheDocument();
  });
});
