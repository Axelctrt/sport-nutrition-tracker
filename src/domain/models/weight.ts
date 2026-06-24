import type { DatedEntity } from '@/domain/models/common';

export interface WeightEntry extends DatedEntity {
  weightKg: number;
  note?: string;
}
