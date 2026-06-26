import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { StrengthExerciseLibraryCard } from '@/features/strength-exercises/components/StrengthExerciseLibraryCard';
import { createStrengthExercise } from '@/test/factories/strengthUxFactory';

function renderCard(onArchiveChange = vi.fn().mockResolvedValue(true)) {
  const onDuplicate = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <StrengthExerciseLibraryCard
        exercise={createStrengthExercise()}
        onArchiveChange={onArchiveChange}
        onDuplicate={onDuplicate}
      />
    </MemoryRouter>,
  );
  return { onArchiveChange, onDuplicate };
}

describe('StrengthExerciseLibraryCard', () => {
  it('conserve l’historique prioritaire et replie les actions', () => {
    renderCard();

    expect(screen.getByRole('link', { name: 'Historique et progression' })).toHaveAttribute('href', '/strength/exercises/exercise-1/history');
    expect(screen.getByRole('button', { name: 'Actions pour Développé couché' }).closest('details')).not.toHaveAttribute('open');
  });

  it('demande confirmation avant archivage', async () => {
    const user = userEvent.setup();
    const { onArchiveChange } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Actions pour Développé couché' }));
    await user.click(screen.getByRole('button', { name: 'Archiver' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Archiver cet exercice ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Archiver' }));

    await waitFor(() => expect(onArchiveChange).toHaveBeenCalledWith('exercise-1', true));
  });
});
