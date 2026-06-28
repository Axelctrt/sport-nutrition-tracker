import { render, screen, waitFor } from '@testing-library/react';
import type { TrashItem } from '@/domain/models/trash';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TrashPage } from '@/features/trash/pages/TrashPage';
import {
  deleteTrashItemPermanently,
  listTrashItems,
  purgeExpiredTrashItems,
  restoreTrashItem,
} from '@/infrastructure/repositories/dexie/trashService';

vi.mock('@/infrastructure/database/database', () => ({
  appDatabase: {},
}));

vi.mock(
  '@/infrastructure/repositories/dexie/trashService',
  () => ({
    deleteTrashItemPermanently: vi.fn(),
    listTrashItems: vi.fn(),
    purgeExpiredTrashItems: vi.fn(),
    restoreTrashItem: vi.fn(),
  }),
);

const activityTrashItem = {
  id: 'activity:activity-1',
  entityType: 'activity' as const,
  entityId: 'activity-1',
  label: 'Activité running du 2026-06-28',
  deletedAt: '2026-06-28T10:00:00.000Z',
  purgeAt: '2026-07-28T10:00:00.000Z',
  payload: {
    id: 'activity-1',
    type: 'running' as const,
    date: '2026-06-28',
    durationMinutes: 45,
    intensity: 'moderate',
    sessionType: 'easy',
    distanceKm: 8,
    averageCadenceSpm: 170,
    calculation: {
      weightKg: 60,
      estimatedCaloriesKcal: 480,
      calculationVersion: 1,
    },
    createdAt: '2026-06-28T08:00:00.000Z',
    updatedAt: '2026-06-28T08:00:00.000Z',
  },
} satisfies TrashItem;

describe('TrashPage', () => {
  beforeEach(() => {
    vi.mocked(purgeExpiredTrashItems).mockResolvedValue(0);
    vi.mocked(listTrashItems).mockResolvedValue([
      activityTrashItem,
    ]);
    vi.mocked(restoreTrashItem).mockResolvedValue(
      activityTrashItem,
    );
    vi.mocked(deleteTrashItemPermanently).mockResolvedValue(
      undefined,
    );
  });

  it('affiche les éléments restaurables et leur durée de conservation', async () => {
    render(<TrashPage />);

    expect(
      await screen.findByText('Activité running du 2026-06-28'),
    ).toBeInTheDocument();
    expect(screen.getByText(/30 jours/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Restaurer' }),
    ).toBeInTheDocument();
  });

  it('restaure un élément puis recharge la liste', async () => {
    const user = userEvent.setup();
    vi.mocked(listTrashItems)
      .mockResolvedValueOnce([activityTrashItem])
      .mockResolvedValueOnce([]);

    render(<TrashPage />);

    await user.click(
      await screen.findByRole('button', { name: 'Restaurer' }),
    );

    await waitFor(() => {
      expect(restoreTrashItem).toHaveBeenCalledWith(
        expect.anything(),
        activityTrashItem.id,
      );
    });
    expect(
      await screen.findByText('La corbeille est vide'),
    ).toBeInTheDocument();
  });

  it('exige une seconde action avant la suppression définitive', async () => {
    const user = userEvent.setup();
    vi.mocked(listTrashItems)
      .mockResolvedValueOnce([activityTrashItem])
      .mockResolvedValueOnce([]);

    render(<TrashPage />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Supprimer définitivement',
      }),
    );

    expect(deleteTrashItemPermanently).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', {
        name: 'Confirmer la suppression',
      }),
    );

    await waitFor(() => {
      expect(deleteTrashItemPermanently).toHaveBeenCalledWith(
        expect.anything(),
        activityTrashItem.id,
      );
    });
  });
});
