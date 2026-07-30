import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
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

function renderEditor(overrides: {
  editable?: boolean;
  sets?: Array<typeof completedSet>;
  onSave?: ComponentProps<typeof StrengthSetEditor>['onSave'];
} = {}) {
  const callbacks = {
    onAdd: vi.fn(async () => undefined),
    onSave: overrides.onSave ?? vi.fn(async () => completedSet),
    onCompletion: vi.fn(async () => undefined),
    onDuplicate: vi.fn(async () => undefined),
    onDelete: vi.fn(),
  };

  const rendered = render(
    <StrengthSetEditor
      exercise={exercise}
      sets={overrides.sets ?? [completedSet]}
      editable={overrides.editable ?? true}
      {...callbacks}
    />,
  );

  return { ...callbacks, ...rendered };
}

describe('StrengthSetEditor', () => {
  it('affiche une série validée sous forme de résumé compact modifiable à la demande', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.getByText('1/3 lignes · 1 validée')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Série 1' })).toBeInTheDocument();
    expect(screen.getByText('12 reps · 60 kg · RPE 8')).toBeInTheDocument();
    expect(screen.queryByLabelText('Charge en kg')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Modifier la série 1' }));
    expect(screen.getByLabelText('Charge en kg')).toHaveValue(60);
    expect(screen.getByLabelText('Charge en kg')).toHaveAttribute('data-clear-on-focus', 'true');
    expect(screen.getByLabelText('Répétitions')).toHaveValue(12);
    expect(screen.getByLabelText('Répétitions')).toHaveAttribute('data-clear-on-focus', 'true');
    expect(screen.getByLabelText('RPE')).toHaveValue(8);
    expect(screen.getByLabelText('RPE')).toHaveAttribute('data-clear-on-focus', 'true');
    expect(screen.getByRole('button', { name: 'Rouvrir la série' })).toBeInTheDocument();
  });

  it('regroupe les options secondaires dans un panneau discret', async () => {
    const user = userEvent.setup();
    const callbacks = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Modifier la série 1' }));
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

  it('sauvegarde une saisie différée sans bouton Enregistrer', async () => {
    const draftSet = { ...completedSet, isCompleted: false };
    const callbacks = renderEditor({ sets: [draftSet] });

    fireEvent.change(screen.getByLabelText('Charge en kg'), { target: { value: '65' } });

    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    expect(screen.getByText('Sauvegarde automatique')).toBeInTheDocument();
    await waitFor(() => expect(callbacks.onSave).toHaveBeenCalledWith(
      'bench',
      'set-1',
      expect.objectContaining({ weightKg: 65 }),
    ), { timeout: 1_500 });
  });

  it('sauvegarde au blur et conserve les valeurs si la sauvegarde échoue', async () => {
    const draftSet = { ...completedSet, isCompleted: false };
    const onSave = vi.fn(async () => undefined);
    renderEditor({ sets: [draftSet], onSave });

    const weightInput = screen.getByLabelText('Charge en kg');
    fireEvent.change(weightInput, { target: { value: '70' } });
    fireEvent.blur(weightInput, { relatedTarget: null });

    expect(await screen.findByRole('alert')).toHaveTextContent('Échec de l’enregistrement');
    expect(weightInput).toHaveValue(70);
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });

  it('vide la sauvegarde différée avant le démontage', async () => {
    const draftSet = { ...completedSet, isCompleted: false };
    const rendered = renderEditor({ sets: [draftSet] });

    fireEvent.change(screen.getByLabelText('Répétitions'), { target: { value: '9' } });
    rendered.unmount();

    await waitFor(() => expect(rendered.onSave).toHaveBeenCalledWith(
      'bench',
      'set-1',
      expect.objectContaining({ repetitions: 9 }),
    ));
  });
});
