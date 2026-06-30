import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  deleteTrashItemsPermanently,
  emptyTrash,
  restoreTrashItems,
} from '@/application/trash/trashBulkService';

function createDatabase() {
  const bulkDelete = vi.fn().mockResolvedValue(undefined);
  const clear = vi.fn().mockResolvedValue(undefined);
  const count = vi.fn().mockResolvedValue(3);

  const database = {
    trashItems: {
      bulkDelete,
      clear,
      count,
    },
    transaction: vi.fn(
      async (
        _mode: string,
        _table: unknown,
        action: () => Promise<unknown>,
      ) => action(),
    ),
  } as unknown as AppDatabase;

  return {
    database,
    bulkDelete,
    clear,
    count,
  };
}

describe('trashBulkService', () => {
  it('restaure chaque élément et conserve les conflits', async () => {
    const database = {} as AppDatabase;
    const restore = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Conflit'));

    const result = await restoreTrashItems(
      database,
      ['item-1', 'item-2'],
      restore,
    );

    expect(result.restoredIds).toEqual(['item-1']);
    expect(result.failures).toEqual([
      {
        id: 'item-2',
        message: 'Conflit',
      },
    ]);
  });

  it('supprime définitivement des identifiants uniques', async () => {
    const { database, bulkDelete } = createDatabase();

    const count = await deleteTrashItemsPermanently(
      database,
      ['item-1', 'item-1', 'item-2'],
    );

    expect(count).toBe(2);
    expect(bulkDelete).toHaveBeenCalledWith([
      'item-1',
      'item-2',
    ]);
  });

  it('vide toute la corbeille et retourne le nombre supprimé', async () => {
    const { database, clear, count } = createDatabase();

    await expect(emptyTrash(database)).resolves.toBe(3);
    expect(count).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
  });
});
