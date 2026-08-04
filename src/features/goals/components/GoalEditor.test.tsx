import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';

import type { GoalInput } from '@/application/goals/goalProgressService';
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

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
      screen.queryByLabelText(/Type d’objectif/),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Cumuler des pas')).toBeInTheDocument();
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
      screen.queryByLabelText(/Type d’objectif/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Courir une distance cumulée'),
    ).toBeInTheDocument();
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

  it('laisse la métrique sélectionnable uniquement à la création', () => {
    render(<GoalEditor onSaved={vi.fn()} />);

    expect(
      screen.getByLabelText(/Type d’objectif/),
    ).toHaveValue('totalSteps');
    expect(
      screen.queryByText('Pour changer de métrique, crée un nouvel objectif.'),
    ).not.toBeInTheDocument();
  });

  it('signale les changements apportés au formulaire', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();

    render(
      <GoalEditor
        onSaved={vi.fn()}
        onDirtyChange={onDirtyChange}
      />,
    );

    await user.type(
      screen.getByLabelText('Nom personnalisé'),
      'Objectif été',
    );

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
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
    const onSaved = vi.fn();
    const { rerender } = render(
      <GoalEditor
        initialWeightBaseline={72.4}
        onSaved={onSaved}
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
        onSaved={onSaved}
      />,
    );

    expect(
      screen.getByLabelText('Poids de départ (kg)'),
    ).toHaveValue(71.3);
  });

  it('conserve le poids de départ historique lors de la modification d’un objectif de poids', () => {
    const saveGoalAction = vi.fn(
      (input: GoalInput, id?: string): Goal => ({
        ...goal(id ? { id } : {}),
        ...input,
      }),
    );

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
    expect(
      screen.getByLabelText('Poids de départ (kg)'),
    ).toHaveAttribute('readonly');

    const submitButton = screen.getByRole('button', {
      name: 'Enregistrer les modifications',
    });
    const form = submitButton.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

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
