import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { WorkoutTemplatesPage } from '@/features/strength-templates/pages/WorkoutTemplatesPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { repositories } from '@/infrastructure/repositories/repositories';
import { ToastProvider } from '@/shared/toast/ToastProvider';
import { createEntity } from '@/shared/utils/entities';
import {
  createExerciseDefinitionInput,
  createWorkoutSessionInput,
  createWorkoutTemplateExerciseInput,
  createWorkoutTemplateInput,
} from '@/test/factories/strengthFactory';

async function addTemplate(id = 'template-feedback', name = 'Push conservée') {
  await appDatabase.workoutTemplates.add(createEntity(
    createWorkoutTemplateInput({ name }),
    id,
  ));
}

function renderFeedbackPage() {
  render(
    <MemoryRouter initialEntries={['/strength/templates']}>
      <ToastProvider>
        <Routes>
          <Route path="/strength/templates" element={<WorkoutTemplatesPage />} />
          <Route path="/strength/sessions/:sessionId" element={<h1>Séance ouverte</h1>} />
          <Route path="/strength/templates/:templateId/edit" element={<h1>Éditeur ouvert</h1>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('WorkoutTemplatesPage', () => {
  beforeEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
    await initializeDatabase();
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    appDatabase.close();
    await appDatabase.delete();
  });

  it('présente un premier usage orienté vers la création', async () => {
    render(
      <MemoryRouter initialEntries={['/strength/templates']}>
        <WorkoutTemplatesPage />
      </MemoryRouter>,
    );

    const heading = await screen.findByRole('heading', { name: 'Aucune séance modèle' });
    expect(heading.closest('[data-empty-state-variant]')).toHaveAttribute(
      'data-empty-state-variant',
      'first-use',
    );
    expect(screen.getByRole('link', { name: 'Créer une séance' })).toHaveAttribute(
      'href',
      '/strength/templates/new',
    );
  });

  it('efface uniquement la recherche lorsque celle-ci ne renvoie aucun modèle', async () => {
    const user = userEvent.setup();
    await addTemplate('template-filter-reset');

    render(
      <MemoryRouter initialEntries={['/strength/templates']}>
        <WorkoutTemplatesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Push conservée' })).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', {
      name: 'Rechercher une séance modèle',
    }), 'introuvable');
    const emptyHeading = await screen.findByRole('heading', { name: 'Aucune séance trouvée' });
    expect(emptyHeading.closest('[data-empty-state-variant]')).toHaveAttribute(
      'data-empty-state-variant',
      'filtered',
    );

    await user.click(screen.getByRole('button', { name: 'Effacer la recherche' }));

    expect(await screen.findByRole('heading', { name: 'Push conservée' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', {
      name: 'Rechercher une séance modèle',
    })).toHaveValue('');
    expect(await appDatabase.workoutTemplates.count()).toBe(1);
  });

  it('garde une erreur locale unique lorsque la duplication échoue', async () => {
    const user = userEvent.setup();
    await addTemplate();
    vi.spyOn(repositories.workoutTemplates, 'getById').mockRejectedValue(
      new Error('Duplication indisponible'),
    );
    renderFeedbackPage();

    await user.click(await screen.findByRole('button', { name: 'Actions pour Push conservée' }));
    await user.click(screen.getByRole('menuitem', { name: 'Dupliquer' }));

    await waitFor(() => {
      expect(repositories.workoutTemplates.getById).toHaveBeenCalledWith('template-feedback');
      expect(screen.getByText('Duplication indisponible')).toBeInTheDocument();
      expect(screen.getAllByRole('alert')).toHaveLength(1);
    });
  });

  it('garde une erreur locale unique lorsque le démarrage échoue', async () => {
    const user = userEvent.setup();
    await addTemplate();
    vi.spyOn(repositories.workoutSessions, 'getInProgress').mockRejectedValue(
      new Error('Démarrage indisponible'),
    );
    renderFeedbackPage();

    await user.click(await screen.findByRole('button', { name: 'Démarrer la séance' }));

    await waitFor(() => {
      expect(repositories.workoutSessions.getInProgress).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Démarrage indisponible')).toBeInTheDocument();
      expect(screen.getAllByRole('alert')).toHaveLength(1);
    });
    expect(await appDatabase.workoutSessions.count()).toBe(0);
  });

  it('garde une erreur locale unique et le payload lorsque l’archivage échoue', async () => {
    const user = userEvent.setup();
    await addTemplate();
    vi.spyOn(repositories.workoutTemplates, 'update').mockRejectedValue(
      new Error('Archivage indisponible'),
    );
    renderFeedbackPage();

    await user.click(await screen.findByRole('button', { name: 'Actions pour Push conservée' }));
    await user.click(screen.getByRole('menuitem', { name: 'Archiver' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Archiver cette séance modèle ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Archiver' }));

    await waitFor(() => {
      expect(repositories.workoutTemplates.update).toHaveBeenCalledWith('template-feedback', {
        isArchived: true,
      });
      expect(screen.getByText('Archivage indisponible')).toBeInTheDocument();
      expect(screen.getAllByRole('alert')).toHaveLength(1);
    });
  });

  it('conserve le toast et la navigation après le démarrage depuis un modèle', async () => {
    const user = userEvent.setup();
    await addTemplate();
    const template = createEntity(
      createWorkoutTemplateInput({ name: 'Push conservée' }),
      'template-feedback',
    );
    const templateExercise = createEntity(createWorkoutTemplateExerciseInput({
      templateId: 'template-feedback',
      exerciseDefinitionId: 'exercise-feedback',
    }), 'template-exercise-feedback');
    const exercise = createEntity(createExerciseDefinitionInput(), 'exercise-feedback');
    const sessionInput = createWorkoutSessionInput({
      status: 'inProgress',
      sourceTemplateId: 'template-feedback',
      sourceTemplateNameSnapshot: 'Push conservée',
    });
    delete sessionInput.completedAt;
    delete sessionInput.durationMinutes;
    const session = createEntity(sessionInput, 'session-open');
    vi.spyOn(repositories.workoutSessions, 'getInProgress').mockResolvedValue(undefined);
    vi.spyOn(repositories.workoutTemplates, 'getById').mockResolvedValue(template);
    vi.spyOn(repositories.workoutTemplates, 'listExercises').mockResolvedValue([templateExercise]);
    vi.spyOn(repositories.strengthExercises, 'listAll').mockResolvedValue([exercise]);
    vi.spyOn(repositories.workoutSessions, 'createWithExercises').mockResolvedValue({
      session,
      exercises: [],
    });
    vi.spyOn(repositories.workoutSessions, 'getById').mockResolvedValue(session);
    vi.spyOn(repositories.workoutSessions, 'listExercises').mockResolvedValue([]);
    vi.spyOn(repositories.strengthSets, 'listBySession').mockResolvedValue([]);
    renderFeedbackPage();

    await user.click(await screen.findByRole('button', { name: 'Démarrer la séance' }));

    expect(await screen.findByRole('heading', { name: 'Séance ouverte' })).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Séance démarrée');
    expect(repositories.workoutSessions.createWithExercises).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceTemplateId: 'template-feedback',
        sourceTemplateNameSnapshot: 'Push conservée',
        status: 'inProgress',
      }),
      [expect.objectContaining({
        exerciseDefinitionId: 'exercise-feedback',
        sourceTemplateExerciseId: 'template-exercise-feedback',
      })],
    );
  });
});
