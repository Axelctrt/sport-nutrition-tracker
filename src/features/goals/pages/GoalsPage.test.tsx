import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
