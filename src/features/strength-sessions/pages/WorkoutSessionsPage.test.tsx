import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkoutSessionsPage } from '@/features/strength-sessions/pages/WorkoutSessionsPage';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { createEntity } from '@/shared/utils/entities';
import {
  createProgressionSuggestionInput,
  createWorkoutSessionInput,
} from '@/test/factories/strengthFactory';

describe('WorkoutSessionsPage', () => {
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

  it('démarre une séance libre et ouvre sa page', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/strength/sessions']}>
        <Routes>
          <Route path="/strength/sessions" element={<WorkoutSessionsPage />} />
          <Route path="/strength/sessions/:sessionId" element={<h1>Séance ouverte</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Séance libre' }));
    expect(await screen.findByRole('heading', { name: 'Séance ouverte' })).toBeInTheDocument();
    await waitFor(async () => {
      expect(await appDatabase.workoutSessions.count()).toBe(1);
      expect(await appDatabase.workoutSessions.where('status').equals('inProgress').count()).toBe(1);
    });
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

});
