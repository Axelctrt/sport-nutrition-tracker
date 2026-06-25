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
});
