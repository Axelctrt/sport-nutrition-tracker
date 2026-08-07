import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { createStrengthExercise } from '@/test/factories/strengthUxFactory';

import { StrengthExercisesPage } from '@/features/strength-exercises/pages/StrengthExercisesPage';
import { repositories } from '@/infrastructure/repositories/repositories';

describe('StrengthExercisesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(repositories.strengthExercises, 'listAll').mockResolvedValue([
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
    expect(repositories.strengthExercises.listAll).toHaveBeenCalledTimes(1);
  });

  it('traite une recherche sans résultat comme un état filtré et permet de tout réafficher', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StrengthExercisesPage />
      </MemoryRouter>,
    );

    const search = await screen.findByRole('searchbox', {
      name: 'Rechercher un exercice',
    });
    await user.type(search, 'tirage unilatéral poulie');

    const emptyTitle = await screen.findByText(
      'Aucun exercice trouvé pour « tirage unilatéral poulie »',
    );
    expect(
      emptyTitle.closest('[data-empty-state-variant]'),
    ).toHaveAttribute('data-empty-state-variant', 'filtered');
    expect(
      screen.getByRole('link', { name: 'Créer cet exercice' }),
    ).toHaveAttribute(
      'href',
      expect.stringContaining(
        'query=tirage+unilat%C3%A9ral+poulie',
      ),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Afficher tous les exercices',
      }),
    );

    expect(search).toHaveValue('');
    expect(screen.getByText('Squat arrière')).toBeInTheDocument();
    expect(screen.getByText('Développé couché')).toBeInTheDocument();
    expect(
      screen.queryByText(/Aucun exercice trouvé/),
    ).not.toBeInTheDocument();
  });

  it('réinitialise un filtre qui masque des exercices existants sans pousser vers la création', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StrengthExercisesPage />
      </MemoryRouter>,
    );

    await screen.findByText('Squat arrière');
    await user.click(
      screen.getByRole('button', {
        name: 'Catalogue',
      }),
    );

    const emptyTitle = await screen.findByText('Aucun exercice avec ces filtres');
    const emptyState = emptyTitle.closest('[data-empty-state-variant]');
    expect(emptyState).toHaveAttribute('data-empty-state-variant', 'filtered');
    expect(
      within(emptyState as HTMLElement).queryByRole('link', {
        name: 'Créer cet exercice',
      }),
    ).not.toBeInTheDocument();

    await user.click(
      within(emptyState as HTMLElement).getByRole('button', {
        name: 'Afficher tous les exercices',
      }),
    );

    expect(screen.getByText('Squat arrière')).toBeInTheDocument();
    expect(screen.getByText('Développé couché')).toBeInTheDocument();
  });

  it('conserve les suggestions de similarité dans un état filtré', async () => {
    const user = userEvent.setup();
    vi.mocked(repositories.strengthExercises.listAll).mockResolvedValue([
      createStrengthExercise({
        id: 'tirage',
        name: 'Tirage poulie unilatéral',
      }),
      createStrengthExercise({ id: 'bench', name: 'Développé couché' }),
    ]);

    render(
      <MemoryRouter>
        <StrengthExercisesPage />
      </MemoryRouter>,
    );

    const search = await screen.findByRole('searchbox', {
      name: 'Rechercher un exercice',
    });
    await user.type(search, 'tirage unilateral poulie');

    const emptyTitle = await screen.findByText(
      'Aucun exercice trouvé pour « tirage unilateral poulie »',
    );
    expect(
      emptyTitle.closest('[data-empty-state-variant]'),
    ).toHaveAttribute('data-empty-state-variant', 'filtered');
    expect(screen.getByText('Exercices similaires')).toBeInTheDocument();
    expect(screen.getByText('Tirage poulie unilatéral')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Créer cet exercice' }),
    ).not.toBeInTheDocument();
  });

  it('réserve le premier usage à un catalogue réellement vide', async () => {
    vi.mocked(repositories.strengthExercises.listAll).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <StrengthExercisesPage />
      </MemoryRouter>,
    );

    const emptyTitle = await screen.findByText('Aucun exercice dans le catalogue');
    const emptyState = emptyTitle.closest('[data-empty-state-variant]');
    expect(emptyState).toHaveAttribute('data-empty-state-variant', 'first-use');
    expect(
      within(emptyState as HTMLElement).getByRole('link', {
        name: 'Créer un exercice',
      }),
    ).toBeInTheDocument();
    expect(
      within(emptyState as HTMLElement).queryByRole('button', {
        name: 'Afficher tous les exercices',
      }),
    ).not.toBeInTheDocument();
  });
});
