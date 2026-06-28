import type { Activity } from '@/domain/models/activity';
import type { EntityId } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';

export const TRASH_RETENTION_DAYS = 30;

interface TrashItemBase<
  TType extends TrashEntityType,
  TPayload,
> {
  id: string;
  entityType: TType;
  entityId: EntityId;
  label: string;
  deletedAt: string;
  purgeAt: string;
  payload: TPayload;
}

export type TrashEntityType = 'activity' | 'weight';

export type TrashItem =
  | TrashItemBase<'activity', Activity>
  | TrashItemBase<'weight', WeightEntry>;
