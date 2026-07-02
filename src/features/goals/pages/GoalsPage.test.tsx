import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { GoalsPage } from '@/features/goals/pages/GoalsPage';
import type { GoalProgressView } from '@/application/goals/goalProgressService';

function view(
  status: GoalProgressView['goal']['status'],
  id: string,
): GoalProgressView {
  return {
    goal: {
      id,
      title: `Objectif ${id}`,
      metric: 'totalSteps',
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

describe('GoalsPage', () => {
  it('affiche les compteurs et filtre les objectifs', async () => {
    const user = userEvent.setup();

    render(
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


  it('ouvre l’éditeur sans remplacer la route du HashRouter', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    });
    window.location.hash = '#/goals';

    render(
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

    expect(window.location.hash).toBe('#/goals');
    expect(
      screen.getByText('Modifier un objectif'),
    ).toBeInTheDocument();

    const editor = document.getElementById('goals-editor');
    expect(editor).toBeInstanceOf(HTMLDetailsElement);
    expect(editor).toHaveAttribute('open');
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });

    window.location.hash = '';
  });

  it('propose la création quand aucun objectif n’existe', async () => {
    render(
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
      screen.getByText('Nouvel objectif'),
    ).toBeInTheDocument();
  });
});
