import type { TrashItem } from '@/domain/models/trash';
import {
  createDeletedDeletionRecord,
  createRestoredDeletionRecord,
  deletionRecordId,
  deletionTargetsForTrashItem,
} from '@/domain/models/deletion';

describe('marqueurs de suppression', () => {
  it('génère un identifiant déterministe et conserve la chronologie', () => {
    const target = {
      entityType: 'activity' as const,
      entityId: 'activity-1',
    };
    const deleted = createDeletedDeletionRecord(
      target,
      '2026-06-29T10:00:00.000Z',
    );
    const restored = createRestoredDeletionRecord(
      target,
      '2026-06-29T10:05:00.000Z',
      deleted.deletedAt,
      deleted,
    );

    expect(deletionRecordId('activity', 'activity-1')).toBe(
      'deletion:activity:activity-1',
    );
    expect(deleted).toMatchObject({
      id: 'deletion:activity:activity-1',
      status: 'deleted',
      deletedAt: '2026-06-29T10:00:00.000Z',
    });
    expect(restored).toMatchObject({
      id: deleted.id,
      status: 'restored',
      deletedAt: deleted.deletedAt,
      restoredAt: '2026-06-29T10:05:00.000Z',
      createdAt: deleted.createdAt,
    });
  });

  it('inclut les enfants supprimés avec leur parent', () => {
    const trashItem = {
      id: 'recipe:recipe-1',
      entityType: 'recipe',
      entityId: 'recipe-1',
      label: 'Recette',
      deletedAt: '2026-06-29T10:00:00.000Z',
      purgeAt: '2026-07-29T10:00:00.000Z',
      payload: {
        recipe: { id: 'recipe-1' },
        ingredients: [
          { id: 'ingredient-1' },
          { id: 'ingredient-2' },
        ],
      },
    } as unknown as TrashItem;

    expect(deletionTargetsForTrashItem(trashItem)).toEqual([
      {
        entityType: 'recipe',
        entityId: 'recipe-1',
      },
      {
        entityType: 'recipeIngredient',
        entityId: 'ingredient-1',
      },
      {
        entityType: 'recipeIngredient',
        entityId: 'ingredient-2',
      },
    ]);
  });
});
