import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StrengthHistorySessionCard } from '@/features/strength-history/components/StrengthHistorySessionCard';
import { createExerciseHistoryEntry } from '@/test/factories/strengthUxFactory';

describe('StrengthHistorySessionCard', () => {
  it('garde les séries repliées et propose la séance complète', () => {
    render(
      <MemoryRouter>
        <StrengthHistorySessionCard entry={createExerciseHistoryEntry()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Voir les séries').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('80 kg × 8 · RPE 8')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir la séance' })).toHaveAttribute('href', '/strength/sessions/session-1');
  });
});
