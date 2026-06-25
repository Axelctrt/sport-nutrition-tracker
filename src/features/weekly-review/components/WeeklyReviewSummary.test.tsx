import { cleanup, render, screen } from '@testing-library/react';
import { WeeklyReviewSummary } from '@/features/weekly-review/components/WeeklyReviewSummary';
import { createWeeklyReview } from '@/test/factories/weeklyReviewFactory';

afterEach(cleanup);

describe('WeeklyReviewSummary', () => {
  it('regroupe les quatre indicateurs hebdomadaires prioritaires', () => {
    render(<WeeklyReviewSummary review={createWeeklyReview()} />);

    expect(screen.getByRole('heading', { name: 'Résumé de la semaine' })).toBeInTheDocument();
    expect(screen.getByText('69,5 kg')).toBeInTheDocument();
    expect(screen.getByText('-0,5 kg')).toBeInTheDocument();
    expect(screen.getByText('92 %')).toBeInTheDocument();
    expect(screen.getByText('82/100')).toBeInTheDocument();
  });
});
