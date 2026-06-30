import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WeeklyPlanningPage } from '@/features/strength-planning/pages/WeeklyPlanningPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { ToastProvider } from '@/shared/toast/ToastProvider';
import { createEntity } from '@/shared/utils/entities';
import { toLocalDate } from '@/shared/utils/dates';
import {
  createExerciseDefinitionInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
  createWorkoutTemplateExerciseInput,
  createWorkoutTemplateInput,
} from '@/test/factories/strengthFactory';

describe('WeeklyPlanningPage', () => {
  beforeEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
    await initializeDatabase();
    await appDatabase.exerciseDefinitions.add(createEntity(
      createExerciseDefinitionInput({ name: 'Développé couché' }),
      'exercise-bench',
    ));
    await appDatabase.workoutTemplates.add(createEntity(
      createWorkoutTemplateInput({ name: 'Push A' }),
      'template-push',
    ));
    await appDatabase.workoutTemplateExercises.add(createEntity(
      createWorkoutTemplateExerciseInput({
        templateId: 'template-push',
        exerciseDefinitionId: 'exercise-bench',
      }),
      'template-exercise-bench',
    ));
  });

  afterEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
  });

  it('planifie une séance puis démarre la même entrée depuis la semaine courante', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/strength/planning']}>
        <Routes>
          <Route path="/strength/planning" element={<WeeklyPlanningPage />} />
          <Route path="/strength/sessions/:sessionId" element={<h1>Séance planifiée ouverte</h1>} />
        </Routes>
      </MemoryRouter>
      </ToastProvider>,
    );

    const dateInput = await screen.findByLabelText('Date prévue');
    await user.clear(dateInput);
    await user.type(dateInput, toLocalDate());
    await user.click(
      screen.getByRole('button', {
        name: 'Planifier',
      }),
    );

    expect(
      await screen.findByText(
        'Séance planifiée',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Push A a été ajoutée au planning du/,
      ),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', {
        name: 'Push A',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Prévue')).toBeInTheDocument();

    const planned = await appDatabase.workoutSessions.where('status').equals('planned').first();
    expect(planned).toMatchObject({
      sourceTemplateId: 'template-push',
      plannedDate: toLocalDate(),
    });

    await user.click(screen.getByRole('button', { name: 'Démarrer' }));
    expect(await screen.findByRole('heading', { name: 'Séance planifiée ouverte' })).toBeInTheDocument();

    await waitFor(async () => {
      const started = planned ? await appDatabase.workoutSessions.get(planned.id) : undefined;
      expect(started).toMatchObject({ status: 'inProgress', plannedDate: toLocalDate() });
    });
  });

  it('ouvre la bonne semaine et cible la séance demandée', async () => {
    const plannedDate = '2026-07-14';

    await appDatabase.workoutSessions.add(
      createEntity(
        createWorkoutSessionInput({
          date: plannedDate,
          plannedDate,
          originalPlannedDate: plannedDate,
          status: 'planned',
          sourceTemplateId: 'template-push',
          sourceTemplateNameSnapshot:
            'Push A',
          plannedAt:
            '2026-07-01T10:00:00.000Z',
        }),
        'session-deep-link',
      ),
    );

    await appDatabase.workoutSessionExercises.add(
      createEntity(
        createWorkoutSessionExerciseInput({
          sessionId: 'session-deep-link',
          exerciseDefinitionId:
            'exercise-bench',
          exerciseNameSnapshot:
            'Développé couché',
        }),
        'session-exercise-deep-link',
      ),
    );

    render(
      <ToastProvider>
        <MemoryRouter
          initialEntries={[
            '/strength/planning?date=2026-07-14&session=session-deep-link',
          ]}
        >
          <Routes>
            <Route
              path="/strength/planning"
              element={<WeeklyPlanningPage />}
            />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    const sessionHeading =
      await screen.findByRole('heading', {
        name: 'Push A',
      });
    const sessionCard =
      sessionHeading.closest('article');

    expect(sessionCard).toHaveAttribute(
      'id',
      'planning-session-session-deep-link',
    );
    expect(sessionCard).toHaveClass(
      'ring-2',
    );

    await waitFor(() => {
      expect(
        sessionCard?.closest('details'),
      ).toHaveAttribute('open');
    });

    expect(
      sessionCard?.closest('details'),
    ).toHaveAttribute(
      'id',
      'planning-day-2026-07-14',
    );
});
});
