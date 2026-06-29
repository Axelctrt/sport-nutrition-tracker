import type { TrashItem } from '@/domain/models/trash';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  createTrashArchiveFileName,
  downloadTrashArchive,
  importTrashArchive,
  parseTrashArchiveText,
  prepareTrashArchive,
  TrashArchiveError,
} from '@/application/trash/trashArchiveService';

const activityTrashItem = {
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

describe('trashArchiveService', () => {
  it('prépare une archive versionnée avec un nom explicite', () => {
    const prepared = prepareTrashArchive(
      [activityTrashItem],
      'before-empty',
      new Date('2026-06-28T14:30:00.000Z'),
    );

    expect(prepared.itemCount).toBe(1);
    expect(prepared.envelope.schemaVersion).toBe(1);
    expect(prepared.fileName).toBe(
      'sportpilot-corbeille-avant-vidage-2026-06-28T14-30-00-000Z.json',
    );
  });

  it('déclenche le téléchargement local', () => {
    const download = vi.fn();

    downloadTrashArchive(
      [activityTrashItem],
      'manual',
      new Date('2026-06-28T14:30:00.000Z'),
      download,
    );

    expect(download).toHaveBeenCalledWith(
      expect.stringContaining('sportpilot-trash-archive'),
      createTrashArchiveFileName(
        '2026-06-28T14:30:00.000Z',
        'manual',
      ),
      'application/json',
    );
  });

  it('refuse un fichier qui n’est pas une archive compatible', () => {
    expect(() =>
      parseTrashArchiveText('{"format":"autre"}'),
    ).toThrow(TrashArchiveError);
  });

  it('réimporte les éléments, renouvelle leur conservation et recrée leur marqueur', async () => {
    const bulkPut = vi.fn().mockResolvedValue(undefined);
    const deletionBulkPut = vi.fn().mockResolvedValue(undefined);
    const database = {
      trashItems: {
        bulkPut,
      },
      deletionRecords: {
        bulkGet: vi.fn().mockResolvedValue([undefined]),
        bulkPut: deletionBulkPut,
      },
      transaction: vi.fn(
        async (
          _mode: string,
          _tables: unknown,
          action: () => Promise<void>,
        ) => action(),
      ),
    } as unknown as AppDatabase;

    const prepared = prepareTrashArchive(
      [activityTrashItem],
      'manual',
      new Date('2026-06-28T14:30:00.000Z'),
    );

    const count = await importTrashArchive(
      database,
      prepared.content,
      new Date('2026-07-01T00:00:00.000Z'),
    );

    expect(count).toBe(1);
    expect(bulkPut).toHaveBeenCalledWith([
      expect.objectContaining({
        id: activityTrashItem.id,
        purgeAt: '2026-07-31T00:00:00.000Z',
      }),
    ]);
    expect(deletionBulkPut).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'deletion:activity:activity-1',
        status: 'deleted',
        deletedAt: activityTrashItem.deletedAt,
      }),
    ]);
  });

  it('refuse de préparer une archive vide', () => {
    expect(() =>
      prepareTrashArchive([], 'manual'),
    ).toThrow(TrashArchiveError);
  });
});
