import { cleanup, render, screen } from '@testing-library/react';
import { WeeklyReviewHistoryCard } from '@/features/weekly-review/components/WeeklyReviewHistoryCard';
import { createWeeklyReview } from '@/test/factories/weeklyReviewFactory';

afterEach(cleanup);

describe('WeeklyReviewHistoryCard', () => {
  it('remplace une ligne de tableau par une carte lisible sur mobile', () => {
    const { container } = render(
      <WeeklyReviewHistoryCard review={createWeeklyReview({ decisionStatus: 'accepted' })} />,
    );

    expect(screen.getByText('Acceptée')).toBeInTheDocument();
    expect(screen.getByText('82/100')).toBeInTheDocument();
    expect(screen.getByText('+100 kcal/j')).toBeInTheDocument();
    expect(container.querySelector('table')).not.toBeInTheDocument();
  });
});
