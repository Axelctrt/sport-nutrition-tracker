import {
  cleanup,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { readEndurancePlanningState } from '@/domain/planning/endurancePlanningState';
import { EndurancePlanningPanel } from '@/features/strength-planning/components/EndurancePlanningPanel';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { ToastProvider } from '@/shared/toast/ToastProvider';
import { toLocalDate } from '@/shared/utils/dates';

describe('EndurancePlanningPanel', () => {
  beforeEach(async () => {
    cleanup();
    window.localStorage.clear();
    appDatabase.close();
    await appDatabase.delete();
    await initializeDatabase();
  });

  afterEach(async () => {
    cleanup();
    appDatabase.close();
    await appDatabase.delete();
    window.localStorage.clear();
  });

  it('confirme immédiatement la planification d’une activité', async () => {
    const user = userEvent.setup();
    const today = toLocalDate();

    render(
      <MemoryRouter>
        <ToastProvider>
          <EndurancePlanningPanel weekStart={today} />
        </ToastProvider>
      </MemoryRouter>,
    );

    const form = await screen.findByLabelText(
      'Planifier une activité d’endurance',
    );

    await user.type(
      within(form).getByLabelText('Nom facultatif'),
      'Footing facile',
    );

    await user.click(
      within(form).getByRole('button', {
        name: 'Planifier l’activité',
      }),
    );

    expect(
      await screen.findByText('Activité planifiée'),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Footing facile a été ajoutée au planning/,
      ),
    ).toBeInTheDocument();

    expect(
      readEndurancePlanningState().sessions,
    ).toEqual([
      expect.objectContaining({
        title: 'Footing facile',
        activityType: 'running',
        date: today,
        status: 'planned',
      }),
    ]);
  });
});
