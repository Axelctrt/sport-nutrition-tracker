import { render, screen, within } from '@testing-library/react';
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
  it('affiche une série validée sous forme de ligne compacte directement éditable', () => {
    renderEditor();

    expect(screen.getByText('1/3 lignes · 1 validée')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Série 1' })).toBeInTheDocument();
    expect(screen.getByLabelText('Charge en kg')).toHaveValue(60);
    expect(screen.getByLabelText('Répétitions')).toHaveValue(12);
    expect(screen.getByLabelText('RPE')).toHaveValue(8);
    expect(screen.getByRole('button', { name: 'Rouvrir la série' })).toBeInTheDocument();
  });

  it('regroupe les options secondaires dans un panneau discret', async () => {
    const user = userEvent.setup();
    const callbacks = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Rouvrir la série' }));
    expect(callbacks.onCompletion).toHaveBeenCalledWith(
      'bench',
      'set-1',
      expect.objectContaining({ repetitions: 12, weightKg: 60, rpe: 8 }),
      false,
    );

    await user.click(screen.getByText('Options discrètes'));
    const options = screen.getByText('Options discrètes').closest('details');
    expect(options).not.toBeNull();

    await user.click(within(options as HTMLElement).getByRole('button', { name: 'Dupliquer' }));
    expect(callbacks.onDuplicate).toHaveBeenCalledWith('bench', 'set-1');

    await user.click(within(options as HTMLElement).getByRole('button', { name: 'Supprimer la série' }));
    expect(callbacks.onDelete).toHaveBeenCalledWith('bench', 'set-1');
  });
});
