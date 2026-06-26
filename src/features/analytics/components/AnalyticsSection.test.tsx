import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Activity } from 'lucide-react';
import { AnalyticsSection } from '@/features/analytics/components/AnalyticsSection';

afterEach(cleanup);

describe('AnalyticsSection', () => {
  it('ne monte le contenu détaillé qu’après ouverture', async () => {
    const user = userEvent.setup();
    render(
      <AnalyticsSection
        title="Course"
        description="Distance et durée"
        summary="42 km"
        icon={Activity}
      >
        <p>Graphique détaillé</p>
      </AnalyticsSection>,
    );

    const toggle = screen.getByRole('button', { name: /Course/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Graphique détaillé')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Graphique détaillé')).toBeInTheDocument();
  });
});
