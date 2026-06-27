import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkoutSessionPage } from '@/features/strength-sessions/pages/WorkoutSessionPage';
import { appDatabase } from '@/infrastructure/database/database';
import { ToastProvider } from '@/shared/toast/ToastProvider';
import { deleteAppDatabaseAfterTest, resetAppDatabaseForTest } from '@/test/appDatabaseTestUtils';
import { createEntity } from '@/shared/utils/entities';
import {
  createExerciseDefinitionInput,
  createProgressionSuggestionInput,
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
  createWorkoutTemplateExerciseInput,
  createWorkoutTemplateInput,
} from '@/test/factories/strengthFactory';

function renderSessionPage(extraRoutes?: ReactNode) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/strength/sessions/session-current']}>
        <Routes>
          <Route path="/strength/sessions/:sessionId" element={<WorkoutSessionPage />} />
          {extraRoutes}
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('WorkoutSessionPage', () => {
  beforeEach(async () => {
    cleanup();
    window.sessionStorage.clear();
    await resetAppDatabaseForTest();
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
      restSeconds: 120,
    }, 'session-exercise-bench'));
  });

  afterEach(async () => {
    cleanup();
    window.sessionStorage.clear();
    await deleteAppDatabaseAfterTest();
  });

  it('ajoute un exercice, enregistre les notes et termine la séance', async () => {
    const user = userEvent.setup();
    renderSessionPage(<Route path="/strength/sessions" element={<h1>Retour au carnet</h1>} />);

    await screen.findByRole('heading', { name: 'Séance libre' });
    const abandonButton = screen.getByRole('button', { name: 'Abandonner la séance' });
    expect(abandonButton.querySelector('.lucide-x')).toBeInTheDocument();
    await user.click(screen.getByText('Ajouter un exercice'));
    await user.selectOptions(screen.getByLabelText('Exercice à ajouter'), 'exercise-row');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(await screen.findByRole('heading', { name: 'Rowing barre' })).toBeInTheDocument();
    expect(screen.queryByText('Exercice ajouté')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Chargement de la page')).not.toBeInTheDocument();

    await user.click(screen.getByText('Notes générales', { selector: 'span' }));
    await user.type(screen.getByLabelText('Notes générales'), 'Séance solide');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les notes' }));
    await waitFor(async () => {
      expect((await appDatabase.workoutSessions.get('session-current'))?.notes).toBe('Séance solide');
    });
    expect(screen.queryByText('Notes enregistrées')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Démarrer le repos/ }));
    expect(await screen.findByRole('region', { name: 'Minuteur de repos' })).toBeInTheDocument();

    const finishButton = screen.getByRole('button', { name: 'Terminer' });
    await waitFor(() => expect(finishButton).toBeEnabled());
    await user.click(finishButton);
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Terminer la séance' }));
    expect(await screen.findByRole('heading', { name: 'Retour au carnet' })).toBeInTheDocument();
    expect((await appDatabase.workoutSessions.get('session-current'))?.status).toBe('completed');
    expect(window.sessionStorage.getItem('sportpilot:rest-timer:session-current')).toBeNull();
  }, 15_000);

  it('ajoute, valide, duplique et supprime des séries sans démonter la page', async () => {
    const user = userEvent.setup();
    renderSessionPage();

    await screen.findByRole('heading', { name: 'Séance libre' });
    expect(screen.getByRole('region', { name: 'Actions de la page' })).toBeInTheDocument();
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
      expect(sets[0]).toMatchObject({ repetitions: 12, weightKg: 60, rpe: 8, isCompleted: true });
    });
    expect(screen.queryByText('Série validée')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Chargement de la page')).not.toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Minuteur de repos' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent(/01:5[89]|02:00/);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Reprendre' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ajouter 15 secondes' }));
    await user.click(screen.getByRole('button', { name: 'Reprendre' }));

    await user.click(await screen.findByRole('button', { name: 'Dupliquer' }));
    await waitFor(async () => expect(await appDatabase.strengthSets.count()).toBe(2));
    expect(await screen.findByText('Série 2')).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: 'Supprimer la série' });
    await user.click(deleteButtons[0]!);
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer la série' }));
    await waitFor(async () => {
      const remaining = await appDatabase.strengthSets.toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.setNumber).toBe(1);
    });
  });

  it('respecte la désactivation du lancement automatique tout en gardant le démarrage manuel', async () => {
    await appDatabase.appSettings.update('app-settings', { restTimerAutoStart: false });
    const user = userEvent.setup();
    renderSessionPage();

    await screen.findByRole('heading', { name: 'Séance libre' });
    await user.click(screen.getByRole('button', { name: 'Ajouter une série' }));
    await user.click(await screen.findByRole('button', { name: 'Valider la série' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Minuteur de repos' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Démarrer le repos/ }));
    expect(await screen.findByRole('region', { name: 'Minuteur de repos' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Arrêter le minuteur' }));
    expect(screen.queryByRole('region', { name: 'Minuteur de repos' })).not.toBeInTheDocument();
  });

  it('permet de réduire et développer une carte d’exercice', async () => {
    const user = userEvent.setup();
    renderSessionPage();

    await screen.findByRole('heading', { name: 'Développé couché' });
    expect(screen.getByRole('button', { name: 'Ajouter une série' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Réduire Développé couché' }));
    expect(screen.queryByRole('button', { name: 'Ajouter une série' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Développer Développé couché' }));
    expect(screen.getByRole('button', { name: 'Ajouter une série' })).toBeInTheDocument();
  });

  it('affiche et reprend les séries de la séance précédente', async () => {
    await appDatabase.workoutSessions.add(createEntity(createWorkoutSessionInput({
      date: '2026-06-20',
      startedAt: '2026-06-20T17:00:00.000Z',
      completedAt: '2026-06-20T18:00:00.000Z',
    }), 'session-previous'));
    await appDatabase.workoutSessionExercises.add(createEntity(createWorkoutSessionExerciseInput({
      sessionId: 'session-previous',
      exerciseDefinitionId: 'exercise-bench',
      exerciseNameSnapshot: 'Développé couché',
    }), 'session-exercise-previous'));
    await appDatabase.strengthSets.bulkAdd([
      createEntity(createStrengthSetInput({
        sessionId: 'session-previous',
        sessionExerciseId: 'session-exercise-previous',
        setNumber: 1,
        repetitions: 12,
        weightKg: 60,
        rpe: 8,
      }), 'previous-set-1'),
      createEntity(createStrengthSetInput({
        sessionId: 'session-previous',
        sessionExerciseId: 'session-exercise-previous',
        setNumber: 2,
        repetitions: 10,
        weightKg: 60,
        rpe: 8.5,
      }), 'previous-set-2'),
    ]);
    const user = userEvent.setup();
    renderSessionPage();

    expect(await screen.findByText(/Dernière séance/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reprendre ces séries' }));

    await waitFor(async () => {
      const copied = await appDatabase.strengthSets.where('sessionId').equals('session-current').toArray();
      expect(copied).toHaveLength(2);
      expect(copied).toEqual(expect.arrayContaining([
        expect.objectContaining({ weightKg: 60, repetitions: 12, isCompleted: false }),
        expect.objectContaining({ weightKg: 60, repetitions: 10, isCompleted: false }),
      ]));
    });
    expect(screen.queryByText('Séries précédentes reprises')).not.toBeInTheDocument();
  });

  it('affiche une suggestion et applique la charge choisie au modèle', async () => {
    await appDatabase.workoutSessions.update('session-current', {
      status: 'completed',
      completedAt: '2026-06-25T18:00:00.000Z',
      sourceTemplateId: 'template-1',
      sourceTemplateNameSnapshot: 'Push A',
    });
    await appDatabase.workoutTemplates.add(createEntity(
      createWorkoutTemplateInput({ name: 'Push A' }),
      'template-1',
    ));
    await appDatabase.workoutTemplateExercises.add(createEntity(
      createWorkoutTemplateExerciseInput({
        templateId: 'template-1',
        exerciseDefinitionId: 'exercise-bench',
        targetLoadKg: 60,
      }),
      'template-exercise-1',
    ));
    await appDatabase.progressionSuggestions.add(createEntity(
      createProgressionSuggestionInput({
        sessionId: 'session-current',
        sessionExerciseId: 'session-exercise-bench',
        exerciseDefinitionId: 'exercise-bench',
        templateId: 'template-1',
        templateExerciseId: 'template-exercise-1',
        currentLoadKg: 60,
        suggestedLoadKg: 62.5,
      }),
      'suggestion-1',
    ));

    const user = userEvent.setup();
    renderSessionPage();

    expect(await screen.findByRole('heading', { name: 'Suggestions de progression' })).toBeInTheDocument();
    const loadInput = await screen.findByLabelText('Charge cible retenue');
    await user.clear(loadInput);
    await user.type(loadInput, '63');
    expect(loadInput).toHaveValue(63);
    const acceptButton = screen.getByRole('button', { name: 'Accepter cette charge' });
    await waitFor(() => expect(acceptButton).toBeEnabled());
    await user.click(acceptButton);

    await waitFor(async () => {
      expect((await appDatabase.progressionSuggestions.get('suggestion-1'))?.status).toBe('accepted');
      expect((await appDatabase.workoutTemplateExercises.get('template-exercise-1'))?.targetLoadKg).toBe(63);
    });
    expect(await screen.findByText(/Charge cible mise à jour à 63 kg/)).toBeInTheDocument();
  });

  it('guide un superset, permet de passer un exercice et utilise le repos de transition', async () => {
    await appDatabase.workoutSessionExercises.update('session-exercise-bench', {
      exerciseGroupId: 'group-a',
      exerciseGroupType: 'superset',
      exerciseGroupName: 'Poussée / tirage',
      exerciseGroupRounds: 3,
      exerciseGroupRestBetweenExercisesSeconds: 15,
      exerciseGroupRestBetweenRoundsSeconds: 90,
    });
    await appDatabase.workoutSessionExercises.add(createEntity(createWorkoutSessionExerciseInput({
      sessionId: 'session-current',
      exerciseDefinitionId: 'exercise-row',
      exerciseNameSnapshot: 'Rowing barre',
      sortOrder: 1,
      exerciseGroupId: 'group-a',
      exerciseGroupType: 'superset',
      exerciseGroupName: 'Poussée / tirage',
      exerciseGroupRounds: 3,
      exerciseGroupRestBetweenExercisesSeconds: 15,
      exerciseGroupRestBetweenRoundsSeconds: 90,
    }), 'session-exercise-row'));
    const user = userEvent.setup();
    renderSessionPage();

    expect(await screen.findByText('A1')).toBeInTheDocument();
    expect(screen.getByText('A2')).toBeInTheDocument();
    expect(screen.getAllByText('Poussée / tirage')).toHaveLength(2);
    expect(screen.getByText('Ensuite : Rowing barre')).toBeInTheDocument();

    const getBenchCard = () => screen.getByRole('heading', { name: 'Développé couché' })
      .closest('[id^="workout-exercise-"]') as HTMLElement | null;
    expect(getBenchCard()).not.toBeNull();
    await user.click(within(getBenchCard()!).getByRole('button', { name: 'Ajouter une série' }));
    await waitFor(async () => expect(await appDatabase.strengthSets.count()).toBe(1));
    const repetitionsInput = await screen.findByLabelText('Répétitions');
    await user.clear(repetitionsInput);
    await user.type(repetitionsInput, '10');
    const validateButton = await screen.findByRole('button', { name: 'Valider la série' });
    await waitFor(() => expect(validateButton).toBeEnabled());
    await user.click(validateButton);
    await waitFor(async () => {
      expect((await appDatabase.strengthSets.toArray())[0]?.isCompleted).toBe(true);
    });
    expect(await screen.findByRole('region', { name: 'Minuteur de repos' })).toBeInTheDocument();
    expect(screen.getByText('Transition vers Rowing barre')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent(/00:1[34]|00:15/);

    await user.click(within(getBenchCard()!).getByRole('button', { name: 'Passer pour l’instant' }));
    expect(within(getBenchCard()!).getByText('Passé temporairement')).toBeInTheDocument();
  });

});
