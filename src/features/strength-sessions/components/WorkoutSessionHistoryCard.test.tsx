import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkoutSessionHistoryCard } from '@/features/strength-sessions/components/WorkoutSessionHistoryCard';
import { createWorkoutSessionSummary } from '@/test/factories/strengthUxFactory';

describe('WorkoutSessionHistoryCard', () => {
  it('affiche les informations essentielles et la progression en attente', () => {
    render(
      <MemoryRouter>
        <WorkoutSessionHistoryCard summary={createWorkoutSessionSummary()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Push A' })).toBeInTheDocument();
    expect(screen.getByText('1 progression à décider')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir les suggestions' })).toHaveAttribute('href', '/strength/sessions/session-1');
  });
});
