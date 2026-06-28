import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteTrashItemsPermanently,
  emptyTrash,
  restoreTrashItems,
} from '@/application/trash/trashBulkService';
import {
  downloadTrashArchive,
  importTrashArchive,
} from '@/application/trash/trashArchiveService';
import type { TrashItem } from '@/domain/models/trash';
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

vi.mock('@/application/trash/trashBulkService', () => ({
  deleteTrashItemsPermanently: vi.fn(),
  emptyTrash: vi.fn(),
  restoreTrashItems: vi.fn(),
}));

vi.mock('@/application/trash/trashArchiveService', () => ({
  MAX_TRASH_ARCHIVE_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  downloadTrashArchive: vi.fn(),
  importTrashArchive: vi.fn(),
}));

const firstItem = {
  id: 'activity:activity-1',
  entityType: 'activity',
  entityId: 'activity-1',
  label: 'Activité running du 2026-06-28',
  deletedAt: '2026-06-28T10:00:00.000Z',
  purgeAt: '2026-07-28T10:00:00.000Z',
  payload: {
    id: 'activity-1',
  },
} as unknown as TrashItem;

const secondItem = {
  ...firstItem,
  id: 'activity:activity-2',
  entityId: 'activity-2',
  label: 'Activité vélo du 2026-06-27',
  payload: {
    id: 'activity-2',
  },
} as unknown as TrashItem;

describe('TrashPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(purgeExpiredTrashItems).mockResolvedValue(0);
    vi.mocked(listTrashItems).mockResolvedValue([
      firstItem,
      secondItem,
    ]);
    vi.mocked(restoreTrashItem).mockResolvedValue(firstItem);
    vi.mocked(
      deleteTrashItemPermanently,
    ).mockResolvedValue(undefined);
    vi.mocked(restoreTrashItems).mockResolvedValue({
      restoredIds: [],
      failures: [],
    });
    vi.mocked(
      deleteTrashItemsPermanently,
    ).mockResolvedValue(2);
    vi.mocked(emptyTrash).mockResolvedValue(2);
    vi.mocked(downloadTrashArchive).mockReturnValue({
      envelope: {
        format: 'sportpilot-trash-archive',
        schemaVersion: 1,
        exportedAt: '2026-06-28T12:00:00.000Z',
        reason: 'manual',
        items: [firstItem, secondItem],
      },
      content: '{}',
      fileName: 'corbeille.json',
      itemCount: 2,
    });
    vi.mocked(importTrashArchive).mockResolvedValue(2);
  });

  it('recherche et sélectionne plusieurs éléments', async () => {
    const user = userEvent.setup();
    render(<TrashPage />);

    expect(
      await screen.findByText(firstItem.label),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole('searchbox', {
        name: 'Rechercher dans la corbeille',
      }),
      'vélo',
    );

    expect(screen.getByText(secondItem.label)).toBeInTheDocument();
    expect(screen.queryByText(firstItem.label)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Sélectionner les résultats',
      }),
    );

    expect(screen.getByText(/1 sélectionné/)).toBeInTheDocument();
  });

  it('restaure toute la sélection', async () => {
    const user = userEvent.setup();
    vi.mocked(restoreTrashItems).mockResolvedValue({
      restoredIds: [firstItem.id, secondItem.id],
      failures: [],
    });

    render(<TrashPage />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Sélectionner les résultats',
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Restaurer la sélection',
      }),
    );

    await waitFor(() => {
      expect(restoreTrashItems).toHaveBeenCalledWith(
        expect.anything(),
        [firstItem.id, secondItem.id],
      );
    });
  });

  it('archive avant une suppression définitive individuelle', async () => {
    const user = userEvent.setup();
    render(<TrashPage />);

    const deleteButtons = await screen.findAllByRole('button', {
      name: 'Supprimer définitivement',
    });

    await user.click(deleteButtons[0]!);
    await user.click(
      screen.getByRole('button', {
        name: 'Archiver et confirmer',
      }),
    );

    await waitFor(() => {
      expect(downloadTrashArchive).toHaveBeenCalledWith(
        [firstItem],
        'before-delete',
      );
      expect(deleteTrashItemPermanently).toHaveBeenCalledWith(
        expect.anything(),
        firstItem.id,
      );
    });
  });

  it('archive puis supprime la sélection après confirmation', async () => {
    const user = userEvent.setup();
    render(<TrashPage />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Sélectionner les résultats',
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Supprimer la sélection',
      }),
    );

    expect(
      screen.getByText('Confirmer la suppression définitive'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Archiver et supprimer',
      }),
    );

    await waitFor(() => {
      expect(downloadTrashArchive).toHaveBeenCalledWith(
        [firstItem, secondItem],
        'before-delete',
      );
      expect(
        deleteTrashItemsPermanently,
      ).toHaveBeenCalledWith(expect.anything(), [
        firstItem.id,
        secondItem.id,
      ]);
    });
  });

  it('archive puis vide toute la corbeille', async () => {
    const user = userEvent.setup();
    render(<TrashPage />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Vider la corbeille',
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Archiver et supprimer',
      }),
    );

    await waitFor(() => {
      expect(downloadTrashArchive).toHaveBeenCalledWith(
        [firstItem, secondItem],
        'before-empty',
      );
      expect(emptyTrash).toHaveBeenCalledWith(
        expect.anything(),
      );
    });
  });

  it('importe une archive dans la corbeille', async () => {
    const user = userEvent.setup();
    render(<TrashPage />);

    const input = await screen.findByLabelText(
      'Importer une archive',
    );
    const file = new File(['{}'], 'corbeille.json', {
      type: 'application/json',
    });

    await user.upload(input, file);

    await waitFor(() => {
      expect(importTrashArchive).toHaveBeenCalledWith(
        expect.anything(),
        '{}',
      );
    });
  });
});
