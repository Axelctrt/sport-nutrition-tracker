import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StrengthExerciseHistoryPage } from '@/features/strength-history/pages/StrengthExerciseHistoryPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { createEntity } from '@/shared/utils/entities';
import {
  createExerciseDefinitionInput,
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
} from '@/test/factories/strengthFactory';

describe('StrengthExerciseHistoryPage', () => {
  beforeEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
    await initializeDatabase();
    await appDatabase.exerciseDefinitions.put(createEntity(
      createExerciseDefinitionInput({ name: 'Développé couché' }),
      'exercise-bench',
    ));
    await appDatabase.workoutSessions.add(createEntity(createWorkoutSessionInput({
      date: '2026-06-20',
      sourceTemplateNameSnapshot: 'Push A',
    }), 'session-history'));
    await appDatabase.workoutSessionExercises.add(createEntity(createWorkoutSessionExerciseInput({
      sessionId: 'session-history',
      exerciseDefinitionId: 'exercise-bench',
      exerciseNameSnapshot: 'Développé couché',
    }), 'session-exercise-history'));
    await appDatabase.strengthSets.bulkAdd([
      createEntity(createStrengthSetInput({
        sessionId: 'session-history',
        sessionExerciseId: 'session-exercise-history',
        setNumber: 1,
        type: 'warmup',
        weightKg: 20,
        repetitions: 10,
      }), 'history-warmup'),
      createEntity(createStrengthSetInput({
        sessionId: 'session-history',
        sessionExerciseId: 'session-exercise-history',
        setNumber: 2,
        type: 'working',
        weightKg: 60,
        repetitions: 10,
      }), 'history-working'),
    ]);
  });

  afterEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
  });

  it('affiche les performances et exclut l’échauffement du volume principal', async () => {
    render(
      <MemoryRouter initialEntries={['/strength/exercises/exercise-bench/history']}>
        <Routes>
          <Route path="/strength/exercises/:exerciseId/history" element={<StrengthExerciseHistoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Développé couché' })).toBeInTheDocument();
    expect(screen.getByText('Push A')).toBeInTheDocument();
    expect(screen.getByText('600 kg')).toBeInTheDocument();
    expect(screen.getByText('Échauffement')).toBeInTheDocument();
    expect(screen.getByText('Travail')).toBeInTheDocument();
  });
});
