import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  MemoryRouter,
  useLocation,
} from 'react-router-dom';

import {
  BACKUP_REMINDER_SNOOZE_STORAGE_KEY,
  BackupReminderCoordinator,
  type BackupReminderStorage,
} from '@/app/backup/BackupReminderCoordinator';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { ToastProvider } from '@/shared/toast/ToastProvider';

function createMemoryStorage(
  initial?: Record<string, string>,
): BackupReminderStorage & {
  values: Map<string, string>;
} {
  const values = new Map(Object.entries(initial ?? {}));

  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
}

function dueSettings() {
  return {
    ...createDefaultAppSettings(),
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    backupReminderIntervalDays: 7 as const,
    lastBackupExportedAt: '2026-06-01T00:00:00.000Z',
  };
}

describe('BackupReminderCoordinator', () => {
  it('affiche le rappel global puis ouvre la page de sauvegarde', async () => {
    const storage = createMemoryStorage();
    const loadSettings = vi.fn().mockResolvedValue(dueSettings());

    render(
      <MemoryRouter initialEntries={['/']}>
        <ToastProvider>
          <BackupReminderCoordinator
            loadSettings={loadSettings}
            now={() => new Date('2026-06-10T00:00:00.000Z')}
            storage={storage}
          />
          <LocationProbe />
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Sauvegarde recommandée'),
    ).toBeInTheDocument();

    expect(
      storage.values.has(BACKUP_REMINDER_SNOOZE_STORAGE_KEY),
    ).toBe(true);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Ouvrir la page de sauvegarde',
      }),
    );

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/backup',
    );
  });

  it('ne répète pas le rappel pendant les 24 heures de report', async () => {
    const storage = createMemoryStorage({
      [BACKUP_REMINDER_SNOOZE_STORAGE_KEY]: JSON.stringify({
        referenceDate: '2026-06-01T00:00:00.000Z',
        snoozedUntil: '2026-06-11T00:00:00.000Z',
      }),
    });
    const loadSettings = vi.fn().mockResolvedValue(dueSettings());

    render(
      <MemoryRouter initialEntries={['/']}>
        <ToastProvider>
          <BackupReminderCoordinator
            loadSettings={loadSettings}
            now={() => new Date('2026-06-10T00:00:00.000Z')}
            storage={storage}
          />
        </ToastProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(loadSettings).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.queryByText('Sauvegarde recommandée'),
    ).not.toBeInTheDocument();
  });

  it('laisse la page de sauvegarde gérer son propre rappel', () => {
    const loadSettings = vi.fn().mockResolvedValue(dueSettings());

    render(
      <MemoryRouter initialEntries={['/backup']}>
        <ToastProvider>
          <BackupReminderCoordinator
            loadSettings={loadSettings}
            now={() => new Date('2026-06-10T00:00:00.000Z')}
            storage={createMemoryStorage()}
          />
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(loadSettings).not.toHaveBeenCalled();
    expect(
      screen.queryByText('Sauvegarde recommandée'),
    ).not.toBeInTheDocument();
  });
});
