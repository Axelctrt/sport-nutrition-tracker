import {
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { GoalsPage } from '@/features/goals/pages/GoalsPage';
import type { GoalProgressView } from '@/application/goals/goalProgressService';
import type { GoalMetric } from '@/domain/goals/goalState';

function view(
  status: GoalProgressView['goal']['status'],
  id: string,
  metric: GoalMetric = 'totalSteps',
): GoalProgressView {
  return {
    goal: {
      id,
      title: `Objectif ${id}`,
      metric,
      targetValue: 10_000,
      startDate: '2026-06-01',
      status,
      reachedMilestones: [25],
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-01T08:00:00.000Z',
    },
    currentValue: 4_000,
    progressPercent: 40,
    remainingValue: 6_000,
    isOverdue: false,
    newlyReachedMilestones: [],
  };
}

function renderGoals(page: React.ReactNode) {
  const router = createMemoryRouter(
    [{ path: '/goals', element: page }],
    { initialEntries: ['/goals'] },
  );

  return {
    router,
    ...render(<RouterProvider router={router} />),
  };
}

describe('GoalsPage', () => {
  it('affiche les compteurs et filtre les objectifs', async () => {
    const user = userEvent.setup();

    renderGoals(
      <GoalsPage
        loadProgress={() =>
          Promise.resolve([
            view('active', 'actif'),
            view('completed', 'atteint'),
            view('archived', 'archive'),
          ])
        }
      />,
    );

    expect(
      await screen.findByText('Objectif actif'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Objectif atteint'),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Atteints',
      }),
    );

    expect(
      screen.getByText('Objectif atteint'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Objectif actif'),
    ).not.toBeInTheDocument();
  });

  it('propose une action contextuelle uniquement pour les objectifs actifs', async () => {
    renderGoals(
      <GoalsPage
        loadProgress={() =>
          Promise.resolve([
            view('active', 'poids', 'weightTarget'),
            view('paused', 'pas-en-pause', 'totalSteps'),
          ])
        }
      />,
    );

    expect(
      await screen.findByText('Objectif poids'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ajouter une pesée' }),
    ).toHaveAttribute('href', '/?action=weight');
    expect(
      screen.queryByRole('link', { name: 'Saisir les pas' }),
    ).not.toBeInTheDocument();
  });

  it('ouvre la modification dans une surface dédiée sans formulaire inline', async () => {
    const user = userEvent.setup();

    renderGoals(
      <GoalsPage
        loadProgress={() =>
          Promise.resolve([view('active', 'actif')])
        }
      />,
    );

    expect(
      await screen.findByText('Objectif actif'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Nom personnalisé'),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Modifier',
      }),
    );

    const editDialog = screen.getByRole('dialog', {
      name: 'Modifier un objectif',
    });
    expect(editDialog).toBeInTheDocument();
    expect(
      within(editDialog).getByLabelText('Nom personnalisé'),
    ).toHaveValue('Objectif actif');
    expect(
      within(editDialog).queryByLabelText(/Type d’objectif/),
    ).not.toBeInTheDocument();
    expect(
      within(editDialog).getByText(/Pour changer de métrique/),
    ).toBeInTheDocument();
  });

  it('propose une action explicite de création quand aucun objectif n’existe', async () => {
    const user = userEvent.setup();

    renderGoals(
      <GoalsPage
        loadProgress={() => Promise.resolve([])}
      />,
    );

    expect(
      await screen.findByText(
        'Aucun objectif dans cette vue',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Type d’objectif/),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Créer un objectif',
      }),
    );

    const createDialog = screen.getByRole('dialog', {
      name: 'Créer un objectif',
    });
    expect(createDialog).toBeInTheDocument();
    expect(
      within(createDialog).getByLabelText(/Type d’objectif/),
    ).toHaveValue('totalSteps');
  });

  it('préremplit la création d’un objectif de poids avec la dernière pesée', async () => {
    const user = userEvent.setup();

    renderGoals(
      <GoalsPage
        loadProgress={() => Promise.resolve([])}
        loadLatestWeightBaseline={() => Promise.resolve(72.4)}
      />,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Créer un objectif',
      }),
    );

    await user.selectOptions(
      screen.getByLabelText(/Type d’objectif/),
      'weightTarget',
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText('Poids de départ (kg)'),
      ).toHaveValue(72.4);
    });
  });

  it('demande confirmation avant d’abandonner une modification sale', async () => {
    const user = userEvent.setup();

    renderGoals(
      <GoalsPage
        loadProgress={() =>
          Promise.resolve([view('active', 'actif')])
        }
      />,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Modifier',
      }),
    );
    const titleInput = screen.getByLabelText('Nom personnalisé');
    await user.clear(titleInput);
    await user.type(titleInput, 'Objectif ajusté');

    await user.click(
      screen.getByRole('button', {
        name: 'Fermer l’éditeur d’objectif',
      }),
    );

    const discardDialog = screen.getByRole('alertdialog', {
      name: 'Annuler les modifications ?',
    });
    expect(discardDialog).toBeInTheDocument();

    await user.click(
      within(discardDialog).getByRole('button', {
        name: 'Continuer la modification',
      }),
    );
    expect(
      screen.getByRole('dialog', {
        name: 'Modifier un objectif',
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Fermer l’éditeur d’objectif',
      }),
    );
    const reopenedDiscardDialog = screen.getByRole('alertdialog', {
      name: 'Annuler les modifications ?',
    });
    await user.click(
      within(reopenedDiscardDialog).getByRole('button', {
        name: 'Abandonner les modifications',
      }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', {
          name: 'Modifier un objectif',
        }),
      ).not.toBeInTheDocument();
    });
  });
});
