import type { NewEntity } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';
import type { WeightEntryFormValues } from '@/features/weight/schemas/weightEntrySchema';

export function weightFormValuesToEntity(
  values: WeightEntryFormValues,
): NewEntity<WeightEntry> {
  const note = values.note.trim();

  return {
    date: values.date,
    weightKg: values.weightKg,
    ...(note ? { note } : {}),
  };
}
