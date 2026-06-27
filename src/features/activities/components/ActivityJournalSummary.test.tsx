import { render, screen } from '@testing-library/react';
import { ActivityJournalSummary } from '@/features/activities/components/ActivityJournalSummary';

describe('ActivityJournalSummary', () => {
  it('regroupe les trois indicateurs quotidiens dans une seule carte', () => {
    render(
      <ActivityJournalSummary
        activityCount={2}
        totalDurationMinutes={95}
        totalCaloriesKcal={642.7}
      />,
    );

    const summary = screen.getByRole('group', { name: 'Résumé des activités de la journée' });
    expect(summary).toHaveTextContent('Séances');
    expect(summary).toHaveTextContent('2');
    expect(summary).toHaveTextContent('95 min');
    expect(summary).toHaveTextContent('643 kcal');
  });
});
