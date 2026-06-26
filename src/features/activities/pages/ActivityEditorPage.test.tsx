import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { RunningActivity } from '@/domain/models/activity';
import type { UserProfile } from '@/domain/models/profile';
import type { ActivityJournalNavigationState } from '@/features/activities/navigation/activityJournalNavigation';
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

function renderEditor(navigationState?: ActivityJournalNavigationState) {
  render(
    <MemoryRouter
      initialEntries={[{
        pathname: '/activities/add/running',
        state: navigationState,
      }]}
    >
      <RunningActivityPage />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('ActivityEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(repositories.settings, 'get').mockResolvedValue(createDefaultAppSettings());
    vi.spyOn(repositories.weight, 'getLatestOnOrBefore').mockResolvedValue(undefined);
    vi.spyOn(repositories.activities, 'getById').mockResolvedValue(undefined);
    mocks.createActivityFromDraft.mockResolvedValue(savedActivity);
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
  });
});
