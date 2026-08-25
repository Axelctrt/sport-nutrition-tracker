import type { DatedEntity } from '@/domain/models/common';

export type WeightEntryProvenance =
  | 'userMeasurement'
  | 'profileInitialization';

export interface WeightEntry extends DatedEntity {
  weightKg: number;
  note?: string;
  provenance?: WeightEntryProvenance;
}
