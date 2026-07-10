import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WorkoutSessionProgressCard } from '@/features/strength-sessions/components/WorkoutSessionProgressCard';

describe('WorkoutSessionProgressCard', () => {
  it('affiche la prochaine série et permet de continuer', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();

    render(
      <WorkoutSessionProgressCard
        progress={{
          completedExerciseCount: 1,
          exerciseCount: 3,
          completedSetCount: 4,
          totalSetCount: 8,
          remainingSetCount: 4,
          incompleteExerciseCount: 2,
          percentage: 50,
          isComplete: false,
          nextStep: {
            exerciseId: 'row',
            exerciseName: 'Rowing barre',
            setId: 'set-row-2',
            setNumber: 2,
          },
        }}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByRole('progressbar', { name: 'Progression de la séance' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('Rowing barre · série 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(onContinue).toHaveBeenCalledWith('row', 'set-row-2');
  });

  it('annonce lorsque tous les exercices sont terminés', () => {
    render(
      <WorkoutSessionProgressCard
        progress={{
          completedExerciseCount: 2,
          exerciseCount: 2,
          completedSetCount: 6,
          totalSetCount: 6,
          remainingSetCount: 0,
          incompleteExerciseCount: 0,
          percentage: 100,
          isComplete: true,
        }}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText(/Tous les exercices prévus sont terminés/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuer' })).not.toBeInTheDocument();
  });
});
