import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkoutTemplateEditorPage } from '@/features/strength-templates/pages/WorkoutTemplateEditorPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';

describe('WorkoutTemplateEditorPage', () => {
  beforeEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
    await initializeDatabase();
  });

  afterEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
  });

  it('crée une séance modèle avec un exercice du catalogue', async () => {
    const user = userEvent.setup();
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
    await user.click(screen.getByRole('button', { name: 'Ajouter un exercice' }));
    await user.click(screen.getByRole('button', { name: 'Créer la séance' }));

    expect(await screen.findByRole('heading', { name: 'Séances chargées' })).toBeInTheDocument();
    await waitFor(async () => {
      expect(await appDatabase.workoutTemplates.count()).toBe(1);
      expect(await appDatabase.workoutTemplateExercises.count()).toBe(1);
    });
  });

  it('crée, configure et enregistre un superset', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/strength/templates/new']}>
        <Routes>
          <Route path="/strength/templates/new" element={<WorkoutTemplateEditorPage />} />
          <Route path="/strength/templates" element={<h1>Séances chargées</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(await screen.findByLabelText(/Nom de la séance/), 'Superset A');
    await user.click(screen.getByRole('button', { name: 'Ajouter un exercice' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter un exercice' }));
    const definitions = await appDatabase.exerciseDefinitions.orderBy('name').toArray();
    const exerciseSelects = screen.getAllByRole('combobox').filter((element) =>
      element.id.startsWith('workout-template-exercise-'),
    );
    expect(exerciseSelects).toHaveLength(2);
    await user.selectOptions(exerciseSelects[0]!, definitions[0]!.id);
    await user.selectOptions(exerciseSelects[1]!, definitions[1]!.id);
    await user.click(screen.getAllByRole('button', { name: 'Créer un superset' })[0]!);
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
  });

});
