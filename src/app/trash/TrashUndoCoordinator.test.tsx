import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useEffect } from 'react';
import { vi } from 'vitest';

const { restoreTrashItemMock } = vi.hoisted(() => ({
  restoreTrashItemMock: vi.fn(),
}));

vi.mock('@/infrastructure/database/database', () => ({
  appDatabase: { name: 'mock-database' },
}));

vi.mock(
  '@/infrastructure/repositories/dexie/trashService',
  () => ({
    restoreTrashItem: restoreTrashItemMock,
  }),
);

import { TrashUndoCoordinator } from '@/app/trash/TrashUndoCoordinator';
import { ToastProvider } from '@/shared/toast/ToastProvider';
import { publishTrashUndoAvailable } from '@/shared/trash/trashUndoEvents';

function MountProbe({
  onMount,
}: {
  onMount: () => void;
}) {
  useEffect(() => {
    onMount();
  }, [onMount]);

  return <p>Journal actif</p>;
}

describe('TrashUndoCoordinator', () => {
  beforeEach(() => {
    restoreTrashItemMock.mockReset();
  });

  it('restaure depuis le toast puis remonte l’écran courant', async () => {
    const onMount = vi.fn();
    restoreTrashItemMock.mockResolvedValue({
      id: 'activity:activity-1',
    });

    render(
      <ToastProvider>
        <TrashUndoCoordinator>
          <MountProbe onMount={onMount} />
        </TrashUndoCoordinator>
      </ToastProvider>,
    );

    act(() => {
      publishTrashUndoAvailable({
        trashItemId: 'activity:activity-1',
        label: 'Activité course du 2026-06-28',
      });
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Annuler la suppression : Activité course du 2026-06-28',
      }),
    );

    await waitFor(() => {
      expect(restoreTrashItemMock).toHaveBeenCalledWith(
        expect.anything(),
        'activity:activity-1',
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText('Suppression annulée'),
      ).toBeInTheDocument();
      expect(onMount).toHaveBeenCalledTimes(2);
    });
  });

  it('affiche le conflit sans remonter l’écran', async () => {
    const onMount = vi.fn();
    restoreTrashItemMock.mockRejectedValue(
      new Error('Une donnée incompatible existe déjà.'),
    );

    render(
      <ToastProvider>
        <TrashUndoCoordinator>
          <MountProbe onMount={onMount} />
        </TrashUndoCoordinator>
      </ToastProvider>,
    );

    act(() => {
      publishTrashUndoAvailable({
        trashItemId: 'weight:weight-1',
        label: 'Pesée du 2026-06-28',
      });
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Annuler la suppression : Pesée du 2026-06-28',
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByText('Impossible d’annuler la suppression'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Une donnée incompatible existe déjà.'),
      ).toBeInTheDocument();
    });

    expect(onMount).toHaveBeenCalledTimes(1);
  });
});
