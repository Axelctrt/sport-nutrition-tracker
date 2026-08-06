import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { RunningActivity } from '@/domain/models/activity';
import type { UserProfile } from '@/domain/models/profile';
import type { ActivityJournalNavigationState } from '@/features/activities/navigation/activityJournalNavigation';
import { writeEndurancePlanningState } from '@/domain/planning/endurancePlanningState';
import { createEntity } from '@/shared/utils/entities';
import { createRunningActivityInput } from '@/test/factories/activityFactory';

const mocks = vi.hoisted(() => ({
  createActivityFromDraft: vi.fn(),
  updateActivityFromDraft: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('@/app/providers/profile/useProfile', () => ({
  useProfile: () => ({
    profile: {
      id: 'profile-test',
      initialWeightKg: 60,
    } as UserProfile,
  }),
}));

vi.mock('@/application/activities/activityService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/application/activities/activityService')>();
  return {
    ...actual,
    createActivityFromDraft: mocks.createActivityFromDraft,
    updateActivityFromDraft: mocks.updateActivityFromDraft,
  };
});

import { RunningActivityPage } from '@/features/activities/pages/ActivityEditorPage';
import { repositories } from '@/infrastructure/repositories/repositories';

const savedActivity = createEntity<RunningActivity>(createRunningActivityInput({
  date: '2026-06-25',
}), 'activity-saved');

function renderEditor(
  navigationState?: ActivityJournalNavigationState,
  search = '',
) {
  const router = createMemoryRouter(
    [
      {
        path: '/activities/add/running',
        element: <RunningActivityPage />,
      },
      {
        path: '/activities',
        element: <h1>Journal des activités</h1>,
      },
    ],
    {
      initialEntries: [{
        pathname: '/activities/add/running',
        search,
        state: navigationState,
      }],
    },
  );

  render(<RouterProvider router={router} />);
  return router;
}

afterEach(cleanup);

describe('ActivityEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(repositories.settings, 'get').mockResolvedValue(createDefaultAppSettings());
    vi.spyOn(repositories.weight, 'listBetween').mockResolvedValue([]);
    window.localStorage.clear();
    vi.spyOn(repositories.activities, 'getById').mockResolvedValue(undefined);
    vi.spyOn(repositories.activities, 'listAll').mockResolvedValue([]);
    vi.spyOn(repositories.workoutSessions, 'listAll').mockResolvedValue([]);
    mocks.createActivityFromDraft.mockResolvedValue(savedActivity);
  });

  it('laisse revenir au journal lorsque le formulaire est intact', async () => {
    const user = userEvent.setup();
    renderEditor();

    await screen.findByLabelText(/Date/);
    await user.click(screen.getByRole('link', { name: 'Retour aux activités' }));

    expect(await screen.findByRole('heading', { name: 'Journal des activités' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('protège la navigation et conserve la saisie tant que l’abandon n’est pas confirmé', async () => {
    const user = userEvent.setup();
    renderEditor();

    const dateInput = await screen.findByLabelText(/Date/);
    fireEvent.change(dateInput, { target: { value: '2026-06-25' } });

    const beforeUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);

    await user.click(screen.getByRole('link', { name: 'Retour aux activités' }));
    expect(screen.getByRole('alertdialog', { name: 'Quitter sans enregistrer ?' }))
      .toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuer la modification' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(dateInput).toHaveValue('2026-06-25');

    await user.click(screen.getByRole('link', { name: 'Retour aux activités' }));
    await user.click(screen.getByRole('button', { name: 'Quitter' }));
    expect(await screen.findByRole('heading', { name: 'Journal des activités' }))
      .toBeInTheDocument();
  });

  it('revient au journal d’origine avec restauration et confirmation après ajout', async () => {
    const user = userEvent.setup();
    renderEditor({
      activityJournalReturn: {
        path: '/activities?date=2026-06-25',
        date: '2026-06-25',
        scrollKey: 'journal-location-key',
      },
    });

    const dateInput = await screen.findByLabelText(/Date/);
    fireEvent.change(dateInput, { target: { value: '2026-06-25' } });

    const submit = screen.getByRole('button', { name: 'Ajouter l’activité' });
    await user.click(submit);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/activities?date=2026-06-25', {
        state: {
          activityJournalFeedback: {
            title: 'Activité ajoutée',
            activityId: 'activity-saved',
          },
          scroll: 'restore',
          restoreScrollKey: 'journal-location-key',
        },
      });
    });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('conserve la protection et les valeurs après un échec d’enregistrement', async () => {
    const user = userEvent.setup();
    mocks.createActivityFromDraft.mockRejectedValueOnce(new Error('Stockage local indisponible'));
    renderEditor();

    const dateInput = await screen.findByLabelText(/Date/);
    fireEvent.change(dateInput, { target: { value: '2026-06-25' } });
    await user.click(screen.getByRole('button', { name: 'Ajouter l’activité' }));

    expect(await screen.findByText('Stockage local indisponible')).toBeInTheDocument();
    expect(dateInput).toHaveValue('2026-06-25');

    const beforeUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);
  });

  it('préassocie une activité ouverte depuis une séance d’endurance planifiée même si la liste générale échoue', async () => {
    vi.mocked(repositories.workoutSessions.listAll).mockRejectedValueOnce(
      new Error('liste temporairement indisponible'),
    );
    writeEndurancePlanningState({
      version: 1,
      sessions: [{
        id: 'planned-run',
        title: 'Footing prévu',
        activityType: 'running',
        date: '2026-07-13',
        intensity: 'low',
        targetDurationMinutes: 45,
        status: 'planned',
        createdAt: '2026-07-01T08:00:00.000Z',
        updatedAt: '2026-07-01T08:00:00.000Z',
      }],
    });

    renderEditor(
      undefined,
      '?date=2026-07-13&type=running&plannedSource=endurancePlanning&plannedId=planned-run',
    );

    expect(await screen.findByLabelText('Séance prévue associée')).toHaveValue(
      'endurancePlanning:planned-run',
    );
  });
});
