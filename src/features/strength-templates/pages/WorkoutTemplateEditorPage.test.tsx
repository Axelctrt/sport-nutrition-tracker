import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkoutTemplateEditorPage } from '@/features/strength-templates/pages/WorkoutTemplateEditorPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { defaultWorkoutTemplateFormValues } from '@/features/strength-templates/utils/workoutTemplateForm';
import { createEntity } from '@/shared/utils/entities';
import {
  createWorkoutTemplateExerciseInput,
  createWorkoutTemplateInput,
} from '@/test/factories/strengthFactory';

describe('WorkoutTemplateEditorPage', () => {
  beforeEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
    await initializeDatabase();
    window.sessionStorage.clear();
  });

  afterEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
    window.sessionStorage.clear();
  });

  it('crée une séance modèle avec un exercice du catalogue', async () => {
    const user = userEvent.setup();
    const definition = (await appDatabase.exerciseDefinitions.orderBy('name').toArray())[0]!;
    render(
      <MemoryRouter initialEntries={['/strength/templates/new']}>
        <Routes>
          <Route path="/strength/templates/new" element={<WorkoutTemplateEditorPage />} />
          <Route path="/strength/templates" element={<h1>Séances chargées</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    const nameInput = await screen.findByLabelText(/Nom de la séance/);
    await user.type(nameInput, 'Push A');
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher un exercice à ajouter au modèle' }), definition.name);
    await user.click(screen.getByRole('button', { name: `Ajouter ${definition.name}` }));
    await user.click(screen.getByRole('button', { name: 'Créer la séance' }));

    expect(await screen.findByRole('heading', { name: 'Séances chargées' })).toBeInTheDocument();
    await waitFor(async () => {
      expect(await appDatabase.workoutTemplates.count()).toBe(1);
      expect(await appDatabase.workoutTemplateExercises.count()).toBe(1);
    });
  });

  it('crée, configure et enregistre un superset', async () => {
    const user = userEvent.setup();
    const definitions = (await appDatabase.exerciseDefinitions.orderBy('name').toArray()).slice(0, 2);
    render(
      <MemoryRouter initialEntries={['/strength/templates/new']}>
        <Routes>
          <Route path="/strength/templates/new" element={<WorkoutTemplateEditorPage />} />
          <Route path="/strength/templates" element={<h1>Séances chargées</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(await screen.findByLabelText(/Nom de la séance/), 'Superset A');
    const search = screen.getByRole('searchbox', { name: 'Rechercher un exercice à ajouter au modèle' });
    for (const definition of definitions) {
      await user.type(search, definition!.name);
      await user.click(screen.getByRole('button', { name: `Ajouter ${definition!.name}` }));
    }
    await user.click(screen.getByText('Organiser en superset ou circuit'));
    const organization = screen.getByText('Organiser en superset ou circuit').closest('details')!;
    await user.click(within(organization).getByRole('checkbox', { name: definitions[0]!.name }));
    await user.click(within(organization).getByRole('checkbox', { name: definitions[1]!.name }));
    await user.click(within(organization).getByRole('button', { name: 'Créer le groupe' }));
    await user.type(screen.getByLabelText('Nom facultatif'), 'Haut du corps');
    await user.clear(screen.getByLabelText('Repos entre exercices (s)'));
    await user.type(screen.getByLabelText('Repos entre exercices (s)'), '15');
    await user.clear(screen.getByLabelText('Repos entre tours (s)'));
    await user.type(screen.getByLabelText('Repos entre tours (s)'), '90');
    await user.click(screen.getByRole('button', { name: 'Créer la séance' }));

    expect(await screen.findByRole('heading', { name: 'Séances chargées' })).toBeInTheDocument();
    const exercises = (await appDatabase.workoutTemplateExercises.toArray())
      .sort((left, right) => left.sortOrder - right.sortOrder);
    expect(exercises).toHaveLength(2);
    expect(exercises[0]?.exerciseGroupId).toBeTruthy();
    expect(exercises[1]?.exerciseGroupId).toBe(exercises[0]?.exerciseGroupId);
    expect(exercises[0]).toMatchObject({
      exerciseGroupType: 'superset',
      exerciseGroupName: 'Haut du corps',
      exerciseGroupRestBetweenExercisesSeconds: 15,
      exerciseGroupRestBetweenRoundsSeconds: 90,
    });
  }, 15_000);

  it('restaure le brouillon et insère l’exercice créé à la position attendue', async () => {
    const definition = (await appDatabase.exerciseDefinitions.toArray())[0]!;
    const draftKey = 'strength-template-draft:test-return';
    window.sessionStorage.setItem(draftKey, JSON.stringify({
      ...defaultWorkoutTemplateFormValues,
      name: 'Brouillon conservé',
    }));

    render(
      <MemoryRouter initialEntries={[{
        pathname: '/strength/templates/new',
        state: {
          strengthExerciseCreationContext: {
            returnTo: 'template',
            query: 'Exercice personnel',
            insertionIndex: 0,
            draftKey,
          },
          strengthExerciseCreated: {
            exerciseId: definition.id,
            context: {
              returnTo: 'template',
              query: 'Exercice personnel',
              insertionIndex: 0,
              draftKey,
            },
          },
        },
      }]}>
        <Routes>
          <Route path="/strength/templates/new" element={<WorkoutTemplateEditorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/Nom de la séance/))
      .toHaveValue('Brouillon conservé');
    const exerciseSelect = screen.getAllByRole('combobox').find(
      (element) => element.id.startsWith('workout-template-exercise-'),
    );
    expect(exerciseSelect).toHaveValue(definition.id);
    expect(window.sessionStorage.getItem(draftKey)).toBeNull();
  });

  it('modifie un modèle existant sans perdre ses exercices', async () => {
    const user = userEvent.setup();
    const definition = (await appDatabase.exerciseDefinitions.toArray())[0]!;
    await appDatabase.workoutTemplates.add(createEntity(
      createWorkoutTemplateInput({ name: 'Push initial' }),
      'template-edit',
    ));
    await appDatabase.workoutTemplateExercises.add(createEntity(
      createWorkoutTemplateExerciseInput({
        templateId: 'template-edit',
        exerciseDefinitionId: definition.id,
      }),
      'template-exercise-edit',
    ));

    render(
      <MemoryRouter initialEntries={['/strength/templates/template-edit/edit']}>
        <Routes>
          <Route path="/strength/templates/:templateId/edit" element={<WorkoutTemplateEditorPage />} />
          <Route path="/strength/templates" element={<h1>Séances chargées</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    const nameInput = await screen.findByLabelText(/Nom de la séance/);
    expect(nameInput).toHaveValue('Push initial');
    await user.clear(nameInput);
    await user.type(nameInput, 'Push modifié');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    expect(await screen.findByRole('heading', { name: 'Séances chargées' })).toBeInTheDocument();
    expect((await appDatabase.workoutTemplates.get('template-edit'))?.name).toBe('Push modifié');
    expect(await appDatabase.workoutTemplateExercises.where('templateId').equals('template-edit').count()).toBe(1);
  });

});
