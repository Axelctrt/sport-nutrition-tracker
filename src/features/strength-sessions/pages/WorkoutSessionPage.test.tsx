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
});
