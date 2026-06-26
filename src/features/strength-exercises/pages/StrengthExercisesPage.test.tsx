import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { createStrengthExercise } from '@/test/factories/strengthUxFactory';

const mocks = vi.hoisted(() => ({
  listAll: vi.fn(),
}));

vi.mock('@/infrastructure/repositories/repositories', () => ({
  repositories: {
    strengthExercises: {
      listAll: mocks.listAll,
    },
  },
}));

import { StrengthExercisesPage } from '@/features/strength-exercises/pages/StrengthExercisesPage';

describe('StrengthExercisesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listAll.mockResolvedValue([
      createStrengthExercise({ id: 'squat', name: 'Squat arrière' }),
      createStrengthExercise({ id: 'bench', name: 'Développé couché' }),
    ]);
  });

  it('conserve le focus pendant la saisie complète de la recherche', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StrengthExercisesPage />
      </MemoryRouter>,
    );

    const search = await screen.findByRole('searchbox', { name: 'Rechercher un exercice' });
    await user.type(search, 'squat');

    expect(search).toHaveValue('squat');
    expect(search).toHaveFocus();
    await waitFor(() => expect(screen.getByText('Squat arrière')).toBeInTheDocument());
    expect(screen.queryByText('Développé couché')).not.toBeInTheDocument();
    expect(mocks.listAll).toHaveBeenCalledTimes(1);
  });
});
