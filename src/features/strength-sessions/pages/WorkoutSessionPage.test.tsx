import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkoutSessionPage } from '@/features/strength-sessions/pages/WorkoutSessionPage';
import { WorkoutSessionsPage } from '@/features/strength-sessions/pages/WorkoutSessionsPage';
import { appDatabase } from '@/infrastructure/database/database';
import { repositories } from '@/infrastructure/repositories/repositories';
import { useClearInputValueOnFocus } from '@/shared/forms/useClearInputValueOnFocus';
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

function ClearInputOnFocusContract() {
  useClearInputValueOnFocus();
  return null;
}

function renderSessionPage(extraRoutes?: ReactNode, installClearOnFocus = false) {
  return render(
    <ToastProvider>
      {installClearOnFocus ? <ClearInputOnFocusContract /> : null}
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
    vi.restoreAllMocks();
    cleanup();
    window.sessionStorage.clear();
    await deleteAppDatabaseAfterTest();
  });

  it('ajoute un exercice, enregistre les notes et termine la séance', async () => {
    const user = userEvent.setup();
    renderSessionPage(<Route path="/strength/sessions" element={<WorkoutSessionsPage />} />);

    await screen.findByRole('heading', { name: 'Séance libre' });
    const abandonButton = screen.getByRole('button', { name: 'Abandonner la séance' });
    expect(abandonButton.querySelector('.lucide-x')).toBeInTheDocument();
    await user.click(screen.getByText('Ajouter un exercice'));
    await user.selectOptions(screen.getByLabelText('Exercice à ajouter'), 'exercise-row');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    const addedExerciseHeading = await screen.findByRole('heading', { name: 'Rowing barre' });
    expect(addedExerciseHeading).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Ajouter un exercice').closest('details')).not.toHaveAttribute('open');
    });
    expect(screen.getByPlaceholderText('Rechercher un exercice à ajouter')).toHaveValue('');
    await waitFor(() => expect(addedExerciseHeading.closest('[tabindex="-1"]')).toHaveFocus());
    expect(screen.queryByText('Exercice ajouté')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Chargement de la page')).not.toBeInTheDocument();

    await user.click(screen.getByText('Notes générales', { selector: 'span' }));
    await user.type(screen.getByLabelText('Notes générales'), 'Séance solide');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les notes' }));
    await waitFor(async () => {
      expect((await appDatabase.workoutSessions.get('session-current'))?.notes).toBe('Séance solide');
    });
    expect(screen.queryByText('Notes enregistrées')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Développer Développé couché' }));
    await user.click(screen.getByRole('button', { name: /Démarrer le repos/ }));
    expect(await screen.findByRole('region', { name: 'Minuteur de repos' })).toBeInTheDocument();

    const finishButton = screen.getByRole('button', { name: 'Terminer' });
    await waitFor(() => expect(finishButton).toBeEnabled());
    await user.click(finishButton);
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Il reste 4 séries prévues à valider/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Terminer la séance' }));
    expect(await screen.findByRole(
      'heading',
      { name: 'Mes entraînements' },
      { timeout: 10_000 },
    )).toBeInTheDocument();
    expect(await screen.findByText('Séance enregistrée')).toBeInTheDocument();
    expect(screen.getByText('Ta séance a bien été ajoutée à l’historique.')).toBeInTheDocument();
    expect(screen.getAllByText('Séance enregistrée')).toHaveLength(1);
    expect((await appDatabase.workoutSessions.get('session-current'))?.status).toBe('completed');
    expect(window.sessionStorage.getItem('sportpilot:rest-timer:session-current')).toBeNull();
  }, 25_000);

  it('conserve le panneau ouvert lorsque l’ajout de l’exercice échoue', async () => {
    const user = userEvent.setup();
    vi.spyOn(repositories.workoutSessions, 'addExercise')
      .mockRejectedValueOnce(new Error('Stockage indisponible'));
    renderSessionPage();

    await screen.findByRole('heading', { name: 'Séance libre' });
    await user.click(screen.getByText('Ajouter un exercice'));
    const selectorPanel = screen.getByText('Ajouter un exercice').closest('details');
    await user.type(screen.getByPlaceholderText('Rechercher un exercice à ajouter'), 'Rowing');
    await user.selectOptions(screen.getByLabelText('Exercice à ajouter'), 'exercise-row');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(await screen.findByText('Action impossible')).toBeInTheDocument();
    expect(selectorPanel).toHaveAttribute('open');
    expect(screen.getByPlaceholderText('Rechercher un exercice à ajouter')).toHaveValue('Rowing');
    expect(screen.queryByRole('heading', { name: 'Rowing barre' })).not.toBeInTheDocument();
  });

  it('reste sur la séance et n’affiche aucun toast de succès si la persistance échoue', async () => {
    const user = userEvent.setup();
    vi.spyOn(repositories.workoutSessions, 'update')
      .mockRejectedValueOnce(new Error('Stockage indisponible'));
    renderSessionPage(<Route path="/strength/sessions" element={<WorkoutSessionsPage />} />);

    await screen.findByRole('heading', { name: 'Séance libre' });
    await user.click(screen.getByRole('button', { name: 'Terminer' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Terminer la séance' }));

    expect(await screen.findByText('Action impossible')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Séance libre' })).toBeInTheDocument();
    expect(screen.queryByText('Séance enregistrée')).not.toBeInTheDocument();
  });

  it('ajoute automatiquement l’exercice créé dans le contexte de la séance', async () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={[{
          pathname: '/strength/sessions/session-current',
          state: {
            strengthExerciseCreationContext: {
              returnTo: 'session',
              query: 'Rowing barre',
              sessionId: 'session-current',
              plannedSets: 3,
            },
            strengthExerciseCreated: {
              exerciseId: 'exercise-row',
              context: {
                returnTo: 'session',
                query: 'Rowing barre',
                sessionId: 'session-current',
                plannedSets: 3,
              },
            },
          },
        }]}>
          <Routes>
            <Route path="/strength/sessions/:sessionId" element={<WorkoutSessionPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Rowing barre' }))
      .toBeInTheDocument();
    expect(await screen.findByText('Exercice créé et ajouté.'))
      .toBeInTheDocument();
    await waitFor(async () => {
      const added = await appDatabase.workoutSessionExercises
        .where('exerciseDefinitionId')
        .equals('exercise-row')
        .first();
      expect(added).toBeDefined();
      expect(await appDatabase.strengthSets
        .where('sessionExerciseId')
        .equals(added!.id)
        .count()).toBe(3);
    });
  });

  it('ajoute, valide, duplique et supprime des séries sans démonter la page', async () => {
    const user = userEvent.setup();
    renderSessionPage();

    await screen.findByRole('heading', { name: 'Séance libre' });
    expect(screen.getByRole('region', { name: 'Actions de la page' })).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Réduire Développé couché' });
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
    const benchCard = screen.getByRole('heading', { name: 'Développé couché' })
      .closest('[id^="workout-exercise-"]') as HTMLElement;
    await user.click(await within(benchCard).findByRole('button', { name: 'Développer Développé couché' }));
    expect(await within(benchCard).findByRole('heading', { name: 'Série 1' })).toBeInTheDocument();
    await user.click(
      within(benchCard).getByRole('button', { name: 'Modifier la série 1' }),
    );
    expect(screen.getByLabelText('Charge en kg')).toHaveValue(60);
    expect(screen.getByLabelText('Répétitions')).toHaveValue(12);
    expect(screen.getByLabelText('RPE')).toHaveValue(8);
    await waitFor(() => {
      expect(screen.getByRole('progressbar', { name: 'Progression de la séance' })).toHaveAttribute('aria-valuenow', '100');
    });
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

  it('conserve le focus et la saisie après la réconciliation locale d’un autosave', async () => {
    await appDatabase.workoutSessionExercises.update('session-exercise-bench', { plannedSets: 1 });
    await appDatabase.strengthSets.add(createEntity(createStrengthSetInput({
      sessionId: 'session-current',
      sessionExerciseId: 'session-exercise-bench',
      repetitions: 8,
      weightKg: 60,
      isCompleted: false,
    }), 'set-focus'));
    const listSetsSpy = vi.spyOn(repositories.strengthSets, 'listBySession');
    const user = userEvent.setup();
    renderSessionPage(undefined, true);

    const repetitionsInput = await screen.findByLabelText('Répétitions');
    listSetsSpy.mockClear();
    await user.click(repetitionsInput);
    expect(repetitionsInput).toHaveValue(null);
    await user.type(repetitionsInput, '1');
    expect(repetitionsInput).toHaveFocus();

    await waitFor(async () => {
      expect((await appDatabase.strengthSets.get('set-focus'))?.repetitions).toBe(1);
    });
    expect(screen.getByLabelText('Répétitions')).toBe(repetitionsInput);
    expect(repetitionsInput).toHaveFocus();
    expect(repetitionsInput).toHaveValue(1);
    expect(listSetsSpy).not.toHaveBeenCalled();

    await user.type(repetitionsInput, '2');
    expect(repetitionsInput).toHaveValue(12);

    await user.click(screen.getByLabelText('Charge en kg'));
    await user.click(repetitionsInput);
    expect(repetitionsInput).toHaveValue(null);
  });

  it('respecte la désactivation du lancement automatique tout en gardant le démarrage manuel', async () => {
    await appDatabase.deviceSettings.update('device-settings', { restTimerAutoStart: false });
    const user = userEvent.setup();
    renderSessionPage();

    await screen.findByRole('heading', { name: 'Séance libre' });
    await screen.findByRole('button', { name: 'Réduire Développé couché' });
    await user.click(screen.getByRole('button', { name: 'Ajouter une série' }));
    await user.click(await screen.findByRole('button', { name: 'Valider la série' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Minuteur de repos' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Démarrer le repos/ }));
    expect(await screen.findByRole('region', { name: 'Minuteur de repos' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Arrêter le minuteur' }));
    expect(screen.queryByRole('region', { name: 'Minuteur de repos' })).not.toBeInTheDocument();
  });

  it('n’ouvre qu’un exercice, permet de tous les fermer et reprend l’exercice courant', async () => {
    await appDatabase.workoutSessionExercises.add(createEntity(createWorkoutSessionExerciseInput({
      sessionId: 'session-current',
      exerciseDefinitionId: 'exercise-row',
      exerciseNameSnapshot: 'Rowing barre',
      sortOrder: 1,
    }), 'session-exercise-row'));
    const user = userEvent.setup();
    renderSessionPage();

    const benchCard = (await screen.findByRole('heading', { name: 'Développé couché' }))
      .closest('[id^="workout-exercise-"]') as HTMLElement;
    const rowCard = screen.getByRole('heading', { name: 'Rowing barre' })
      .closest('[id^="workout-exercise-"]') as HTMLElement;

    await within(benchCard).findByRole('button', { name: 'Réduire Développé couché' });
    expect(within(rowCard).getByRole('button', { name: 'Développer Rowing barre' })).toBeInTheDocument();

    await user.click(within(rowCard).getByRole('button', { name: 'Développer Rowing barre' }));
    expect(within(benchCard).getByRole('button', { name: 'Développer Développé couché' })).toBeInTheDocument();
    expect(within(rowCard).getByRole('button', { name: 'Réduire Rowing barre' })).toBeInTheDocument();

    await user.click(within(rowCard).getByRole('button', { name: 'Réduire Rowing barre' }));
    expect(within(benchCard).getByRole('button', { name: 'Développer Développé couché' })).toBeInTheDocument();
    expect(within(rowCard).getByRole('button', { name: 'Développer Rowing barre' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(await within(benchCard).findByRole('button', { name: 'Réduire Développé couché' })).toBeInTheDocument();
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
    await within(getBenchCard()!).findByRole('button', { name: 'Réduire Développé couché' });
    await user.click(within(getBenchCard()!).getByRole('button', { name: 'Passer pour l’instant' }));
    expect(within(getBenchCard()!).getByText('Passé temporairement')).toBeInTheDocument();
    await user.click(within(getBenchCard()!).getByRole('button', { name: 'Réintégrer' }));
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

    await user.click(within(getBenchCard()!).getByRole('button', { name: 'Développer Développé couché' }));
  });


  it('referme le dernier exercice terminé et ouvre automatiquement le suivant', async () => {
    await appDatabase.workoutSessionExercises.update('session-exercise-bench', {
      plannedSets: 1,
      restSeconds: 0,
    });
    await appDatabase.workoutSessionExercises.add(createEntity(createWorkoutSessionExerciseInput({
      sessionId: 'session-current',
      exerciseDefinitionId: 'exercise-row',
      exerciseNameSnapshot: 'Rowing barre',
      sortOrder: 1,
      plannedSets: 1,
      restSeconds: 0,
    }), 'session-exercise-row'));
    await appDatabase.strengthSets.bulkAdd([
      createEntity(createStrengthSetInput({
        sessionId: 'session-current',
        sessionExerciseId: 'session-exercise-bench',
        setNumber: 1,
        isCompleted: false,
      }), 'bench-set-1'),
      createEntity(createStrengthSetInput({
        sessionId: 'session-current',
        sessionExerciseId: 'session-exercise-row',
        setNumber: 1,
        isCompleted: false,
      }), 'row-set-1'),
    ]);

    const user = userEvent.setup();
    renderSessionPage();

    const benchCard = (await screen.findByRole('heading', { name: 'Développé couché' }))
      .closest('[id^="workout-exercise-"]') as HTMLElement;
    const rowCard = screen.getByRole('heading', { name: 'Rowing barre' })
      .closest('[id^="workout-exercise-"]') as HTMLElement;

    expect(within(benchCard).getByText('À faire maintenant')).toBeInTheDocument();
    await within(benchCard).findByRole('button', { name: 'Réduire Développé couché' });
    await user.click(within(benchCard).getByRole('button', { name: 'Valider la série' }));

    await waitFor(() => {
      expect(within(benchCard).getByRole('button', { name: 'Développer Développé couché' })).toBeInTheDocument();
      expect(within(rowCard).getByText('À faire maintenant')).toBeInTheDocument();
      expect(within(rowCard).getByRole('button', { name: 'Réduire Rowing barre' })).toBeInTheDocument();
    });
  });

  it('avance vers le prochain exercice lorsque la dernière série restante est supprimée', async () => {
    await appDatabase.workoutSessionExercises.update('session-exercise-bench', {
      plannedSets: 1,
      restSeconds: 0,
    });
    await appDatabase.workoutSessionExercises.add(createEntity(createWorkoutSessionExerciseInput({
      sessionId: 'session-current',
      exerciseDefinitionId: 'exercise-row',
      exerciseNameSnapshot: 'Rowing barre',
      sortOrder: 1,
      plannedSets: 1,
      restSeconds: 0,
    }), 'session-exercise-row'));
    await appDatabase.strengthSets.bulkAdd([
      createEntity(createStrengthSetInput({
        sessionId: 'session-current',
        sessionExerciseId: 'session-exercise-bench',
        setNumber: 1,
        isCompleted: false,
      }), 'bench-set-1'),
      createEntity(createStrengthSetInput({
        sessionId: 'session-current',
        sessionExerciseId: 'session-exercise-row',
        setNumber: 1,
        isCompleted: false,
      }), 'row-set-1'),
    ]);

    const user = userEvent.setup();
    renderSessionPage();

    const benchCard = (await screen.findByRole('heading', { name: 'Développé couché' }))
      .closest('[id^="workout-exercise-"]') as HTMLElement;
    const rowCard = screen.getByRole('heading', { name: 'Rowing barre' })
      .closest('[id^="workout-exercise-"]') as HTMLElement;

    await within(benchCard).findByRole('button', { name: 'Réduire Développé couché' });
    await user.click(within(benchCard).getByText('Options discrètes'));
    await user.click(within(benchCard).getByRole('button', { name: 'Supprimer la série' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer la série' }));

    await waitFor(async () => {
      expect(await appDatabase.strengthSets.where('sessionExerciseId').equals('session-exercise-bench').count()).toBe(0);
      expect(within(benchCard).getByRole('button', { name: 'Développer Développé couché' })).toBeInTheDocument();
      expect(within(rowCard).getByText('À faire maintenant')).toBeInTheDocument();
      expect(within(rowCard).getByRole('button', { name: 'Réduire Rowing barre' })).toBeInTheDocument();
    });
  });

  it('ne présente plus de réglage social dans la séance', async () => {
    renderSessionPage();

    await screen.findByRole('heading', { name: 'Séance libre' });
    expect(screen.queryByText('Partage avec les amis')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Privée' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer le partage' })).not.toBeInTheDocument();
  });

});
