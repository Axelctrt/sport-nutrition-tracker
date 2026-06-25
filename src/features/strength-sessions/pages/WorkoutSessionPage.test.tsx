import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkoutSessionPage } from '@/features/strength-sessions/pages/WorkoutSessionPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { createEntity } from '@/shared/utils/entities';
import {
  createExerciseDefinitionInput,
} from '@/test/factories/strengthFactory';

describe('WorkoutSessionPage', () => {
  beforeEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
    await initializeDatabase();
    await appDatabase.exerciseDefinitions.bulkPut([
      createEntity(createExerciseDefinitionInput({ name: 'Développé couché' }), 'exercise-bench'),
      createEntity(createExerciseDefinitionInput({ name: 'Rowing barre', primaryMuscleGroup: 'back' }), 'exercise-row'),
    ]);
    await appDatabase.workoutSessions.add(createEntity({
      date: '2026-06-25',
      status: 'inProgress',
      startedAt: '2026-06-25T17:00:00.000Z',
    }, 'session-current'));
    await appDatabase.workoutSessionExercises.add(createEntity({
      sessionId: 'session-current',
      exerciseDefinitionId: 'exercise-bench',
      exerciseNameSnapshot: 'Développé couché',
      sortOrder: 0,
      loadUnitSnapshot: 'kg',
    }, 'session-exercise-bench'));
  });

  afterEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
  });

  it('ajoute un exercice, enregistre les notes et termine la séance', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={['/strength/sessions/session-current']}>
        <Routes>
          <Route path="/strength/sessions/:sessionId" element={<WorkoutSessionPage />} />
          <Route path="/strength/sessions" element={<h1>Retour au carnet</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Séance libre' });
    await user.selectOptions(screen.getByLabelText('Exercice à ajouter'), 'exercise-row');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(await screen.findByRole('heading', { name: 'Rowing barre' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Notes générales'), 'Séance solide');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les notes' }));
    await waitFor(async () => {
      expect((await appDatabase.workoutSessions.get('session-current'))?.notes).toBe('Séance solide');
    });

    await user.click(await screen.findByRole('button', { name: 'Terminer' }));
    expect(await screen.findByRole('heading', { name: 'Retour au carnet' })).toBeInTheDocument();
    expect((await appDatabase.workoutSessions.get('session-current'))?.status).toBe('completed');
  });

  it('ajoute, valide, duplique et supprime des séries', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={['/strength/sessions/session-current']}>
        <Routes>
          <Route path="/strength/sessions/:sessionId" element={<WorkoutSessionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Séance libre' });
    await user.click(screen.getByRole('button', { name: 'Ajouter une série' }));

    const weightInput = await screen.findByLabelText('Charge en kg');
    await user.clear(weightInput);
    await user.type(weightInput, '60');
    const repetitionsInput = screen.getByLabelText('Répétitions');
    await user.clear(repetitionsInput);
    await user.type(repetitionsInput, '12');
    await user.type(screen.getByLabelText('RPE'), '8');
    await user.click(screen.getByRole('button', { name: 'Valider la série' }));

    await waitFor(async () => {
      const sets = await appDatabase.strengthSets.toArray();
      expect(sets).toHaveLength(1);
      expect(sets[0]).toMatchObject({
        repetitions: 12,
        weightKg: 60,
        rpe: 8,
        isCompleted: true,
      });
    });

    await user.click(screen.getByRole('button', { name: 'Dupliquer' }));
    await waitFor(async () => {
      expect(await appDatabase.strengthSets.count()).toBe(2);
    });
    await screen.findByText('Série 2');
    expect(screen.getAllByText(/Série [12]/)).toHaveLength(2);

    const deleteButtons = screen.getAllByRole('button', { name: 'Supprimer' });
    await user.click(deleteButtons[0]!);
    await waitFor(async () => {
      const remaining = await appDatabase.strengthSets.toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.setNumber).toBe(1);
    });
  });

});
