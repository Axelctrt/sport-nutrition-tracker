import type {
  EntityId,
  EntityMetadata,
  IsoDateTime,
} from '@/domain/models/common';
import type { TrashItem } from '@/domain/models/trash';

export const DELETION_ENTITY_TYPES = [
  'activity',
  'weight',
  'foodEntry',
  'meal',
  'favoriteMeal',
  'recipe',
  'recipeIngredient',
  'strengthSet',
  'workoutSessionExercise',
] as const;

export type DeletionEntityType =
  (typeof DELETION_ENTITY_TYPES)[number];

export type DeletionRecordStatus = 'deleted' | 'restored';

export interface DeletionTarget {
  entityType: DeletionEntityType;
  entityId: EntityId;
}

export interface DeletionRecord extends EntityMetadata {
  entityType: DeletionEntityType;
  entityId: EntityId;
  status: DeletionRecordStatus;
  deletedAt: IsoDateTime;
  restoredAt?: IsoDateTime;
}

export function deletionRecordId(
  entityType: DeletionEntityType,
  entityId: EntityId,
): string {
  return `deletion:${entityType}:${entityId}`;
}

function uniqueTargets(
  targets: readonly DeletionTarget[],
): DeletionTarget[] {
  const byId = new Map<string, DeletionTarget>();

  for (const target of targets) {
    byId.set(
      deletionRecordId(target.entityType, target.entityId),
      target,
    );
  }

  return [...byId.values()];
}

export function deletionTargetsForTrashItem(
  trashItem: TrashItem,
): DeletionTarget[] {
  const targets: DeletionTarget[] = [
    {
      entityType: trashItem.entityType,
      entityId: trashItem.entityId,
    },
  ];

  switch (trashItem.entityType) {
    case 'meal':
      targets.push(
        ...trashItem.payload.entries.map((entry) => ({
          entityType: 'foodEntry' as const,
          entityId: entry.id,
        })),
      );
      break;
    case 'recipe':
      targets.push(
        ...trashItem.payload.ingredients.map((ingredient) => ({
          entityType: 'recipeIngredient' as const,
          entityId: ingredient.id,
        })),
      );
      break;
    case 'workoutSessionExercise':
      targets.push(
        ...trashItem.payload.sets.map((set) => ({
          entityType: 'strengthSet' as const,
          entityId: set.id,
        })),
      );
      break;
  }

  return uniqueTargets(targets);
}

export function createDeletedDeletionRecord(
  target: DeletionTarget,
  deletedAt: IsoDateTime,
  existing?: DeletionRecord,
): DeletionRecord {
  return {
    id: deletionRecordId(target.entityType, target.entityId),
    entityType: target.entityType,
    entityId: target.entityId,
    status: 'deleted',
    deletedAt,
    createdAt: existing?.createdAt ?? deletedAt,
    updatedAt: deletedAt,
  };
}

export function createRestoredDeletionRecord(
  target: DeletionTarget,
  restoredAt: IsoDateTime,
  fallbackDeletedAt: IsoDateTime,
  existing?: DeletionRecord,
): DeletionRecord {
  return {
    id: deletionRecordId(target.entityType, target.entityId),
    entityType: target.entityType,
    entityId: target.entityId,
    status: 'restored',
    deletedAt: existing?.deletedAt ?? fallbackDeletedAt,
    restoredAt,
    createdAt: existing?.createdAt ?? fallbackDeletedAt,
    updatedAt: restoredAt,
  };
}
