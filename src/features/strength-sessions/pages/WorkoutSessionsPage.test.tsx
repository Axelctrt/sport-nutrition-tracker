import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { WorkoutSessionsPage } from '@/features/strength-sessions/pages/WorkoutSessionsPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { repositories } from '@/infrastructure/repositories/repositories';
import { ToastProvider } from '@/shared/toast/ToastProvider';
import { createEntity } from '@/shared/utils/entities';
import {
  createProgressionSuggestionInput,
  createWorkoutSessionInput,
} from '@/test/factories/strengthFactory';

function LocationStateProbe() {
  const location = useLocation();
  return <output>{location.state ? 'feedback-présent' : 'feedback-consommé'}</output>;
}

describe('WorkoutSessionsPage', () => {
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

  it('démarre une séance libre et ouvre sa page', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/strength/sessions']}>
        <ToastProvider>
          <Routes>
            <Route path="/strength/sessions" element={<WorkoutSessionsPage />} />
            <Route path="/strength/sessions/:sessionId" element={<h1>Séance ouverte</h1>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Séance libre' }));
    expect(await screen.findByRole('heading', { name: 'Séance ouverte' })).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Séance libre démarrée');
    await waitFor(async () => {
      expect(await appDatabase.workoutSessions.count()).toBe(1);
      expect(await appDatabase.workoutSessions.where('status').equals('inProgress').count()).toBe(1);
    });
  });

  it('garde une erreur locale unique lorsque le démarrage libre échoue', async () => {
    const user = userEvent.setup();
    vi.spyOn(repositories.workoutSessions, 'getInProgress').mockRejectedValue(
      new Error('Démarrage indisponible'),
    );
    render(
      <MemoryRouter initialEntries={['/strength/sessions']}>
        <ToastProvider>
          <Routes>
            <Route path="/strength/sessions" element={<WorkoutSessionsPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Séance libre' }));

    await waitFor(() => {
      expect(repositories.workoutSessions.getInProgress).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Démarrage indisponible')).toBeInTheDocument();
      expect(screen.getAllByRole('alert')).toHaveLength(1);
    });
    expect(await appDatabase.workoutSessions.count()).toBe(0);
  });

  it('présente un premier historique vide sans le confondre avec un filtre', async () => {
    render(
      <MemoryRouter initialEntries={['/strength/sessions']}>
        <Routes>
          <Route path="/strength/sessions" element={<WorkoutSessionsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const heading = await screen.findByRole('heading', { name: 'Aucun entraînement enregistré' });
    expect(heading.closest('[data-empty-state-variant]')).toHaveAttribute(
      'data-empty-state-variant',
      'first-use',
    );
    expect(screen.getByRole('button', { name: 'Démarrer une séance libre' })).toBeInTheDocument();
  });

  it('propose de reprendre une séance en cours après rechargement', async () => {
    await appDatabase.workoutSessions.add(createEntity({
      date: '2026-06-25',
      status: 'inProgress',
      startedAt: '2026-06-25T17:00:00.000Z',
    }, 'session-current'));

    render(
      <MemoryRouter initialEntries={['/strength/sessions']}>
        <Routes>
          <Route path="/strength/sessions" element={<WorkoutSessionsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: 'Reprendre la séance' })).toHaveAttribute(
      'href',
      '/strength/sessions/session-current',
    );
  });

  it('signale les suggestions de progression encore à décider', async () => {
    await appDatabase.workoutSessions.add(createEntity(
      createWorkoutSessionInput({ status: 'completed' }),
      'session-completed',
    ));
    await appDatabase.progressionSuggestions.add(createEntity(
      createProgressionSuggestionInput({
        sessionId: 'session-completed',
        status: 'pending',
      }),
      'suggestion-pending',
    ));

    render(
      <MemoryRouter initialEntries={['/strength/sessions']}>
        <Routes>
          <Route path="/strength/sessions" element={<WorkoutSessionsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('1 progression à décider')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir les suggestions' })).toHaveAttribute(
      'href',
      '/strength/sessions/session-completed',
    );
  });

  it('réinitialise uniquement le filtre lorsque l’historique filtré est vide', async () => {
    const user = userEvent.setup();
    await appDatabase.workoutSessions.add(createEntity(
      createWorkoutSessionInput({
        status: 'completed',
        sourceTemplateNameSnapshot: 'Push conservée',
      }),
      'session-filter-reset',
    ));

    render(
      <MemoryRouter initialEntries={['/strength/sessions']}>
        <Routes>
          <Route path="/strength/sessions" element={<WorkoutSessionsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Push conservée' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abandonnées' }));
    const heading = await screen.findByRole('heading', { name: 'Aucune séance dans ce filtre' });
    expect(heading.closest('[data-empty-state-variant]')).toHaveAttribute(
      'data-empty-state-variant',
      'filtered',
    );

    await user.click(screen.getByRole('button', { name: 'Afficher toutes les séances' }));

    expect(await screen.findByRole('heading', { name: 'Push conservée' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toutes' })).toHaveAttribute('aria-pressed', 'true');
    expect(await appDatabase.workoutSessions.count()).toBe(1);
  });

  it('consomme le feedback transmis après la persistance d’une séance terminée', async () => {
    await appDatabase.workoutSessions.add(createEntity(
      createWorkoutSessionInput({ status: 'completed' }),
      'session-completed',
    ));

    render(
      <MemoryRouter initialEntries={[{
        pathname: '/strength/sessions',
        state: {
          workoutSessionFeedback: {
            title: 'Séance enregistrée',
            description: 'Ta séance a bien été ajoutée à l’historique.',
            sessionId: 'session-completed',
          },
        },
      }]}>
        <ToastProvider>
          <Routes>
            <Route
              path="/strength/sessions"
              element={(
                <>
                  <WorkoutSessionsPage />
                  <LocationStateProbe />
                </>
              )}
            />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('feedback-consommé')).toBeInTheDocument();
    expect(screen.getByText('Séance enregistrée').closest('[role="status"]')).not.toBeNull();
  });
});
