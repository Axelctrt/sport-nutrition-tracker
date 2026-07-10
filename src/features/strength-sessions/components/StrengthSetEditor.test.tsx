import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StrengthSetEditor } from '@/features/strength-sessions/components/StrengthSetEditor';
import { createEntity } from '@/shared/utils/entities';
import {
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
} from '@/test/factories/strengthFactory';

const exercise = createEntity(createWorkoutSessionExerciseInput({
  sessionId: 'session-1',
  exerciseDefinitionId: 'bench-definition',
  exerciseNameSnapshot: 'Développé couché',
  plannedSets: 3,
  loadUnitSnapshot: 'kg',
}), 'bench');

const completedSet = createEntity(createStrengthSetInput({
  sessionId: 'session-1',
  sessionExerciseId: 'bench',
  setNumber: 1,
  repetitions: 12,
  weightKg: 60,
  rpe: 8,
  isCompleted: true,
}), 'set-1');

function renderEditor(overrides: { editable?: boolean } = {}) {
  const callbacks = {
    onAdd: vi.fn(async () => undefined),
    onSave: vi.fn(async () => undefined),
    onCompletion: vi.fn(async () => undefined),
    onDuplicate: vi.fn(async () => undefined),
    onDelete: vi.fn(),
  };

  render(
    <StrengthSetEditor
      exercise={exercise}
      sets={[completedSet]}
      editable={overrides.editable ?? true}
      {...callbacks}
    />,
  );

  return callbacks;
}

describe('StrengthSetEditor', () => {
  it('compacte une série validée et permet de rouvrir son formulaire', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.getByText('60 kg · 12 reps · RPE 8')).toBeInTheDocument();
    expect(screen.queryByLabelText('Charge en kg')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Modifier la série 1' }));

    expect(screen.getByLabelText('Charge en kg')).toHaveValue(60);
    expect(screen.getByLabelText('Répétitions')).toHaveValue(12);
  });

  it('conserve les actions rapides sur une série compactée', async () => {
    const user = userEvent.setup();
    const callbacks = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Rouvrir la série' }));
    expect(callbacks.onCompletion).toHaveBeenCalledWith(
      'bench',
      'set-1',
      expect.objectContaining({ repetitions: 12, weightKg: 60, rpe: 8 }),
      false,
    );

    await user.click(screen.getByRole('button', { name: 'Dupliquer' }));
    expect(callbacks.onDuplicate).toHaveBeenCalledWith('bench', 'set-1');

    await user.click(screen.getByRole('button', { name: 'Supprimer la série' }));
    expect(callbacks.onDelete).toHaveBeenCalledWith('bench', 'set-1');
  });
});
