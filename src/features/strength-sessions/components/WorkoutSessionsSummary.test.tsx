import { render, screen } from '@testing-library/react';
import { WorkoutSessionsSummary } from '@/features/strength-sessions/components/WorkoutSessionsSummary';
import { createWorkoutSessionSummary } from '@/test/factories/strengthUxFactory';

describe('WorkoutSessionsSummary', () => {
  it('regroupe les indicateurs prioritaires', () => {
    render(
      <WorkoutSessionsSummary
        sessions={[
          createWorkoutSessionSummary(),
          createWorkoutSessionSummary({
            session: { ...createWorkoutSessionSummary().session, id: 'session-2', status: 'abandoned', durationMinutes: 20 },
            pendingProgressionCount: 0,
          }),
        ]}
      />,
    );

    expect(screen.getByLabelText('Terminées : 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Minutes : 65')).toBeInTheDocument();
    expect(screen.getByLabelText('Progressions : 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Abandonnées : 1')).toBeInTheDocument();
  });
});
