import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { GoalEditor } from '@/features/goals/components/GoalEditor';
import type { Goal } from '@/domain/goals/goalState';

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    title: 'Objectif initial',
    metric: 'totalSteps',
    targetValue: 100_000,
    startDate: '2026-07-01',
    deadline: '2026-08-01',
    status: 'active',
    reachedMilestones: [25],
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('GoalEditor', () => {
  it('réhydrate tous les champs quand l’objectif à modifier change', () => {
    const onSaved = vi.fn();
    const { rerender } = render(
      <GoalEditor goal={goal()} onSaved={onSaved} />,
    );

    expect(
      screen.getByLabelText('Nom personnalisé'),
    ).toHaveValue('Objectif initial');
    expect(
      screen.getByLabelText(/Type d’objectif/),
    ).toHaveValue('totalSteps');
    expect(
      screen.getByLabelText(/Cible/),
    ).toHaveValue(100_000);
    expect(
      screen.getByLabelText('Date de départ'),
    ).toHaveValue('2026-07-01');
    expect(
      screen.getByLabelText('Échéance facultative'),
    ).toHaveValue('2026-08-01');

    const nextGoal = goal({
      id: 'goal-2',
      title: 'Course rapide',
      metric: 'runningDistanceKm',
      targetValue: 42,
      startDate: '2026-09-01',
    });
    delete nextGoal.deadline;

    rerender(
      <GoalEditor
        goal={nextGoal}
        onSaved={onSaved}
      />,
    );

    expect(
      screen.getByLabelText('Nom personnalisé'),
    ).toHaveValue('Course rapide');
    expect(
      screen.getByLabelText(/Type d’objectif/),
    ).toHaveValue('runningDistanceKm');
    expect(
      screen.getByLabelText(/Cible/),
    ).toHaveValue(42);
    expect(
      screen.getByLabelText('Date de départ'),
    ).toHaveValue('2026-09-01');
    expect(
      screen.getByLabelText('Échéance facultative'),
    ).toHaveValue('');
  });

  it('préremplit un nouvel objectif de poids avec la dernière pesée connue', async () => {
    const user = userEvent.setup();

    render(
      <GoalEditor
        initialWeightBaseline={72.4}
        onSaved={vi.fn()}
      />,
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

  it('ne remplace pas le poids de départ saisi quand la dernière pesée change', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <GoalEditor
        initialWeightBaseline={72.4}
        onSaved={vi.fn()}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText(/Type d’objectif/),
      'weightTarget',
    );
    const baselineInput = screen.getByLabelText(
      'Poids de départ (kg)',
    );

    await user.clear(baselineInput);
    await user.type(baselineInput, '71.3');

    rerender(
      <GoalEditor
        initialWeightBaseline={73.1}
        onSaved={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText('Poids de départ (kg)'),
    ).toHaveValue(71.3);
  });

  it('conserve le poids de départ historique lors de la modification d’un objectif de poids', async () => {
    const user = userEvent.setup();
    const saveGoalAction = vi.fn((input, id) => ({
      ...goal({ id }),
      ...input,
    }));

    render(
      <GoalEditor
        goal={goal({
          id: 'weight-goal',
          title: 'Objectif poids été',
          metric: 'weightTarget',
          targetValue: 68,
          baselineValue: 76.2,
          startDate: '2026-06-01',
        })}
        initialWeightBaseline={72.4}
        saveGoalAction={saveGoalAction}
        onSaved={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText('Poids de départ (kg)'),
    ).toHaveValue(76.2);

    await user.click(
      screen.getByRole('button', {
        name: 'Enregistrer les modifications',
      }),
    );

    expect(saveGoalAction).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'weightTarget',
        targetValue: 68,
        baselineValue: 76.2,
        startDate: '2026-06-01',
      }),
      'weight-goal',
    );
  });
});
