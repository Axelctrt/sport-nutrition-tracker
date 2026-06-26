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

    await appDatabase.workoutSessions.bulkAdd([
      createEntity(createWorkoutSessionInput({
        date: '2026-06-10',
        completedAt: '2026-06-10T18:00:00.000Z',
        sourceTemplateNameSnapshot: 'Push A',
      }), 'session-old'),
      createEntity(createWorkoutSessionInput({
        date: '2026-06-20',
        completedAt: '2026-06-20T18:00:00.000Z',
        sourceTemplateNameSnapshot: 'Push B',
      }), 'session-latest'),
    ]);

    await appDatabase.workoutSessionExercises.bulkAdd([
      createEntity(createWorkoutSessionExerciseInput({
        sessionId: 'session-old',
        exerciseDefinitionId: 'exercise-bench',
        exerciseNameSnapshot: 'Développé couché',
      }), 'session-exercise-old'),
      createEntity(createWorkoutSessionExerciseInput({
        sessionId: 'session-latest',
        exerciseDefinitionId: 'exercise-bench',
        exerciseNameSnapshot: 'Développé couché',
      }), 'session-exercise-latest'),
    ]);

    await appDatabase.strengthSets.bulkAdd([
      createEntity(createStrengthSetInput({
        sessionId: 'session-old',
        sessionExerciseId: 'session-exercise-old',
        setNumber: 1,
        type: 'warmup',
        weightKg: 20,
        repetitions: 10,
      }), 'old-warmup'),
      createEntity(createStrengthSetInput({
        sessionId: 'session-old',
        sessionExerciseId: 'session-exercise-old',
        setNumber: 2,
        type: 'working',
        weightKg: 60,
        repetitions: 10,
      }), 'old-working'),
      createEntity(createStrengthSetInput({
        sessionId: 'session-latest',
        sessionExerciseId: 'session-exercise-latest',
        setNumber: 1,
        type: 'working',
        weightKg: 65,
        repetitions: 10,
      }), 'latest-working-1'),
      createEntity(createStrengthSetInput({
        sessionId: 'session-latest',
        sessionExerciseId: 'session-exercise-latest',
        setNumber: 2,
        type: 'working',
        weightKg: 65,
        repetitions: 8,
      }), 'latest-working-2'),
    ]);
  });

  afterEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
  });

  it('affiche les records, la comparaison, les graphiques et le détail des séries', async () => {
    render(
      <MemoryRouter initialEntries={['/strength/exercises/exercise-bench/history']}>
        <Routes>
          <Route path="/strength/exercises/:exerciseId/history" element={<StrengthExerciseHistoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Développé couché' })).toBeInTheDocument();
    expect(screen.getByText('Push A')).toBeInTheDocument();
    expect(screen.getByText('Push B')).toBeInTheDocument();
    expect(screen.getByText('Comparaison avec la séance précédente')).toBeInTheDocument();
    expect(screen.getByText('Évolution par séance')).toBeInTheDocument();
    expect(screen.getByText('Records de répétitions par charge')).toBeInTheDocument();
    expect(screen.getAllByText('Échauffement')).toHaveLength(1);
    expect(screen.getAllByText('Travail')).toHaveLength(3);
    expect(screen.getAllByText('65 kg').length).toBeGreaterThan(0);
    expect(screen.getByText('+570 kg')).toBeInTheDocument();
  });
});
