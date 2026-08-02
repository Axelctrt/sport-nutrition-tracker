import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  onCompletion?: ComponentProps<typeof StrengthSetEditor>['onCompletion'];
} = {}) {
  const callbacks = {
    onAdd: vi.fn(async () => undefined),
    onSave: overrides.onSave ?? vi.fn(async () => completedSet),
    onCompletion: overrides.onCompletion ?? vi.fn(async () => undefined),
    onDuplicate: vi.fn(async () => undefined),
    onDelete: vi.fn(),
  };

  const view = (sets: Array<typeof completedSet>) => (
    <StrengthSetEditor
      exercise={exercise}
      sets={sets}
      editable={overrides.editable ?? true}
      {...callbacks}
    />
  );
  const rendered = render(view(overrides.sets ?? [completedSet]));

  return {
    ...callbacks,
    ...rendered,
    rerenderSets: (sets: Array<typeof completedSet>) => rendered.rerender(view(sets)),
  };
}

describe('StrengthSetEditor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it('conserve un champ obligatoire vide au-delà du délai d’autosauvegarde', async () => {
    vi.useFakeTimers();
    const draftSet = { ...completedSet, isCompleted: false };
    const callbacks = renderEditor({ sets: [draftSet] });
    const repetitionsInput = screen.getByLabelText('Répétitions');

    fireEvent.focus(repetitionsInput);
    fireEvent.change(repetitionsInput, { target: { value: '' } });
    await act(() => vi.advanceTimersByTimeAsync(2_000));

    expect(repetitionsInput).toHaveValue(null);
    expect(callbacks.onSave).not.toHaveBeenCalled();
  });

  it('préserve une saisie lente entre deux autosauvegardes', async () => {
    vi.useFakeTimers();
    const draftSet = { ...completedSet, repetitions: 0, isCompleted: false };
    const callbacks = renderEditor({ sets: [draftSet] });
    const repetitionsInput = screen.getByLabelText('Répétitions');

    fireEvent.focus(repetitionsInput);
    fireEvent.change(repetitionsInput, { target: { value: '' } });
    await act(() => vi.advanceTimersByTimeAsync(700));
    expect(callbacks.onSave).not.toHaveBeenCalled();

    fireEvent.change(repetitionsInput, { target: { value: '1' } });
    await act(() => vi.advanceTimersByTimeAsync(700));
    expect(callbacks.onSave).toHaveBeenLastCalledWith(
      'bench',
      'set-1',
      expect.objectContaining({ repetitions: 1 }),
    );
    callbacks.rerenderSets([{ ...draftSet, repetitions: 1 }]);
    expect(repetitionsInput).toHaveValue(1);

    fireEvent.change(repetitionsInput, { target: { value: '12' } });
    await act(() => vi.advanceTimersByTimeAsync(700));
    expect(repetitionsInput).toHaveValue(12);
    expect(callbacks.onSave).toHaveBeenLastCalledWith(
      'bench',
      'set-1',
      expect.objectContaining({ repetitions: 12 }),
    );
  });

  it('sauvegarde un champ facultatif vidé comme une absence de valeur', async () => {
    vi.useFakeTimers();
    const draftSet = { ...completedSet, isCompleted: false };
    const callbacks = renderEditor({ sets: [draftSet] });

    fireEvent.change(screen.getByLabelText('RPE'), { target: { value: '' } });
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(callbacks.onSave).toHaveBeenCalledWith(
      'bench',
      'set-1',
      expect.objectContaining({ rpe: undefined }),
    );
  });

  it('préserve une valeur décimale saisie lentement', async () => {
    vi.useFakeTimers();
    const draftSet = { ...completedSet, weightKg: 0, isCompleted: false };
    const callbacks = renderEditor({ sets: [draftSet] });
    const weightInput = screen.getByLabelText('Charge en kg');

    fireEvent.focus(weightInput);
    fireEvent.change(weightInput, { target: { value: '6' } });
    await act(() => vi.advanceTimersByTimeAsync(700));
    callbacks.rerenderSets([{ ...draftSet, weightKg: 6 }]);
    fireEvent.change(weightInput, { target: { value: '6.5' } });
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(weightInput).toHaveValue(6.5);
    expect(callbacks.onSave).toHaveBeenLastCalledWith(
      'bench',
      'set-1',
      expect.objectContaining({ weightKg: 6.5 }),
    );
  });

  it('n’écrase pas un champ actif et sale avec un rafraîchissement persistant', () => {
    const draftSet = { ...completedSet, isCompleted: false };
    const callbacks = renderEditor({ sets: [draftSet] });
    const weightInput = screen.getByLabelText('Charge en kg');

    fireEvent.focus(weightInput);
    fireEvent.change(weightInput, { target: { value: '70' } });
    callbacks.rerenderSets([{ ...draftSet, weightKg: 65 }]);

    expect(weightInput).toHaveValue(70);
  });

  it('diffère une mise à jour externe pendant le focus sans réenregistrer la valeur obsolète', () => {
    const draftSet = { ...completedSet, isCompleted: false };
    const callbacks = renderEditor({ sets: [draftSet] });
    const weightInput = screen.getByLabelText('Charge en kg');

    fireEvent.focus(weightInput);
    callbacks.rerenderSets([{ ...draftSet, weightKg: 65 }]);
    expect(weightInput).toHaveValue(60);

    fireEvent.blur(weightInput, { relatedTarget: null });
    expect(weightInput).toHaveValue(65);
    expect(callbacks.onSave).not.toHaveBeenCalled();
  });

  it('applique la validation stricte au moment de valider une série', async () => {
    const draftSet = { ...completedSet, isCompleted: false };
    const callbacks = renderEditor({ sets: [draftSet] });
    const repetitionsInput = screen.getByLabelText('Répétitions');

    fireEvent.change(repetitionsInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Valider la série' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Complète ce champ');
    expect(callbacks.onCompletion).not.toHaveBeenCalled();

    fireEvent.change(repetitionsInput, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Valider la série' }));
    await waitFor(() => expect(callbacks.onCompletion).toHaveBeenCalledWith(
      'bench',
      'set-1',
      expect.objectContaining({ repetitions: 10 }),
      true,
    ));
  });

  it('annule l’autosauvegarde différée avant de valider la série', async () => {
    vi.useFakeTimers();
    const draftSet = { ...completedSet, isCompleted: false };
    const callbacks = renderEditor({ sets: [draftSet] });

    fireEvent.change(screen.getByLabelText('RPE'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Valider la série' }));
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(callbacks.onCompletion).toHaveBeenCalledWith(
      'bench',
      'set-1',
      expect.objectContaining({ rpe: 9 }),
      true,
    );
    expect(callbacks.onSave).not.toHaveBeenCalled();
  });

  it('attend une autosauvegarde en vol avant de valider la série', async () => {
    vi.useFakeTimers();
    const draftSet = { ...completedSet, isCompleted: false };
    let resolveSave: ((value: unknown) => void) | undefined;
    const onSave = vi.fn(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));
    const onCompletion = vi.fn(async () => completedSet);
    renderEditor({ sets: [draftSet], onSave, onCompletion });

    fireEvent.change(screen.getByLabelText('RPE'), { target: { value: '9' } });
    await act(() => vi.advanceTimersByTimeAsync(700));
    expect(onSave).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Valider la série' }));
    expect(onCompletion).not.toHaveBeenCalled();

    await act(async () => resolveSave?.(draftSet));
    expect(onCompletion).toHaveBeenCalledWith(
      'bench',
      'set-1',
      expect.objectContaining({ rpe: 9 }),
      true,
    );
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
